import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.database.models import Dataset, Conversation, Message, UploadedImage
from app.database.duckdb_manager import duckdb_manager
from app.agents.sql_agent import sql_agent
from app.agents.answer_agent import answer_agent
from app.agents.vision_agent import vision_agent

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    dataset_id: Optional[str] = None
    image_id: Optional[str] = None
    conversation_id: Optional[str] = None
    mode: Optional[str] = "nlp" # "nlp" or "rag" (Data Query)
    language: Optional[str] = "en" # "en", "hi", "kn"

@router.post("")
def process_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Precision Multi-Modal QA & Text-to-SQL Pipeline:
    1. If image_id is provided: Analyzes uploaded image with Gemini Vision
    2. If dataset question:
       a. Dynamically inspects table schema from DuckDB
       b. SQL Agent generates read-only DuckDB SQL using Gemini
       c. If requested information is unavailable in schema, clearly informs user
       d. SQL Validator verifies read-only safety
       e. DuckDB executes query against actual data
       f. Answer Agent synthesizes grounded response in requested language
    3. Saves message history
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # ── BRANCH 1: Image-Based Question ───────────────────────────────────────
    if req.image_id:
        img_record = db.query(UploadedImage).filter(UploadedImage.id == req.image_id).first()
        if img_record and Path(img_record.file_path).exists():
            vision_result = vision_agent.analyze_image(
                image_path=Path(img_record.file_path),
                user_prompt=question
            )
            answer_text = vision_result.get("detailed_analysis", "Image analysis complete.")

            conv_id = req.conversation_id or str(uuid.uuid4())
            conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
            if not conversation:
                conversation = Conversation(id=conv_id, title=question[:35])
                db.add(conversation)
                db.flush()

            user_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                role="user",
                content=question,
                mode=req.mode or "nlp",
                language=req.language or "en"
            )
            db.add(user_msg)

            assistant_msg = Message(
                id=str(uuid.uuid4()),
                conversation_id=conv_id,
                role="assistant",
                content=answer_text,
                mode=req.mode or "nlp",
                language=req.language or "en"
            )
            db.add(assistant_msg)
            db.commit()

            return {
                "mode": req.mode,
                "question": question,
                "answer": answer_text,
                "language": req.language or "en",
                "conversation_id": conv_id,
                "vision_result": vision_result
            }

    # ── BRANCH 2: Dataset Question ───────────────────────────────────────────
    dataset = None
    if req.dataset_id:
        dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    
    if not dataset:
        dataset = db.query(Dataset).first()

    if not dataset:
        return {
            "mode": req.mode,
            "question": question,
            "sql": None,
            "result": None,
            "answer": "Please upload a dataset or load the demo dataset to begin analysis.",
            "language": req.language or "en"
        }

    # Retrieve live schema and sample rows from DuckDB
    table_name = dataset.duckdb_table_name
    if not duckdb_manager.table_exists(table_name) and dataset.file_path and Path(dataset.file_path).exists():
        from app.services.dataset_service import dataset_service
        try:
            import re
            df = dataset_service.load_df_from_file(Path(dataset.file_path), dataset.file_type)
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
            duckdb_manager.create_table_from_df(table_name, df)
        except Exception:
            pass

    schema = duckdb_manager.get_table_schema(table_name)
    sample_rows = duckdb_manager.fetch_sample_rows(table_name, limit=3)

    # 1. SQL Generation Step (Dynamic Schema Inspection)
    sql_response = sql_agent.generate_sql(
        question=question,
        table_name=table_name,
        columns=schema,
        sample_rows=sample_rows
    )

    # 2. Check if requested data is unavailable in the schema
    if sql_response["status"] == "data_not_available":
        reason = sql_response.get("reason", "The requested columns or fields are not present in this dataset.")
        
        if req.language == "hi":
            answer_text = f"इस डेटासेट में इस प्रश्न का उत्तर देने के लिए आवश्यक जानकारी उपलब्ध नहीं है ({reason})।"
        elif req.language == "kn":
            answer_text = f"ಈ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಈ ಪ್ರಶ್ನೆಗೆ ಉತ್ತರಿಸಲು ಅಗತ್ಯವಾದ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ ({reason})."
        else:
            answer_text = f"This dataset does not contain the information required to answer that question. Reason: {reason}"

        return {
            "mode": req.mode,
            "question": question,
            "sql": None,
            "result": None,
            "answer": answer_text,
            "language": req.language or "en"
        }

    if sql_response["status"] == "invalid_query":
        return {
            "mode": req.mode,
            "question": question,
            "sql": sql_response.get("sql"),
            "result": None,
            "answer": f"The query could not be executed: {sql_response.get('error', 'Validation error')}",
            "language": req.language or "en"
        }

    generated_sql = sql_response["sql"]

    # 3. Execute Query against DuckDB
    try:
        columns, result_rows = duckdb_manager.execute_read_only(generated_sql, max_rows=100)
    except Exception as e:
        return {
            "mode": req.mode,
            "question": question,
            "sql": generated_sql if req.mode == "rag" else None,
            "result": None,
            "answer": f"Database execution error: {str(e)}",
            "language": req.language or "en"
        }

    # 4. Answer Generation Step (grounded strictly in actual DuckDB result)
    answer_text = answer_agent.generate_response(
        question=question,
        sql=generated_sql,
        result_rows=result_rows,
        mode=req.mode or "nlp",
        language=req.language or "en"
    )

    # 5. Save Conversation & Message History
    conv_id = req.conversation_id
    conversation = None
    if conv_id:
        conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
    
    if not conversation:
        conv_id = str(uuid.uuid4())
        short_title = question[:35] + ("..." if len(question) > 35 else "")
        conversation = Conversation(
            id=conv_id,
            dataset_id=dataset.id,
            title=short_title
        )
        db.add(conversation)
        db.flush()

    user_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="user",
        content=question,
        mode=req.mode or "nlp",
        language=req.language or "en"
    )
    db.add(user_msg)

    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="assistant",
        content=answer_text,
        sql_query=generated_sql,
        query_result=result_rows if req.mode == "rag" else None,
        mode=req.mode or "nlp",
        language=req.language or "en"
    )
    db.add(assistant_msg)
    db.commit()

    response_payload = {
        "mode": req.mode,
        "question": question,
        "answer": answer_text,
        "language": req.language or "en",
        "conversation_id": conv_id,
        "dataset_name": dataset.name
    }

    # In Data Query mode, show the EXACT SQL that was actually executed
    if req.mode == "rag":
        response_payload["sql"] = generated_sql
        response_payload["result"] = result_rows[:15] if result_rows else []

    return response_payload
