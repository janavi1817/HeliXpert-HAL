import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session

from app.core.config import IMAGE_DIR
from app.database.postgres import get_db
from app.database.models import UploadedImage, Dataset
from app.database.duckdb_manager import duckdb_manager
from app.agents.vision_agent import vision_agent

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED_IMG_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

@router.post("/upload")
async def upload_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload helicopter image (JPG, PNG, WEBP)"""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMG_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image extension '{ext}'. Supported: JPG, JPEG, PNG, WEBP."
        )

    image_id = str(uuid.uuid4())
    save_filename = f"{image_id}{ext}"
    file_path = IMAGE_DIR / save_filename

    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)

    uploaded_img = UploadedImage(
        id=image_id,
        filename=save_filename,
        original_name=file.filename or "helicopter.jpg",
        file_path=str(file_path),
        mime_type=file.content_type or f"image/{ext.lstrip('.')}",
        file_size_bytes=len(content)
    )
    db.add(uploaded_img)
    db.commit()
    db.refresh(uploaded_img)

    return {
        "id": uploaded_img.id,
        "filename": uploaded_img.filename,
        "original_name": uploaded_img.original_name,
        "mime_type": uploaded_img.mime_type,
        "url": f"/api/images/{uploaded_img.id}/file"
    }

@router.post("/analyze")
def analyze_image(
    image_id: str = Form(...),
    dataset_id: Optional[str] = Form(None),
    question: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Analyze helicopter image and optionally correlate with current dataset"""
    img_record = db.query(UploadedImage).filter(UploadedImage.id == image_id).first()
    if not img_record:
        raise HTTPException(status_code=404, detail="Image record not found.")

    image_path = Path(img_record.file_path)
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image file missing from storage.")

    # 1. Vision Analysis
    vision_result = vision_agent.analyze_image(
        image_path=image_path,
        user_prompt=question
    )

    # 2. Check if dataset cross-referencing requested or available
    cross_ref_data = None
    if dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
        if dataset:
            _, sample_records = duckdb_manager.execute_read_only(f'SELECT * FROM "{dataset.duckdb_table_name}" LIMIT 200')
            cross_ref_data = vision_agent.cross_reference_with_dataset(vision_result, sample_records)

    analysis_payload = {
        "image_id": image_id,
        "vision_analysis": vision_result,
        "dataset_correlation": cross_ref_data
    }

    # Save cached result
    img_record.analysis_result = analysis_payload
    db.commit()

    return analysis_payload

@router.get("/{image_id}/file")
def get_image_file(image_id: str, db: Session = Depends(get_db)):
    """Serve uploaded image file"""
    from fastapi.responses import FileResponse
    img = db.query(UploadedImage).filter(UploadedImage.id == image_id).first()
    if not img or not Path(img.file_path).exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(img.file_path, media_type=img.mime_type)
