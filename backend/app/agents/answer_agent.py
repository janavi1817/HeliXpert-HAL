import json
from typing import Dict, Any, List, Optional
from app.core.config import settings
from app.core.gemini_client import gemini_client

ANSWER_PROMPT = """You are HeliXpert's precision Intelligence Officer.
A user asked a question about a dataset, and the actual SQL query was executed against DuckDB.

User Question: "{question}"
Executed SQL: {sql}
Database Query Result (Actual rows from DuckDB):
{result_json}

Desired Language: {language} (en = English, hi = Hindi, kn = Kannada)
Mode: {mode} (nlp = Natural Language rich conversational explanation, rag = Data Query concise direct answer)

STRICT INSTRUCTIONS:
1. Ground your answer ENTIRELY and EXCLUSIVELY in the provided Database Query Result.
2. NEVER hallucinate, invent numbers, or guess facts not present in the result.
3. If the result has zero rows, clearly state that no matching records were found in the dataset.
4. If mode is 'rag': provide a crisp, direct, factual answer summarizing the exact numbers/records found.
5. If mode is 'nlp': provide a clear, well-structured explanation using bullet points and bold figures where appropriate.
6. Multilingual fidelity:
   - If 'hi', write in natural, professional Hindi (Devanagari script).
   - If 'kn', write in natural, professional Kannada (Kannada script).
   - If 'en', write in professional English.
"""

class AnswerAgent:
    @classmethod
    def generate_response(
        cls,
        question: str,
        sql: str,
        result_rows: List[Dict[str, Any]],
        mode: str = "nlp",
        language: str = "en"
    ) -> str:
        """Generates natural language response grounded strictly in the verified DuckDB query result"""
        
        # 1. Try Gemini if configured
        if gemini_client.is_configured():
            prompt = ANSWER_PROMPT.format(
                question=question,
                sql=sql,
                result_json=json.dumps(result_rows, indent=2, default=str),
                language=language,
                mode=mode
            )
            ans = gemini_client.generate_text(prompt, temperature=0.1)
            if ans and len(ans.strip()) > 0:
                return ans.strip()

        # 2. Try OpenAI if configured
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 20:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                prompt = ANSWER_PROMPT.format(
                    question=question,
                    sql=sql,
                    result_json=json.dumps(result_rows, indent=2, default=str),
                    language=language,
                    mode=mode
                )
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": "Generate response grounded in the query result."}
                    ],
                    temperature=0.1,
                    timeout=10
                )
                ans = response.choices[0].message.content.strip()
                if ans:
                    return ans
            except Exception:
                pass

        # 3. High-fidelity multilingual deterministic generator grounded in exact query results
        return cls._format_multilingual_result(question, sql, result_rows, mode, language)

    @classmethod
    def _format_multilingual_result(
        cls,
        question: str,
        sql: str,
        rows: List[Dict[str, Any]],
        mode: str,
        language: str
    ) -> str:
        if not rows:
            if language == "hi":
                return "अपलोड किए गए डेटासेट में इस क्वेरी के लिए कोई रिकॉर्ड नहीं मिला।"
            elif language == "kn":
                return "ಅಪ್‌ಲೋಡ್ ಮಾಡಲಾದ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಈ ಪ್ರಶ್ನೆಗೆ ಯಾವುದೇ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿಲ್ಲ."
            return "No matching records found in the uploaded dataset for this query."

        # Case 1: Single scalar number / aggregation result
        if len(rows) == 1 and len(rows[0]) == 1:
            key, val = list(rows[0].items())[0]
            val_str = f"{val:,.2f}" if isinstance(val, float) else f"{val:,}" if isinstance(val, int) else str(val)
            clean_key = key.replace("_", " ").title()

            if language == "hi":
                return f"डेटासेट विश्लेषण के अनुसार, **{clean_key}** का मान **{val_str}** है।"
            elif language == "kn":
                return f"ಡೇಟಾಸೆಟ್ ವಿಶ್ಲೇಷಣೆಯ ಪ್ರಕಾರ, **{clean_key}** ಮೌಲ್ಯವು **{val_str}** ಆಗಿದೆ."
            return f"According to the dataset analysis, the **{clean_key}** is **{val_str}**."

        # Case 2: Group by breakdown / category count
        if len(rows) >= 1 and len(rows[0]) == 2:
            keys = list(rows[0].keys())
            category_key = keys[0]
            val_key = keys[1]
            top_items = []
            for r in rows[:8]:
                cat = r[category_key]
                v = r[val_key]
                top_items.append(f"• **{cat}**: {v:,}" if isinstance(v, (int, float)) else f"• **{cat}**: {v}")

            items_joined = "\n".join(top_items)
            clean_cat = category_key.replace("_", " ").title()

            if language == "hi":
                return f"यहाँ **{clean_cat}** के आधार पर वास्तविक डेटासेट परिणाम दिए गए हैं:\n\n{items_joined}"
            elif language == "kn":
                return f"ಇಲ್ಲಿ **{clean_cat}** ಆಧಾರಿತ ನೈಜ ಡೇಟಾಸೆಟ್ ಫಲಿತಾಂಶಗಳಿವೆ:\n\n{items_joined}"
            return f"Here is the breakdown by **{clean_cat}** from the dataset:\n\n{items_joined}"

        # Case 3: Multiple rows / detailed records
        top_row = rows[0]
        summary_preview = ", ".join([f"{k}: {v}" for k, v in list(top_row.items())[:4]])
        total_found = len(rows)

        if language == "hi":
            return f"क्वेरी सफलतापूर्वक निष्पादित हुई। **{total_found}** प्रासंगिक रिकॉर्ड मिले:\n• पहला रिकॉर्ड: {summary_preview}"
        elif language == "kn":
            return f"ಪ್ರಶ್ನೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಕಾರ್ಯಗತಗೊಳಿಸಲಾಗಿದೆ. **{total_found}** ಸಂಬಂಧಿತ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿವೆ:\n• ಮೊದಲ ದಾಖಲೆ: {summary_preview}"
        return f"Successfully retrieved **{total_found}** records matching your query:\n• Top record: {summary_preview}"

answer_agent = AnswerAgent()
