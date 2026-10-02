import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.database.models import Conversation, Message

router = APIRouter(prefix="/conversations", tags=["conversations"])

class CreateConvRequest(BaseModel):
    title: Optional[str] = "New Helicopter Analysis"
    dataset_id: Optional[str] = None

@router.get("")
def list_conversations(db: Session = Depends(get_db)):
    """List conversation sessions grouped by timeframe (Today, Yesterday, Earlier)"""
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    yesterday_start = today_start - timedelta(days=1)

    grouped = {
        "today": [],
        "yesterday": [],
        "earlier": []
    }

    for c in convs:
        # Ignore ghost sessions with no messages
        if not c.messages or len(c.messages) == 0:
            continue

        # Collect datasets used in this session
        ds_used = []
        if getattr(c, "active_datasets", None) and isinstance(c.active_datasets, list):
            ds_used.extend(c.active_datasets)
        for m in c.messages:
            if getattr(m, "chosen_datasets", None) and isinstance(m.chosen_datasets, list):
                for ds in m.chosen_datasets:
                    if isinstance(ds, dict) and ds.get("name") and ds["name"] not in ds_used:
                        ds_used.append(ds["name"])
        if not ds_used and c.dataset:
            ds_used.append(c.dataset.name)

        c_dict = {
            "id": c.id,
            "session_id": c.id,
            "title": c.title,
            "dataset_id": c.dataset_id,
            "mode": getattr(c, "mode", "nlp") or "nlp",
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat() if c.updated_at else c.created_at.isoformat(),
            "message_count": len(c.messages),
            "datasets_used": ds_used
        }
        ref_time = c.updated_at or c.created_at
        if ref_time >= today_start:
            grouped["today"].append(c_dict)
        elif ref_time >= yesterday_start:
            grouped["yesterday"].append(c_dict)
        else:
            grouped["earlier"].append(c_dict)

    return grouped

@router.post("")
def create_conversation(req: CreateConvRequest, db: Session = Depends(get_db)):
    conv = Conversation(
        id=str(uuid.uuid4()),
        title=req.title or "New Helicopter Analysis",
        dataset_id=req.dataset_id
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return {
        "id": conv.id,
        "session_id": conv.id,
        "title": conv.title,
        "created_at": conv.created_at.isoformat(),
        "datasets_used": []
    }

@router.get("/{conv_id}")
def get_conversation_messages(conv_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    ds_used = []
    if getattr(conv, "active_datasets", None) and isinstance(conv.active_datasets, list):
        ds_used.extend(conv.active_datasets)
    for m in conv.messages:
        if getattr(m, "chosen_datasets", None) and isinstance(m.chosen_datasets, list):
            for ds in m.chosen_datasets:
                if isinstance(ds, dict) and ds.get("name") and ds["name"] not in ds_used:
                    ds_used.append(ds["name"])
    if not ds_used and conv.dataset:
        ds_used.append(conv.dataset.name)

    messages = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sql_query": m.sql_query,
            "query_result": m.query_result,
            "mode": m.mode,
            "language": m.language,
            "rag_metadata": getattr(m, "rag_metadata", None),
            "chosen_datasets": getattr(m, "chosen_datasets", None),
            "created_at": m.created_at.isoformat()
        }
        for m in conv.messages
    ]
    return {
        "id": conv.id,
        "session_id": conv.id,
        "title": conv.title,
        "dataset_id": conv.dataset_id,
        "mode": getattr(conv, "mode", "nlp") or "nlp",
        "datasets_used": ds_used,
        "created_at": conv.created_at.isoformat(),
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else conv.created_at.isoformat(),
        "messages": messages
    }

@router.delete("/{conv_id}")
def delete_conversation(conv_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"status": "success", "message": "Conversation deleted"}
