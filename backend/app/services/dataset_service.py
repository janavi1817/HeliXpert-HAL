import os
import uuid
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException

from app.core.config import settings, UPLOAD_DIR, SAMPLE_DIR
from app.database.duckdb_manager import duckdb_manager
from app.database.models import Dataset, DatasetMetadata
from app.services.statistics_service import statistics_service
from app.utils.sample_data import generate_sample_dataset, SAMPLE_CSV_PATH

SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json", ".parquet"}

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

        # Sanitize column names for DuckDB (replace special chars, strip whitespace)
        df.columns = [str(col).strip().replace(" ", "_").replace("-", "_").lower() for col in df.columns]

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
    async def upload_file(cls, db: Session, file: UploadFile) -> Dataset:
        filename = file.filename or "uploaded_dataset.csv"
        ext = Path(filename).suffix.lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file format '{ext}'. Supported: CSV, XLSX, JSON, Parquet."
            )

        file_type = ext.lstrip(".")
        if file_type == "xls":
            file_type = "xlsx"

        dest_filename = f"{uuid.uuid4()}_{filename}"
        dest_path = UPLOAD_DIR / dest_filename

        # Stream save and enforce max size
        total_size = 0
        max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        with open(dest_path, "wb") as f:
            while chunk := await file.read(1024 * 1024):
                total_size += len(chunk)
                if total_size > max_bytes:
                    dest_path.unlink(missing_ok=True)
                    raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.")
                f.write(chunk)

        return cls.process_and_store_dataset(
            db=db,
            file_path=dest_path,
            original_filename=filename,
            file_type=file_type,
            is_demo=False
        )

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
