import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.database.models import Dataset, DatasetMetadata
from app.database.duckdb_manager import duckdb_manager
from app.services.chart_service import chart_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/{dataset_id}")
def get_full_dashboard(dataset_id: str, db: Session = Depends(get_db)):
    """Consolidated endpoint delivering overview cards, column intelligence, and charts"""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    meta = db.query(DatasetMetadata).filter(DatasetMetadata.dataset_id == dataset_id).first()
    if not meta:
        raise HTTPException(status_code=404, detail="Metadata not found")

    # Generate charts
    _, rows = duckdb_manager.execute_read_only(f'SELECT * FROM "{dataset.duckdb_table_name}" LIMIT 5000')
    df = pd.DataFrame(rows)
    charts = chart_service.generate_dashboard_charts(df)

    return {
        "dataset": {
            "id": dataset.id,
            "name": dataset.name,
            "original_filename": dataset.original_filename,
            "file_type": dataset.file_type,
            "row_count": dataset.row_count,
            "column_count": dataset.column_count,
            "file_size_bytes": dataset.file_size_bytes,
            "is_demo": dataset.is_demo,
            "created_at": dataset.created_at.isoformat()
        },
        "summary": meta.summary_stats,
        "columns": meta.columns_info,
        "charts": charts
    }
