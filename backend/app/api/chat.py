import uuid
import re
import json
from pathlib import Path
from typing import Optional, Dict, Any, List, Tuple
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.postgres import get_db
from app.database.models import Dataset, Conversation, Message, UploadedImage
from app.database.duckdb_manager import duckdb_manager
from app.agents.sql_agent import sql_agent
from app.agents.answer_agent import answer_agent
from app.agents.vision_agent import vision_agent
from app.agents.dataset_router import dataset_router
from app.agents.query_router import query_router
from app.services.dataset_service import dataset_service
from app.services.rag_service import rag_service
from app.core.gemini_client import gemini_client

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatRequest(BaseModel):
    question: str
    dataset_id: Optional[str] = None
    dataset_ids: Optional[List[str]] = None
    image_id: Optional[str] = None
    conversation_id: Optional[str] = None
    mode: Optional[str] = "nlp" # "nlp" or "rag" (Data Query)
    language: Optional[str] = "en" # "en", "hi", "kn"

@router.post("")
def process_chat(req: ChatRequest, db: Session = Depends(get_db)):
    """
    Advanced Multi-Dataset Intelligence Agent & Precision QA Pipeline:
    1. Independent Gemini Vision Image Analysis (never requires image in dataset).
    2. Combined Image + Dataset Analysis (vision findings matched with dataset specs).
    3. Dynamic Dataset Router (schema-based routing, context resolution, multi-dataset queries).
    4. Isolated RAG indexing and retrieval per dataset.
    5. DuckDB as the single source of truth for both NLP and Data Query modes.
    """
    question = req.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # ── 0. CONVERSATION CONTEXT RETRIEVAL ─────────────────────────────────────
    conv_id = req.conversation_id or str(uuid.uuid4())
    conversation = db.query(Conversation).filter(Conversation.id == conv_id).first()
    recent_history: List[Dict[str, str]] = []
    if conversation:
        past_msgs = db.query(Message).filter(Message.conversation_id == conv_id).order_by(Message.created_at.desc()).limit(4).all()
        recent_history = [{"role": m.role, "content": m.content} for m in reversed(past_msgs)]

    # ── 1. ACTIVE DATASETS INSPECTION ─────────────────────────────────────────
    active_datasets: List[Dataset] = []
    if req.dataset_ids and len(req.dataset_ids) > 0:
        active_datasets = db.query(Dataset).filter(Dataset.id.in_(req.dataset_ids)).all()
    elif req.dataset_id and req.dataset_id != "all":
        single_d = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
        if single_d:
            active_datasets = [single_d]

    if not active_datasets:
        active_datasets = db.query(Dataset).order_by(Dataset.created_at.desc()).all()

    # Ensure tables exist in DuckDB and collect schemas
    tables_info: List[Dict[str, Any]] = []
    for d in active_datasets:
        tbl = d.duckdb_table_name
        if not duckdb_manager.table_exists(tbl) and d.file_path and Path(d.file_path).exists():
            try:
                df = dataset_service.load_df_from_file(Path(d.file_path), d.file_type)
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
                duckdb_manager.create_table_from_df(tbl, df)
            except Exception:
                pass

        schema = duckdb_manager.get_table_schema(tbl)
        sample = duckdb_manager.fetch_sample_rows(tbl, limit=3)
        tables_info.append({
            "id": d.id,
            "name": d.name,
            "dataset_id": d.id,
            "dataset_name": d.name,
            "table_name": tbl,
            "schema": schema,
            "sample_rows": sample,
            "row_count": d.row_count,
            "file_path": d.file_path,
            "file_type": d.file_type
        })

    # ── 2. IMAGE ANALYSIS & COMBINED IMAGE + DATASET ─────────────────────────
    if req.image_id:
        img_record = db.query(UploadedImage).filter(UploadedImage.id == req.image_id).first()
        if img_record and Path(img_record.file_path).exists():
            vision_result = vision_agent.analyze_image(
                image_path=Path(img_record.file_path),
                user_prompt=question
            )

            # Check if user specifically requested dataset cross-referencing
            q_lower = question.lower()
            asks_dataset = any(k in q_lower for k in ["dataset", "specification", "specs", "database", "fleet", "compare", "check with"])

            if asks_dataset and tables_info:
                # Requirement 10: Combined Image + Dataset Query
                # Route to specification dataset
                routed = dataset_router.route(question, tables_info, has_image=True, conversation_history=recent_history)
                target_d = routed["target_datasets"][0] if routed.get("target_datasets") else tables_info[0]

                # Identify helicopter model from vision analysis
                identified_model = vision_result.get("identified_model", "")
                spec_query = f"SELECT * FROM \"{target_d['table_name']}\""
                if identified_model and identified_model != "N/A":
                    spec_query += f" WHERE UPPER(model) LIKE '%{identified_model.upper().split()[0]}%'"
                spec_query += " LIMIT 5"

                try:
                    cols, spec_rows = duckdb_manager.execute_read_only(spec_query)
                except Exception:
                    spec_rows = []

                # Format clearly distinguished response
                if req.language == "hi":
                    answer_text = (
                        f"### 🔍 छवि विश्लेषण (Visual Inspection)\n"
                        f"{vision_result.get('detailed_analysis', 'छवि विश्लेषण संपन्न।')}\n\n"
                        f"### 📊 डेटासेट विनिर्देश ({target_d['name']})\n"
                        f"डेटासेट के अनुसार, मॉडल '{identified_model}' के विनिर्देश उपलब्ध हैं।"
                    )
                elif req.language == "kn":
                    answer_text = (
                        f"### 🔍 ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ (Visual Inspection)\n"
                        f"{vision_result.get('detailed_analysis', 'ಚಿತ್ರ ವಿಶ್ಲೇಷಣೆ ಪೂರ್ಣಗೊಂಡಿದೆ.')}\n\n"
                        f"### 📊 ಡೇಟಾಸೆಟ್ ಮಾಹಿತಿ ({target_d['name']})\n"
                        f"ಡೇಟಾಸೆಟ್ ಪ್ರಕಾರ ಮಾದರಿ '{identified_model}' ನ ವಿವರಣೆಗಳು ಲಭ್ಯವಿದೆ."
                    )
                else:
                    specs_summary = ""
                    if spec_rows:
                        specs_summary = f"\n\n**Verified Specifications from `{target_d['name']}`:**\n" + "\n".join([f"- **{k}**: {v}" for k, v in spec_rows[0].items() if v is not None][:6])

                    answer_text = (
                        f"### 🔍 Visual Inspection & Image Analysis\n"
                        f"{vision_result.get('detailed_analysis', 'Visual inspection completed.')}\n\n"
                        f"### 📊 Dataset Information ({target_d['name']})\n"
                        f"Cross-referencing with active dataset `{target_d['name']}` for identified rotorcraft **{identified_model}**:{specs_summary}"
                    )

                _save_conversation(db, conv_id, question, answer_text, req.mode, req.language, sql=spec_query if req.mode == "rag" else None, result=spec_rows if req.mode == "rag" else None)
                return {
                    "mode": req.mode or "nlp",
                    "question": question,
                    "answer": answer_text,
                    "language": req.language or "en",
                    "conversation_id": conv_id,
                    "dataset_name": target_d["name"],
                    "sql": spec_query if req.mode == "rag" else None,
                    "result": spec_rows if req.mode == "rag" else None,
                    "vision_result": vision_result
                }
            else:
                # Requirement 9: Pure Image Analysis (Independent capability)
                answer_text = vision_result.get("detailed_analysis", "Image analysis complete.")
                _save_conversation(db, conv_id, question, answer_text, req.mode, req.language)
                return {
                    "mode": req.mode or "nlp",
                    "question": question,
                    "answer": answer_text,
                    "language": req.language or "en",
                    "conversation_id": conv_id,
                    "vision_result": vision_result
                }

    if not tables_info:
        return {
            "mode": req.mode,
            "question": question,
            "sql": None,
            "result": None,
            "answer": "Please upload a dataset or load the demo dataset to begin analysis.",
            "language": req.language or "en"
        }

    # ── 3. DYNAMIC DATASET ROUTER ─────────────────────────────────────────────
    routing_result = dataset_router.route(
        question=question,
        active_datasets_info=tables_info,
        has_image=False,
        conversation_history=recent_history
    )
    resolved_q = routing_result.get("resolved_question", question)
    is_multi_dataset = routing_result.get("is_multi_dataset", False)
    target_datasets = routing_result.get("target_datasets", tables_info[:1])

    # ── 4. MULTI-DATASET QUESTION EXECUTION (Requirement 3) ───────────────────
    if is_multi_dataset and len(target_datasets) >= 2:
        d1 = target_datasets[0]
        d2 = target_datasets[1]

        # Decompose multi-dataset question into dataset-specific sub-questions
        sub_q1, sub_q2 = _decompose_multi_dataset_question(resolved_q, d1, d2)

        # Execute Sub-query 1 on Dataset 1 (e.g. accident records / primary count)
        sql_res1 = sql_agent.generate_sql(sub_q1, d1["table_name"], d1["schema"], d1["sample_rows"])
        sql_1 = sql_res1.get("sql")
        rows_1 = []
        if sql_1:
            try:
                _, rows_1 = duckdb_manager.execute_read_only(sql_1, max_rows=10)
            except Exception:
                rows_1 = []

        # Extract top entity from Dataset 1 to correlate into Dataset 2 (e.g. model name)
        entity_val = None
        if rows_1 and len(rows_1) > 0:
            for k, v in rows_1[0].items():
                if v and isinstance(v, str) and len(v) >= 3 and not k.startswith("count"):
                    entity_val = v
                    break

        # Execute Sub-query 2 on Dataset 2 (e.g. specifications / range for identified entity)
        final_q2 = f"What is the maximum range and specifications for {entity_val}?" if entity_val else sub_q2
        sql_res2 = sql_agent.generate_sql(final_q2, d2["table_name"], d2["schema"], d2["sample_rows"])
        sql_2 = sql_res2.get("sql")
        rows_2 = []
        if sql_2:
            try:
                _, rows_2 = duckdb_manager.execute_read_only(sql_2, max_rows=10)
            except Exception:
                rows_2 = []

        # Combine verified results without mixing columns or records
        combined_sql = f"-- 1. Query on {d1['name']}:\n{sql_1}\n\n-- 2. Query on {d2['name']}:\n{sql_2}"
        combined_rows = [
            {"dataset": d1["name"], **r} for r in rows_1[:5]
        ] + [
            {"dataset": d2["name"], **r} for r in rows_2[:5]
        ]
        combined_dataset_name = f"{d1['name']} & {d2['name']}"

        # Synthesize grounded answer
        answer_text = _synthesize_multi_dataset_answer(
            question=question,
            d1_name=d1["name"],
            rows_1=rows_1,
            d2_name=d2["name"],
            rows_2=rows_2,
            mode=req.mode or "nlp",
            language=req.language or "en"
        )

        _save_conversation(db, conv_id, question, answer_text, req.mode, req.language, sql=combined_sql if req.mode == "rag" else None, result=combined_rows if req.mode == "rag" else None)

        response_payload = {
            "mode": req.mode or "nlp",
            "question": question,
            "answer": answer_text,
            "language": req.language or "en",
            "conversation_id": conv_id,
            "dataset_name": combined_dataset_name,
            "rag_metadata": None
        }
        if req.mode == "rag" or "sql" in question.lower():
            response_payload["sql"] = combined_sql
            response_payload["result"] = combined_rows

        return response_payload

    # ── 5. SINGLE DATASET EXECUTION (Requirements 1, 2, 6, 7, 8) ──────────────
    chosen_dataset = target_datasets[0] if target_datasets else tables_info[0]
    tbl_name = chosen_dataset["table_name"]

    # Generate SQL strictly for chosen dataset schema
    sql_response = sql_agent.generate_sql(
        question=resolved_q,
        table_name=tbl_name,
        columns=chosen_dataset["schema"],
        sample_rows=chosen_dataset["sample_rows"]
    )

    if sql_response["status"] == "data_not_available":
        reason = sql_response.get("reason", f"The requested fields are not present in dataset '{chosen_dataset['name']}'.")
        if req.language == "hi":
            answer_text = f"डेटासेट '{chosen_dataset['name']}' में इस प्रश्न का उत्तर देने के लिए आवश्यक कॉलम उपलब्ध नहीं हैं ({reason})।"
        elif req.language == "kn":
            answer_text = f"ಡೇಟಾಸೆಟ್ '{chosen_dataset['name']}' ನಲ್ಲಿ ಈ ಮಾಹಿತಿಯು ಲಭ್ಯವಿಲ್ಲ ({reason})."
        else:
            answer_text = f"The dataset '{chosen_dataset['name']}' does not contain the information required to answer that question. Reason: {reason}"

        return {
            "mode": req.mode,
            "question": question,
            "sql": None,
            "result": None,
            "answer": answer_text,
            "language": req.language or "en",
            "dataset_name": chosen_dataset["name"]
        }

    generated_sql = sql_response["sql"]

    # Execute in DuckDB (Single Source of Truth)
    try:
        columns, result_rows = duckdb_manager.execute_read_only(generated_sql, max_rows=100)
    except Exception as e:
        return {
            "mode": req.mode,
            "question": question,
            "sql": generated_sql if req.mode == "rag" else None,
            "result": None,
            "answer": f"Database execution error on '{chosen_dataset['name']}': {str(e)}",
            "language": req.language or "en",
            "dataset_name": chosen_dataset["name"]
        }

    # Isolated RAG Retrieval strictly for this target dataset (Requirement 8)
    rag_metadata = None
    rag_context_str = ""
    try:
        import pandas as pd
        if chosen_dataset.get("file_path") and Path(chosen_dataset["file_path"]).exists():
            df_for_rag = dataset_service.load_df_from_file(Path(chosen_dataset["file_path"]), chosen_dataset["file_type"])
        else:
            _, sample_records = duckdb_manager.execute_read_only(f'SELECT * FROM "{tbl_name}" LIMIT 80')
            df_for_rag = pd.DataFrame(sample_records)

        rag_metadata = rag_service.retrieve(
            query=resolved_q,
            dataset_name=chosen_dataset["name"],
            df=df_for_rag,
            conversation_id=conv_id,
            top_k=3,
            used_duckdb=True
        )
        if rag_metadata and rag_metadata.get("retrieved_chunks"):
            rag_context_str = "\n".join([c["content"] for c in rag_metadata["retrieved_chunks"][:2]])
    except Exception:
        rag_metadata = None

    # Synthesize grounded answer (Both modes use EXACT same DuckDB rows)
    answer_text = answer_agent.generate_response(
        question=question,
        sql=generated_sql,
        result_rows=result_rows,
        mode=req.mode or "nlp",
        language=req.language or "en",
        rag_context=rag_context_str
    )

    _save_conversation(db, conv_id, question, answer_text, req.mode, req.language, sql=generated_sql if req.mode == "rag" else None, result=result_rows if req.mode == "rag" else None)

    response_payload = {
        "mode": req.mode or "nlp",
        "question": question,
        "answer": answer_text,
        "language": req.language or "en",
        "conversation_id": conv_id,
        "dataset_name": chosen_dataset["name"],
        "rag_metadata": rag_metadata
    }

    if req.mode == "rag" or "sql" in question.lower():
        response_payload["sql"] = generated_sql
        response_payload["result"] = result_rows[:15] if result_rows else []

    return response_payload

def _decompose_multi_dataset_question(question: str, d1: Dict[str, Any], d2: Dict[str, Any]) -> Tuple[str, str]:
    """Splits a composite multi-dataset question into targeted sub-questions for each dataset."""
    if gemini_client.is_configured():
        d1_cols = ", ".join([c["name"] for c in d1.get("schema", [])[:10]])
        d2_cols = ", ".join([c["name"] for c in d2.get("schema", [])[:10]])
        prompt = (
            f"You are HeliXpert's SQL Query Intent Splitter.\n"
            f"User asked this composite multi-dataset question: \"{question}\"\n"
            f"Dataset 1: \"{d1['name']}\" (Available columns: {d1_cols})\n"
            f"Dataset 2: \"{d2['name']}\" (Available columns: {d2_cols})\n\n"
            f"Split into 2 targeted sub-questions so that each dataset only answers what it actually has columns for.\n"
            f"Return JSON: {{\"sub_q1\": \"Question for Dataset 1\", \"sub_q2\": \"Question for Dataset 2\"}}"
        )
        try:
            data = gemini_client.generate_json(prompt, temperature=0.0)
            if data and isinstance(data, dict):
                q1 = data.get("sub_q1", "").strip()
                q2 = data.get("sub_q2", "").strip()
                if q1 and q2:
                    return q1, q2
        except Exception:
            pass

    # Heuristic split by conjunction
    parts = re.split(r"\b(?:and|also|along with)\b", question, maxsplit=1, flags=re.IGNORECASE)
    if len(parts) == 2:
        return parts[0].strip(), parts[1].strip()
    return question, question

def _synthesize_multi_dataset_answer(
    question: str,
    d1_name: str,
    rows_1: List[Dict[str, Any]],
    d2_name: str,
    rows_2: List[Dict[str, Any]],
    mode: str = "nlp",
    language: str = "en"
) -> str:
    """Combines verified findings from multiple datasets without mixing data."""
    if gemini_client.is_configured():
        prompt = (
            f"You are HeliXpert's Multi-Dataset Analytical Intelligence Officer.\n"
            f"User Question: '{question}'\n"
            f"Dataset 1: '{d1_name}'\n"
            f"Verified DuckDB Results for Dataset 1:\n{json.dumps(rows_1, default=str)}\n\n"
            f"Dataset 2: '{d2_name}'\n"
            f"Verified DuckDB Results for Dataset 2:\n{json.dumps(rows_2, default=str)}\n\n"
            f"Desired Language: {language} (en=English, hi=Hindi, kn=Kannada)\n"
            f"RULES:\n"
            f"1. Clearly state what was found in Dataset 1 ('{d1_name}') and what was found in Dataset 2 ('{d2_name}').\n"
            f"2. Never mix, confuse, or alter the numbers between datasets.\n"
            f"3. Provide a unified, concise summary answering the question directly."
        )
        try:
            ans = gemini_client.generate_text(prompt, temperature=0.1)
            if ans and len(ans.strip()) > 0:
                return ans.strip()
        except Exception:
            pass

    # Deterministic fallback
    r1_str = json.dumps(rows_1[0], default=str) if rows_1 else "No matching records found."
    r2_str = json.dumps(rows_2[0], default=str) if rows_2 else "No matching records found."
    return (
        f"**From `{d1_name}`:**\n{r1_str}\n\n"
        f"**From `{d2_name}`:**\n{r2_str}"
    )

def _save_conversation(db: Session, conv_id: str, question: str, answer_text: str, mode: Optional[str], language: Optional[str], sql: Optional[str] = None, result: Optional[Any] = None):
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
        mode=mode or "nlp",
        language=language or "en"
    )
    db.add(user_msg)

    assistant_msg = Message(
        id=str(uuid.uuid4()),
        conversation_id=conv_id,
        role="assistant",
        content=answer_text,
        sql_query=sql,
        query_result=result,
        mode=mode or "nlp",
        language=language or "en"
    )
    db.add(assistant_msg)
    db.commit()
