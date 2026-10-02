from typing import List, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.database.models import Dataset, DatasetMetadata
from app.database.duckdb_manager import duckdb_manager
from app.services.dataset_service import dataset_service
from app.services.chart_service import chart_service
import pandas as pd

router = APIRouter(prefix="/datasets", tags=["datasets"])

@router.post("/upload")
async def upload_dataset(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload and process CSV/XLSX/JSON/Parquet/ZIP dataset packages into DuckDB and RAG"""
    result = await dataset_service.upload_file(db=db, file=file)
    return result

@router.get("/overview/all")
def get_all_datasets_overview(db: Session = Depends(get_db)):
    """Provides a combined analytical overview across all active datasets."""
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    if not datasets:
        return {
            "total_datasets": 0,
            "total_rows": 0,
            "total_columns": 0,
            "total_size_bytes": 0,
            "file_size_formatted": "0 B",
            "datasets": []
        }

    dataset_summaries = []
    total_rows = 0
    total_cols = 0
    total_size = 0

    for d in datasets:
        total_rows += (d.row_count or 0)
        total_cols += (d.column_count or 0)
        total_size += (d.file_size_bytes or 0)
        meta = db.query(DatasetMetadata).filter(DatasetMetadata.dataset_id == d.id).first()
        dataset_summaries.append({
            "id": d.id,
            "name": d.name,
            "original_filename": d.original_filename,
            "file_type": d.file_type,
            "row_count": d.row_count,
            "column_count": d.column_count,
            "duckdb_table_name": d.duckdb_table_name,
            "summary_stats": meta.summary_stats if meta else {},
            "created_at": d.created_at.isoformat()
        })

    return {
        "total_datasets": len(datasets),
        "total_rows": total_rows,
        "total_columns": total_cols,
        "total_size_bytes": total_size,
        "file_size_formatted": dataset_service.format_bytes(total_size),
        "datasets": dataset_summaries
    }


@router.post("/demo")
def load_demo_dataset(db: Session = Depends(get_db)):
    """Load or initialize the pre-seeded HAL Helicopter Intelligence dataset"""
    dataset = dataset_service.ensure_demo_dataset(db=db)
    return {
        "id": dataset.id,
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "file_type": dataset.file_type,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "is_demo": True,
        "created_at": dataset.created_at.isoformat()
    }

@router.get("")
def list_datasets(db: Session = Depends(get_db)):
    """List all available datasets"""
    datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "original_filename": d.original_filename,
            "file_type": d.file_type,
            "row_count": d.row_count,
            "column_count": d.column_count,
            "file_size_bytes": d.file_size_bytes,
            "is_demo": d.is_demo,
            "created_at": d.created_at.isoformat()
        }
        for d in datasets
    ]

@router.get("/{dataset_id}")
def get_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Get single dataset details"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {
        "id": dataset.id,
        "name": dataset.name,
        "original_filename": dataset.original_filename,
        "file_type": dataset.file_type,
        "row_count": dataset.row_count,
        "column_count": dataset.column_count,
        "file_size_bytes": dataset.file_size_bytes,
        "duckdb_table_name": dataset.duckdb_table_name,
        "is_demo": dataset.is_demo,
        "created_at": dataset.created_at.isoformat()
    }

@router.get("/{dataset_id}/schema")
def get_dataset_schema(dataset_id: str, db: Session = Depends(get_db)):
    """Get column schema for table from DuckDB"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    schema = duckdb_manager.get_table_schema(dataset.duckdb_table_name)
    return {"dataset_id": dataset.id, "schema": schema}

@router.get("/{dataset_id}/statistics")
def get_dataset_statistics(dataset_id: str, db: Session = Depends(get_db)):
    """Get column-level intelligence and overview statistics"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    meta = db.query(DatasetMetadata).filter(DatasetMetadata.dataset_id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Metadata not found for dataset")
    
    return {
        "dataset_id": dataset.id,
        "dataset_name": dataset.name,
        "summary": meta.summary_stats,
        "columns": meta.columns_info
    }

@router.get("/{dataset_id}/charts")
def get_dataset_charts(dataset_id: str, db: Session = Depends(get_db)):
    """Generate dynamic visualization chart configurations from DuckDB data"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Query data into pandas to feed chart service
    _, rows = duckdb_manager.execute_read_only(f'SELECT * FROM "{dataset.duckdb_table_name}" LIMIT 5000')
    df = pd.DataFrame(rows)
    charts = chart_service.generate_dashboard_charts(df)
    return {"dataset_id": dataset.id, "charts": charts}

@router.get("/{dataset_id}/preview")
def preview_dataset_data(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    sort_by: Optional[str] = None,
    sort_dir: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    """Paginated, searchable, sortable data table for the dataset"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    offset = (page - 1) * page_size
    tbl = dataset.duckdb_table_name
    
    where_clause = ""
    if search and search.strip():
        # Search across all text fields
        schema = duckdb_manager.get_table_schema(tbl)
        str_cols = [c["name"] for c in schema]
        conditions = [f'CAST("{c}" AS VARCHAR) ILIKE \'%{search.strip()}%\'' for c in str_cols]
        where_clause = f" WHERE {' OR '.join(conditions)}"

    order_clause = ""
    if sort_by and sort_by.strip():
        direction = "DESC" if sort_dir.lower() == "desc" else "ASC"
        order_clause = f' ORDER BY "{sort_by.strip()}" {direction}'

    # Count query
    count_sql = f'SELECT COUNT(*) FROM "{tbl}"{where_clause}'
    _, count_res = duckdb_manager.execute_read_only(count_sql)
    total_records = count_res[0]["count_star()"] if count_res else 0

    # Data query
    data_sql = f'SELECT * FROM "{tbl}"{where_clause}{order_clause} LIMIT {page_size} OFFSET {offset}'
    columns, rows = duckdb_manager.execute_read_only(data_sql)

    return {
        "columns": columns,
        "rows": rows,
        "total_records": total_records,
        "page": page,
        "page_size": page_size,
        "total_pages": (total_records + page_size - 1) // page_size if page_size else 1
    }

@router.delete("/{dataset_id}")
def delete_dataset(dataset_id: str, db: Session = Depends(get_db)):
    """Delete dataset record and its DuckDB table"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Drop table from DuckDB
    try:
        from duckdb import connect
        from app.database.duckdb_manager import DUCKDB_PATH
        with connect(str(DUCKDB_PATH)) as conn:
            conn.execute(f'DROP TABLE IF EXISTS "{dataset.duckdb_table_name}"')
    except Exception:
        pass

    # Purge any cached RAG indexes/vectors for this dataset
    try:
        from app.services.rag_service import rag_service
        rag_service.clear_dataset_cache(dataset.name)
    except Exception:
        pass

    db.delete(dataset)
    db.commit()
    return {"status": "success", "message": f"Dataset {dataset_id} deleted."}

@router.get("/{dataset_id}/suggested-prompts")
def get_suggested_prompts(
    dataset_id: str,
    language: Optional[str] = Query("en"),
    db: Session = Depends(get_db)
):
    """
    Dynamically generates 4-6 executable question suggestions grounded entirely in the active dataset schema.
    Supports English ('en'), Hindi ('hi'), and Kannada ('kn').
    Never uses hardcoded dataset-specific questions.
    """
    lang = (language or "en").lower()
    
    if dataset_id in ["none", "null", "undefined", "empty"]:
        if lang == "hi":
            return {"prompts": ["प्रश्न पूछने के लिए डेटासेट अपलोड करें।", "एयरोस्पेस विश्लेषण देखने के लिए डेमो डेटासेट लोड करें।", "विज़न निरीक्षण के लिए विमान की छवि अपलोड करें।"]}
        elif lang == "kn":
            return {"prompts": ["ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಲು ಡೇಟಾಸೆಟ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.", "ಏರೋಸ್ಪೇಸ್ ವಿಶ್ಲೇಷಣೆಗಾಗಿ ಡೆಮೊ ಡೇಟಾಸೆಟ್ ಲೋಡ್ ಮಾಡಿ.", "ವಿಷನ್ ತಪಾಸಣೆಗಾಗಿ ವಿಮಾನದ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."]}
        return {"prompts": ["Upload a dataset to start asking questions.", "Load the demo dataset to explore aerospace analytics.", "Upload an aircraft image for vision airframe inspection."]}

    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        dataset = db.query(Dataset).first()
        
    if not dataset:
        if lang == "hi":
            return {"prompts": ["प्रश्न पूछने के लिए डेटासेट अपलोड करें।"]}
        elif lang == "kn":
            return {"prompts": ["ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಲು ಡೇಟಾಸೆಟ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ."]}
        return {"prompts": ["Upload a dataset to start asking questions."]}

    tbl = dataset.duckdb_table_name
    schema = duckdb_manager.get_table_schema(tbl)
    sample_rows = duckdb_manager.fetch_sample_rows(tbl, limit=4)
    
    from app.services.prompt_service import prompt_service
    prompts = prompt_service.generate_dynamic_prompts(
        table_name=tbl,
        columns=schema,
        sample_rows=sample_rows,
        language=lang
    )
    return {
        "dataset_id": dataset.id,
        "dataset_name": dataset.name,
        "language": lang,
        "prompts": prompts
    }
