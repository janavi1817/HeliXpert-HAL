import re
import json
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings
from app.core.gemini_client import gemini_client
from app.security.sql_validator import SQLValidator

SYSTEM_PROMPT = """You are HeliXpert's precision Text-to-SQL Engine for DuckDB.
Your task is to convert the user's question into an exact, read-only DuckDB SQL query against the provided dataset.

Target Table Name: "{table_name}"
Available Columns & Types:
{columns_formatted}

Sample Rows from Database:
{sample_rows_formatted}

CRITICAL RULES:
1. ONLY generate a read-only SELECT query on table "{table_name}".
2. Use ONLY the exact column names provided above. Always quote the table name as "{table_name}".
3. If the column name has special characters or matches SQL keywords, quote it with double quotes (e.g. "year", "group").
4. CRITICAL MISSING DATA RULE:
   - If the user's question asks for attributes, metrics, entities, or concepts that DO NOT exist in the provided schema (for example, asking for geographic location/city/country when no location columns exist, or pilot names when no pilot column exists):
     YOU MUST RETURN status "data_not_available".
     DO NOT guess. DO NOT substitute an unrelated column. DO NOT invent columns.
5. For counting: use COUNT(*).
6. For string searches: use ILIKE '%value%' or UPPER(col) LIKE '%VALUE%' for case-insensitive matching.
7. For ordering: use ORDER BY <col> DESC/ASC LIMIT <n>.
8. Output ONLY a valid JSON object with the following schema:
{{
  "status": "success" | "data_not_available",
  "sql": "SELECT ...",
  "reason": "Clear explanation of the query or why the requested data is not available",
  "answer_type": "number" | "table" | "list" | "comparison"
}}
"""

class SQLAgent:
    @classmethod
    def generate_sql(
        cls,
        question: str,
        table_name: str,
        columns: List[Dict[str, str]],
        sample_rows: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generates dynamic DuckDB SQL using Google Gemini or the schema-adaptive fallback.
        Strictly enforces that missing data returns 'data_not_available'.
        """
        col_names = [c["name"] for c in columns]
        col_names_str = "\n".join([f"- {c['name']} ({c['type']})" for c in columns])
        sample_str = json.dumps(sample_rows[:3], indent=2, default=str)

        raw_sql = None
        reason = "Analytical query generated from schema"
        answer_type = "table"

        # 1. Try Google Gemini if configured
        if gemini_client.is_configured():
            prompt = SYSTEM_PROMPT.format(
                table_name=table_name,
                columns_formatted=col_names_str,
                sample_rows_formatted=sample_str
            )
            user_input = f"{prompt}\n\nUser Question: {question}\nGenerate JSON:"
            
            data = gemini_client.generate_json(user_input, temperature=0.0)
            if data and isinstance(data, dict):
                status = data.get("status")
                if status == "data_not_available":
                    missing_reason = data.get("reason", "The requested information is not present in this dataset.")
                    return {
                        "status": "data_not_available",
                        "sql": None,
                        "reason": missing_reason,
                        "message": f"This dataset does not contain information to answer that question ({missing_reason})."
                    }
                elif status == "success" and data.get("sql"):
                    raw_sql = data.get("sql")
                    reason = data.get("reason", reason)
                    answer_type = data.get("answer_type", answer_type)

        # 2. Try OpenAI if Gemini was unavailable or didn't produce SQL
        if not raw_sql and settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 20:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                prompt = SYSTEM_PROMPT.format(
                    table_name=table_name,
                    columns_formatted=col_names_str,
                    sample_rows_formatted=sample_str
                )
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": question}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.0,
                    timeout=10
                )
                content = response.choices[0].message.content
                data = json.loads(content)
                if data.get("status") == "data_not_available":
                    missing_reason = data.get("reason", "The requested information is not present in this dataset.")
                    return {
                        "status": "data_not_available",
                        "sql": None,
                        "reason": missing_reason,
                        "message": f"This dataset does not contain information to answer that question ({missing_reason})."
                    }
                raw_sql = data.get("sql")
                reason = data.get("reason", reason)
                answer_type = data.get("answer_type", answer_type)
            except Exception:
                raw_sql = None

        # 3. Dynamic Schema-Adaptive Fallback (Works on ANY dataset offline)
        if not raw_sql:
            raw_sql, reason, answer_type = cls._universal_schema_sql_generator(
                question=question,
                table_name=table_name,
                columns=columns,
                sample_rows=sample_rows
            )

        if not raw_sql:
            return {
                "status": "data_not_available",
                "sql": None,
                "reason": "Could not find relevant columns in the dataset schema to answer this question.",
                "message": "This dataset does not contain the required fields to answer this question."
            }

        # 4. Strict Validation with SQLValidator
        is_valid, error_msg, sanitized_sql = SQLValidator.validate_query(
            sql=raw_sql,
            allowed_table=table_name,
            allowed_columns=col_names
        )

        if not is_valid:
            return {
                "status": "invalid_query",
                "sql": raw_sql,
                "error": error_msg,
                "message": f"Query validation check failed: {error_msg}"
            }

        return {
            "status": "success",
            "sql": sanitized_sql,
            "reason": reason,
            "answer_type": answer_type
        }

    @classmethod
    def _universal_schema_sql_generator(
        cls,
        question: str,
        table_name: str,
        columns: List[Dict[str, str]],
        sample_rows: List[Dict[str, Any]]
    ) -> Tuple[Optional[str], str, str]:
        """
        Dynamically analyzes ANY table's column names, data types, and values.
        Only generates SQL if relevant columns actually exist in the schema.
        Never guesses unrelated columns.
        """
        q = question.lower().strip()
        q_tokens = set(re.findall(r"[a-z0-9_]+", q))

        col_names = [c["name"] for c in columns]
        col_types = {c["name"]: c["type"].upper() for c in columns}

        numeric_types = ["INT", "BIGINT", "SMALLINT", "TINYINT", "FLOAT", "DOUBLE", "REAL", "NUMERIC", "DECIMAL"]
        numeric_cols = [c for c in col_names if any(t in col_types[c] for t in numeric_types)]
        text_cols = [c for c in col_names if c not in numeric_cols]

        def match_col(candidate_cols: List[str]) -> Tuple[Optional[str], int]:
            best_score = 0
            best_col = None
            for c in candidate_cols:
                c_clean = c.lower()
                c_parts = set(re.split(r"[_\s]+", c_clean))
                score = 0
                if c_clean in q:
                    score += 15
                for part in c_parts:
                    if part in q_tokens and len(part) > 2:
                        score += 8
                    elif any(part in tok for tok in q_tokens if len(part) > 3):
                        score += 3
                if score > best_score:
                    best_score = score
                    best_col = c
            return best_col, best_score

        # Check for count queries
        if re.search(r"\b(how many|total count|count of|number of records|number of rows|total records|total rows|how many rows)\b", q):
            # Check for value match in text columns
            for row in sample_rows:
                for k, v in row.items():
                    if v and isinstance(v, str) and len(v) >= 3:
                        val_str = str(v).strip()
                        if val_str.lower() in q:
                            sql = f'SELECT COUNT(*) AS matching_records FROM "{table_name}" WHERE UPPER("{k}") LIKE \'%{val_str.upper()}%\''
                            return sql, f"Count records where {k} matches '{val_str}'", "number"

            # Check if group by is requested (e.g., "count by <column>")
            if re.search(r"\b(by|per|each)\b", q):
                group_col, score = match_col(text_cols)
                if group_col and score >= 3:
                    sql = f'SELECT "{group_col}", COUNT(*) AS count FROM "{table_name}" GROUP BY "{group_col}" ORDER BY count DESC LIMIT 15'
                    return sql, f"Count breakdown by {group_col}", "table"

            # Plain total records count
            return f'SELECT COUNT(*) AS total_records FROM "{table_name}"', "Total record count", "number"

        # Check for average / mean queries
        if re.search(r"\b(average|mean|avg)\b", q):
            best_num, score = match_col(numeric_cols)
            if best_num and score >= 3:
                if re.search(r"\b(by|per|for each)\b", q):
                    best_cat, cat_score = match_col(text_cols)
                    if best_cat and cat_score >= 3:
                        sql = f'SELECT "{best_cat}", ROUND(AVG("{best_num}"), 2) AS "avg_{best_num}" FROM "{table_name}" GROUP BY "{best_cat}" ORDER BY "avg_{best_num}" DESC LIMIT 10'
                        return sql, f"Average {best_num} grouped by {best_cat}", "table"
                return f'SELECT ROUND(AVG("{best_num}"), 2) AS "average_{best_num}" FROM "{table_name}"', f"Calculate average {best_num}", "number"

        # Check for maximum / highest / top / fastest / slowest
        if re.search(r"\b(highest|maximum|max|top|fastest|longest|most|largest|greatest)\b", q):
            best_num, score = match_col(numeric_cols)
            if best_num and score >= 3:
                best_text, _ = match_col(text_cols)
                select_clause = f'"{best_text}", "{best_num}"' if best_text else f'*'
                sql = f'SELECT {select_clause} FROM "{table_name}" ORDER BY "{best_num}" DESC LIMIT 5'
                return sql, f"Top records by highest {best_num}", "table"

        # Check for minimum / lowest / slowest / smallest
        if re.search(r"\b(lowest|minimum|min|slowest|least|smallest|shortest)\b", q):
            best_num, score = match_col(numeric_cols)
            if best_num and score >= 3:
                best_text, _ = match_col(text_cols)
                select_clause = f'"{best_text}", "{best_num}"' if best_text else f'*'
                sql = f'SELECT {select_clause} FROM "{table_name}" ORDER BY "{best_num}" ASC LIMIT 5'
                return sql, f"Records with lowest {best_num}", "table"

        # Check for breakdown / distribution
        if re.search(r"\b(breakdown|distribution|categories|summary)\b", q):
            best_cat, score = match_col(text_cols)
            if best_cat and score >= 3:
                sql = f'SELECT "{best_cat}", COUNT(*) AS count FROM "{table_name}" GROUP BY "{best_cat}" ORDER BY count DESC LIMIT 15'
                return sql, f"Distribution breakdown of {best_cat}", "table"

        # Check for specific value filtering from sample rows
        for row in sample_rows:
            for k, v in row.items():
                if v and isinstance(v, str) and len(v) >= 3:
                    if v.lower() in q:
                        sql = f'SELECT * FROM "{table_name}" WHERE UPPER("{k}") LIKE \'%{v.upper()}%\' LIMIT 10'
                        return sql, f"Filter by {k} matching '{v}'", "table"

        # If question asks about specific words and none matched schema columns, do not guess!
        domain_keywords = [w for w in q_tokens if len(w) > 3 and w not in ["show", "give", "what", "which", "list", "tell", "data", "table", "record", "records"]]
        if domain_keywords and not any(match_col(col_names)[1] > 0 for _ in [0]):
            return None, "Requested attributes not found in schema", "table"

        # Clean preview of the table if user asks to see records or sample
        if re.search(r"\b(show|view|sample|preview|list|all)\b", q):
            return f'SELECT * FROM "{table_name}" LIMIT 10', "Dataset records preview", "table"

        return None, "Could not map question to dataset schema", "table"

sql_agent = SQLAgent()
