import os
import re
import uuid
import shutil
import zipfile
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from app.core.config import settings, UPLOAD_DIR, SAMPLE_DIR, IMAGE_DIR
from app.database.duckdb_manager import duckdb_manager
from app.database.models import Dataset, DatasetMetadata, UploadedImage, UploadedDocument
from app.services.statistics_service import statistics_service
from app.utils.sample_data import generate_sample_dataset, SAMPLE_CSV_PATH

STRUCTURED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json", ".parquet"}
DOCUMENT_EXTENSIONS = {".pdf", ".docx", ".txt", ".md"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALL_SUPPORTED_EXTENSIONS = STRUCTURED_EXTENSIONS | DOCUMENT_EXTENSIONS | IMAGE_EXTENSIONS | {".zip"}

class DatasetService:
    @staticmethod
    def load_df_from_file(file_path: Path, file_type: str) -> pd.DataFrame:
        if file_type == "csv":
            return pd.read_csv(file_path)
        elif file_type in ["xlsx", "xls"]:
            return pd.read_excel(file_path)
        elif file_type == "json":
            return pd.read_json(file_path)
        elif file_type == "parquet":
            return pd.read_parquet(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")

    @staticmethod
    def extract_text_from_document(file_path: Path, file_type: str) -> str:
        """Extracts text content from PDF, DOCX, TXT, MD documents."""
        ft = file_type.lower().lstrip(".")
        if ft == "pdf":
            try:
                import pypdf
                reader = pypdf.PdfReader(str(file_path))
                pages = []
                for p_idx, page in enumerate(reader.pages):
                    t = page.extract_text()
                    if t and t.strip():
                        pages.append(f"[Page {p_idx+1}]\n{t.strip()}")
                return "\n\n".join(pages)
            except Exception as e:
                raise ValueError(f"PDF extraction error: {str(e)}")

        elif ft == "docx":
            try:
                import docx
                doc = docx.Document(str(file_path))
                paras = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                # Also include table text
                for t in doc.tables:
                    for r in t.rows:
                        row_vals = [c.text.strip() for c in r.cells if c.text.strip()]
                        if row_vals:
                            paras.append(" | ".join(row_vals))
                return "\n\n".join(paras)
            except Exception as e:
                raise ValueError(f"DOCX extraction error: {str(e)}")

        elif ft in ["txt", "md"]:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return f.read()
            except UnicodeDecodeError:
                with open(file_path, "r", encoding="latin-1", errors="ignore") as f:
                    return f.read()
        else:
            raise ValueError(f"Unsupported document format: {file_type}")


    @classmethod
    def process_and_store_dataset(
        cls,
        db: Session,
        file_path: Path,
        original_filename: str,
        file_type: str,
        is_demo: bool = False,
        dataset_name: Optional[str] = None
    ) -> Dataset:
        # Load into pandas for validation and stats
        try:
            df = cls.load_df_from_file(file_path, file_type)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse dataset: {str(e)}")

        if df.empty or len(df.columns) == 0:
            raise HTTPException(status_code=400, detail="The dataset is empty or has no columns.")

        # Sanitize column names for DuckDB (replace special chars, strip whitespace, avoid duplicate/empty names)
        import re
        sanitized_cols = []
        seen_cols = {}
        for i, col in enumerate(df.columns):
            clean = re.sub(r'[^a-zA-Z0-9_]+', '_', str(col).strip()).strip('_').lower()
            if not clean:
                clean = f"col_{i+1}"
            if clean in seen_cols:
                seen_cols[clean] += 1
                clean = f"{clean}_{seen_cols[clean]}"
            else:
                seen_cols[clean] = 0
            sanitized_cols.append(clean)
        df.columns = sanitized_cols

        dataset_id = str(uuid.uuid4())
        table_name = f"t_{dataset_id.replace('-', '_')}"
        
        # Ingest into DuckDB
        duckdb_manager.create_table_from_df(table_name, df)
        
        # Calculate statistics
        summary_stats = statistics_service.calculate_column_statistics(df)
        
        file_size_bytes = os.path.getsize(file_path)
        display_name = dataset_name or original_filename.rsplit(".", 1)[0].replace("_", " ").title()

        dataset = Dataset(
            id=dataset_id,
            name=display_name,
            original_filename=original_filename,
            file_type=file_type,
            file_path=str(file_path),
            row_count=len(df),
            column_count=len(df.columns),
            file_size_bytes=file_size_bytes,
            duckdb_table_name=table_name,
            is_demo=is_demo
        )
        db.add(dataset)
        db.flush()

        metadata_record = DatasetMetadata(
            id=str(uuid.uuid4()),
            dataset_id=dataset_id,
            columns_info=summary_stats["columns"],
            summary_stats={
                "total_rows": summary_stats["total_rows"],
                "total_columns": summary_stats["total_columns"],
                "numeric_columns": summary_stats["numeric_columns"],
                "categorical_columns": summary_stats["categorical_columns"],
                "total_missing_values": summary_stats["total_missing_values"],
                "file_size_formatted": cls.format_bytes(file_size_bytes)
            }
        )
        db.add(metadata_record)
        db.commit()
        db.refresh(dataset)
        return dataset

    @classmethod
    def load_persisted_documents_into_rag(cls, db: Session):
        """Reloads stored documents into RAG vector space on demand."""
        try:
            from app.services.rag_service import rag_service
            docs = db.query(UploadedDocument).all()
            for doc in docs:
                p = Path(doc.file_path)
                if p.exists():
                    text = cls.extract_text_from_document(p, doc.file_type)
                    rag_service.index_document_text(doc.id, doc.original_name, text, doc.file_type)
        except Exception:
            pass

    @classmethod
    def process_zip_package(cls, db: Session, zip_path: Path, original_filename: str) -> Dict[str, Any]:
        """
        Extracts, scans recursively, and processes all files in a ZIP archive.
        - Structured datasets (CSV, XLSX, JSON, Parquet) -> Separate datasets & DuckDB tables
        - Documents (PDF, DOCX, TXT, MD) -> RAG Vector Pipeline
        - Images (JPG, PNG, WEBP) -> Vision Analysis system
        - Bulletproof ZIP bomb & Path Traversal protection
        - Fault-tolerant: continues processing remaining files on individual failures
        """
        temp_dir = UPLOAD_DIR / f"zip_extract_{uuid.uuid4().hex}"
        temp_dir.mkdir(parents=True, exist_ok=True)

        try:
            # 1. Security Check: Validate ZIP & Bomb limits
            with zipfile.ZipFile(zip_path, "r") as zf:
                infolist = zf.infolist()
                if len(infolist) > 100:
                    raise HTTPException(status_code=400, detail="ZIP archive contains too many files (maximum 100).")

                total_uncompressed = 0
                for info in infolist:
                    total_uncompressed += info.file_size
                    # Check compression ratio for zip bomb
                    if info.compress_size > 0 and (info.file_size / info.compress_size) > 100:
                        raise HTTPException(status_code=400, detail="ZIP bomb detected: Uncompressed ratio exceeds security threshold.")

                if total_uncompressed > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
                    raise HTTPException(status_code=400, detail=f"Extracted ZIP size exceeds security limit ({settings.MAX_UPLOAD_SIZE_MB}MB).")

                # 2. Extract with strict Path Traversal protection
                for info in infolist:
                    if info.is_dir():
                        continue
                    # Skip OS and hidden files
                    bname = os.path.basename(info.filename)
                    if bname.startswith(".") or "__MACOSX" in info.filename or bname.lower() == "thumbs.db":
                        continue

                    # Strict path traversal check
                    if ".." in info.filename or info.filename.startswith(("/", "\\")) or ":" in info.filename:
                        raise HTTPException(status_code=400, detail="Path traversal attempt detected in ZIP filename.")

                    target = (temp_dir / info.filename).resolve()
                    if not str(target).startswith(str(temp_dir.resolve())):
                        raise HTTPException(status_code=400, detail="Security violation: extracted path escapes extraction directory.")

                    target.parent.mkdir(parents=True, exist_ok=True)
                    with zf.open(info) as src, open(target, "wb") as dst:
                        shutil.copyfileobj(src, dst)

            # 3. Recursively scan and process all extracted files
            processed: List[Dict[str, Any]] = []
            failed: List[Dict[str, Any]] = []
            unsupported: List[Dict[str, Any]] = []
            primary_dataset: Optional[Dataset] = None

            for root, _, files in os.walk(temp_dir):
                for fname in sorted(files):
                    fpath = Path(root) / fname
                    ext = fpath.suffix.lower()

                    # A. Structured Datasets -> DuckDB Table & Dataset record
                    if ext in STRUCTURED_EXTENSIONS:
                        try:
                            ftype = ext.lstrip(".")
                            if ftype == "xls":
                                ftype = "xlsx"
                            perm_name = f"{uuid.uuid4().hex}_{fname}"
                            perm_path = UPLOAD_DIR / perm_name
                            shutil.copy2(fpath, perm_path)

                            # Derive a clean display name
                            clean_ds_name = fname.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()

                            ds = cls.process_and_store_dataset(
                                db=db,
                                file_path=perm_path,
                                original_filename=fname,
                                file_type=ftype,
                                is_demo=False,
                                dataset_name=clean_ds_name
                            )
                            if primary_dataset is None:
                                primary_dataset = ds

                            processed.append({
                                "filename": fname,
                                "type": "dataset",
                                "id": ds.id,
                                "name": ds.name,
                                "row_count": ds.row_count,
                                "column_count": ds.column_count,
                                "table_name": ds.duckdb_table_name,
                                "file_type": ds.file_type
                            })
                        except Exception as e:
                            failed.append({"filename": fname, "reason": str(e)})

                    # B. Document Files -> Extract Text & Index into RAG Pipeline
                    elif ext in DOCUMENT_EXTENSIONS:
                        try:
                            ftype = ext.lstrip(".")
                            perm_name = f"{uuid.uuid4().hex}_{fname}"
                            perm_path = UPLOAD_DIR / perm_name
                            shutil.copy2(fpath, perm_path)

                            text = cls.extract_text_from_document(perm_path, ftype)
                            doc_id = str(uuid.uuid4())
                            
                            from app.services.rag_service import rag_service
                            chunks_indexed = rag_service.index_document_text(
                                doc_id=doc_id,
                                doc_name=fname,
                                text=text,
                                file_type=ftype
                            )

                            doc_record = UploadedDocument(
                                id=doc_id,
                                filename=perm_name,
                                original_name=fname,
                                file_path=str(perm_path),
                                file_type=ftype,
                                file_size_bytes=perm_path.stat().st_size,
                                chunk_count=chunks_indexed
                            )
                            db.add(doc_record)
                            db.commit()

                            processed.append({
                                "filename": fname,
                                "type": "document",
                                "id": doc_id,
                                "name": fname,
                                "chunks_indexed": chunks_indexed,
                                "file_type": ftype
                            })
                        except Exception as e:
                            failed.append({"filename": fname, "reason": str(e)})

                    # C. Images -> Vision Analysis Store & Model
                    elif ext in IMAGE_EXTENSIONS:
                        try:
                            img_id = str(uuid.uuid4())
                            save_name = f"{img_id}{ext}"
                            save_path = IMAGE_DIR / save_name
                            shutil.copy2(fpath, save_path)

                            img_record = UploadedImage(
                                id=img_id,
                                filename=save_name,
                                original_name=fname,
                                file_path=str(save_path),
                                mime_type=f"image/{ext.lstrip('.')}",
                                file_size_bytes=save_path.stat().st_size
                            )
                            db.add(img_record)
                            db.commit()

                            processed.append({
                                "filename": fname,
                                "type": "image",
                                "id": img_id,
                                "name": fname,
                                "file_type": ext.lstrip(".")
                            })
                        except Exception as e:
                            failed.append({"filename": fname, "reason": str(e)})

                    else:
                        unsupported.append({"filename": fname, "reason": f"Unsupported format '{ext}'"})

            total_extracted = len(processed) + len(failed) + len(unsupported)

            result: Dict[str, Any] = {
                "is_zip": True,
                "package_name": original_filename,
                "total_files": total_extracted,
                "processed": processed,
                "failed": failed,
                "unsupported": unsupported,
                "primary_dataset": {
                    "id": primary_dataset.id,
                    "name": primary_dataset.name,
                    "original_filename": primary_dataset.original_filename,
                    "file_type": primary_dataset.file_type,
                    "row_count": primary_dataset.row_count,
                    "column_count": primary_dataset.column_count,
                } if primary_dataset else None,
                # Compatibility fields for legacy consumers
                "id": primary_dataset.id if primary_dataset else f"zip_{uuid.uuid4().hex[:8]}",
                "name": primary_dataset.name if primary_dataset else original_filename.rsplit(".", 1)[0].title(),
                "original_filename": original_filename,
                "file_type": "zip",
                "row_count": primary_dataset.row_count if primary_dataset else 0,
                "column_count": primary_dataset.column_count if primary_dataset else 0,
                "created_at": datetime.utcnow().isoformat()
            }
            return result

        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)

    @classmethod
    async def upload_file(cls, db: Session, file: UploadFile) -> Dict[str, Any]:
        filename = file.filename or "uploaded_file.csv"
        ext = Path(filename).suffix.lower()
        if ext not in ALL_SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported: CSV, XLSX, JSON, Parquet, PDF, TXT, DOCX, MD, JPG, PNG, WEBP, ZIP."
            )

        dest_filename = f"{uuid.uuid4().hex}_{filename}"
        dest_path = UPLOAD_DIR / dest_filename

        # Stream save and enforce max upload size
        total_size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        with open(dest_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > max_bytes:
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.")
                f.write(chunk)

        # Handle ZIP packages
        if ext == ".zip":
            return cls.process_zip_package(db=db, zip_path=dest_path, original_filename=filename)

        # Handle Document uploads
        if ext in DOCUMENT_EXTENSIONS:
            ftype = ext.lstrip(".")
            text = cls.extract_text_from_document(dest_path, ftype)
            doc_id = str(uuid.uuid4())
            from app.services.rag_service import rag_service
            chunks_indexed = rag_service.index_document_text(
                doc_id=doc_id,
                doc_name=filename,
                text=text,
                file_type=ftype
            )
            doc_record = UploadedDocument(
                id=doc_id,
                filename=dest_filename,
                original_name=filename,
                file_path=str(dest_path),
                file_type=ftype,
                file_size_bytes=total_size,
                chunk_count=chunks_indexed
            )
            db.add(doc_record)
            db.commit()
            return {
                "is_zip": False,
                "id": doc_id,
                "name": filename,
                "original_filename": filename,
                "file_type": ftype,
                "row_count": chunks_indexed,
                "column_count": 0,
                "created_at": datetime.utcnow().isoformat(),
                "processed": [{
                    "filename": filename,
                    "type": "document",
                    "id": doc_id,
                    "name": filename,
                    "chunks_indexed": chunks_indexed,
                    "file_type": ftype
                }],
                "failed": [],
                "unsupported": []
            }

        # Handle Structured Datasets
        file_type = ext.lstrip(".")
        if file_type == "xls":
            file_type = "xlsx"

        dataset = cls.process_and_store_dataset(
            db=db,
            file_path=dest_path,
            original_filename=filename,
            file_type=file_type,
            is_demo=False
        )
        return {
            "is_zip": False,
            "id": dataset.id,
            "name": dataset.name,
            "original_filename": dataset.original_filename,
            "file_type": dataset.file_type,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "created_at": dataset.created_at.isoformat(),
            "processed": [{
                "filename": filename,
                "type": "dataset",
                "id": dataset.id,
                "name": dataset.name,
                "row_count": dataset.row_count,
                "column_count": dataset.column_count,
                "table_name": dataset.duckdb_table_name,
                "file_type": dataset.file_type
            }],
            "failed": [],
            "unsupported": []
        }


    @classmethod
    def ensure_demo_dataset(cls, db: Session) -> Dataset:
        """Loads or creates the demo HAL helicopter dataset"""
        demo = db.query(Dataset).filter(Dataset.is_demo == True).first()
        if demo:
            # Check if table still exists in DuckDB
            try:
                duckdb_manager.get_row_count(demo.duckdb_table_name)
                return demo
            except Exception:
                pass # Recreate

        # Generate sample CSV if needed
        csv_path = SAMPLE_CSV_PATH
        if not csv_path.exists():
            generate_sample_dataset(120, csv_path)

        demo_dataset = cls.process_and_store_dataset(
            db=db,
            file_path=csv_path,
            original_filename="hal_helicopters_fleet.csv",
            file_type="csv",
            is_demo=True,
            dataset_name="HAL Helicopter Intelligence Fleet"
        )
        return demo_dataset

    @staticmethod
    def format_bytes(num_bytes: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if num_bytes < 1024:
                return f"{num_bytes:.1f} {unit}"
            num_bytes /= 1024
        return f"{num_bytes:.1f} TB"

dataset_service = DatasetService()
