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
    """List conversations grouped by timeframe (Today, Yesterday, Earlier)"""
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
        c_dict = {
            "id": c.id,
            "title": c.title,
            "dataset_id": c.dataset_id,
            "created_at": c.created_at.isoformat(),
            "updated_at": c.updated_at.isoformat(),
            "message_count": len(c.messages)
        }
        if c.created_at >= today_start:
            grouped["today"].append(c_dict)
        elif c.created_at >= yesterday_start:
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
    return {"id": conv.id, "title": conv.title, "created_at": conv.created_at.isoformat()}

@router.get("/{conv_id}")
def get_conversation_messages(conv_id: str, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "sql_query": m.sql_query,
            "query_result": m.query_result,
            "mode": m.mode,
            "language": m.language,
            "created_at": m.created_at.isoformat()
        }
        for m in conv.messages
    ]
    return {
        "id": conv.id,
        "title": conv.title,
        "dataset_id": conv.dataset_id,
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
