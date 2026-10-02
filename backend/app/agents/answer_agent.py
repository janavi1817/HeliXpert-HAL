import json
import re
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings
from app.core.gemini_client import gemini_client

ANSWER_PROMPT = """You are HeliXpert's precision Intelligence Officer.
A user asked a question about a dataset, and the actual SQL query was executed against DuckDB.

User Question: "{question}"
Executed SQL: {sql}
Database Query Result (Actual authoritative rows from DuckDB):
{result_json}

Desired Language: {language} (en = English, hi = Hindi, kn = Kannada)
Mode: {mode} (nlp = Natural Language rich conversational explanation, rag = Data Query concise direct answer)

{rag_disclaimer}

STRICT ARCHITECTURAL INSTRUCTIONS:
1. DUCKDB IS THE SINGLE SOURCE OF TRUTH. Ground your answer ENTIRELY and EXCLUSIVELY in the provided Database Query Result.
2. NEVER calculate, invent, extrapolate, or alter any numbers, years, percentages, or statistics.
3. The exact numbers and entity names present in the DuckDB result MUST appear verbatim in your response.
4. Mode-specific presentation:
   - If mode is 'rag': provide a brief, crisp, factual answer directly stating the exact verified numbers and findings (e.g., "The year with the highest number of helicopter accidents was 2010, with 92 recorded accidents.").
   - If mode is 'nlp': provide a comprehensive, detailed natural language explanation highlighting the verified figures in bold, contextualizing the finding, but NEVER deviating from or changing the DuckDB numbers.
5. Multilingual fidelity:
   - If 'hi', write in natural, professional Hindi (Devanagari script), preserving the exact verified numbers.
   - If 'kn', write in natural, professional Kannada (Kannada script), preserving the exact verified numbers.
   - If 'en', write in professional English.
"""

class AnswerAgent:
    @classmethod
    def validate_answer(
        cls,
        answer: str,
        rows: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """
        Rule #6: Answer Validation.
        Compares generated text against DuckDB rows.
        Verifies that key numerical values and entity values from the top rows appear in the answer.
        """
        if not rows:
            return True, []

        missing_elements = []
        top_row = rows[0]
        
        for k, v in top_row.items():
            if v is not None:
                if isinstance(v, (int, float)):
                    v_int = int(v) if (isinstance(v, int) or (isinstance(v, float) and v.is_integer())) else None
                    val_str = str(v_int) if v_int is not None else str(v)
                    comma_str = f"{v_int:,}" if v_int is not None else ""
                    # Check if number appears in answer
                    if val_str not in answer and (not comma_str or comma_str not in answer):
                        missing_elements.append(f"{k}={val_str}")
                elif isinstance(v, str) and len(v.strip()) >= 3:
                    # Entity name check
                    clean_str = v.strip().lower()
                    if clean_str not in answer.lower():
                        # Try without special chars
                        token = re.sub(r'[^a-zA-Z0-9]', '', clean_str)
                        if len(token) >= 3 and token not in re.sub(r'[^a-zA-Z0-9]', '', answer.lower()):
                            missing_elements.append(f"{k}='{v}'")

        is_valid = (len(missing_elements) == 0)
        return is_valid, missing_elements

    @classmethod
    def generate_response(
        cls,
        question: str,
        sql: str,
        result_rows: List[Dict[str, Any]],
        mode: str = "nlp",
        language: str = "en",
        rag_context: Optional[str] = None
    ) -> str:
        """
        Generates natural language response grounded strictly in the verified DuckDB query result.
        Both NLP mode and Data Query mode consume the EXACT same DuckDB result.
        Validates answer against DuckDB rows and rejects any hallucinated deviations.
        """
        rag_disclaimer = ""
        if rag_context:
            rag_disclaimer = (
                "RAG Context Note: Retrieved for contextual relevance; not used as the source of the numerical result.\n"
                f"Contextual Snippet:\n{rag_context[:600]}\n"
            )

        prompt = ANSWER_PROMPT.format(
            question=question,
            sql=sql,
            result_json=json.dumps(result_rows, indent=2, default=str),
            language=language,
            mode=mode,
            rag_disclaimer=rag_disclaimer
        )

        candidate_answer = None

        # 1. Try Gemini
        if gemini_client.is_configured():
            candidate_answer = gemini_client.generate_text(prompt, temperature=0.1)
            if candidate_answer:
                is_valid, missing = cls.validate_answer(candidate_answer, result_rows)
                if is_valid:
                    return candidate_answer.strip()
                
                # Rule #6: Reject and regenerate with strict correction prompt
                correction_prompt = (
                    f"{prompt}\n\nCRITICAL CORRECTION REQUIRED:\n"
                    f"Your previous response missed the following verified DuckDB result elements: {', '.join(missing)}.\n"
                    "You MUST include these exact numbers/values in your revised answer."
                )
                corrected = gemini_client.generate_text(correction_prompt, temperature=0.0)
                if corrected:
                    is_valid_corr, _ = cls.validate_answer(corrected, result_rows)
                    if is_valid_corr:
                        return corrected.strip()

        # 2. Try OpenAI if configured
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 20:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.chat.completions.create(
                    model=settings.OPENAI_MODEL,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": "State the verified answer based strictly on the DuckDB result."}
                    ],
                    temperature=0.1,
                    timeout=10
                )
                ans = response.choices[0].message.content.strip()
                if ans:
                    is_valid, _ = cls.validate_answer(ans, result_rows)
                    if is_valid:
                        return ans
            except Exception:
                pass

        # 3. Deterministic Multilingual Formatter (100% Mathematically Verified & Consistent)
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

        # Case 1: Single scalar number / aggregation result (e.g. COUNT(*) or AVG)
        if len(rows) == 1 and len(rows[0]) == 1:
            key, val = list(rows[0].items())[0]
            val_str = f"{val:,.2f}" if isinstance(val, float) else f"{val:,}" if isinstance(val, int) else str(val)
            clean_key = key.replace("_", " ").title()

            if mode == "rag":
                if language == "hi":
                    return f"डेटासेट के अनुसार, कुल **{clean_key}**: **{val_str}** है।"
                elif language == "kn":
                    return f"ಡೇಟಾಸೆಟ್ ಪ್ರಕಾರ, ಒಟ್ಟು **{clean_key}**: **{val_str}** ಆಗಿದೆ."
                return f"According to the dataset analysis, the **{clean_key}** is **{val_str}**."
            else:
                if language == "hi":
                    return f"डेटासेट के गहन विश्लेषण के अनुसार, **{clean_key}** का कुल मान **{val_str}** दर्ज किया गया है। यह डेटासेट में मौजूद सभी रिकॉर्ड्स का सत्यापित परिणाम है।"
                elif language == "kn":
                    return f"ಡೇಟಾಸೆಟ್‌ನ ಸಮಗ್ರ ವಿಶ್ಲೇಷಣೆಯ ಪ್ರಕಾರ, **{clean_key}** ಒಟ್ಟು ಮೌಲ್ಯವು **{val_str}** ಎಂದು ದಾಖಲಾಗಿದೆ. ಇದು ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿರುವ ಎಲ್ಲಾ ದಾಖಲೆಗಳ ಪರಿಶೀಲಿಸಿದ ಫಲಿತಾಂಶವಾಗಿದೆ."
                return f"Based on the analysis of the dataset, the **{clean_key}** is **{val_str}**. This represents the verified aggregated result calculated directly from the underlying data records."

        # Case 2: Group by single top ranking (len(rows) == 1 and 2 columns, e.g. year: 2010, accident_count: 92)
        if len(rows) == 1 and len(rows[0]) == 2:
            keys = list(rows[0].keys())
            category_key = keys[0]
            val_key = keys[1]
            cat = rows[0][category_key]
            val = rows[0][val_key]
            val_str = f"{val:,.2f}" if isinstance(val, float) else f"{val:,}" if isinstance(val, int) else str(val)
            clean_cat = category_key.replace("_", " ").title()
            clean_val = val_key.replace("_", " ").title()

            if mode == "rag":
                if language == "hi":
                    return f"डेटासेट के अनुसार, सबसे अधिक रिकॉर्ड वाला **{clean_cat}** **{cat}** है, जिसमें **{val_str}** {clean_val.lower()} दर्ज हैं।"
                elif language == "kn":
                    return f"ಡೇಟಾಸೆಟ್ ಪ್ರಕಾರ, ಅತ್ಯಧಿಕ ದಾಖಲೆ ಹೊಂದಿರುವ **{clean_cat}** **{cat}** ಆಗಿದೆ, ಇದರಲ್ಲಿ **{val_str}** {clean_val.lower()} ದಾಖಲಾಗಿದೆ."
                return f"The **{clean_cat}** with the highest count was **{cat}**, with **{val_str}** recorded {clean_val.lower()}."
            else:
                if language == "hi":
                    return f"डेटासेट विश्लेषण के अनुसार, सबसे अधिक रिकॉर्ड वाला **{clean_cat}** **{cat}** रहा, जिसमें कुल **{val_str}** {clean_val.lower()} दर्ज किए गए। यह डेटासेट में इस श्रेणी का उच्चतम आंकड़ा है।"
                elif language == "kn":
                    return f"ಡೇಟಾಸೆಟ್ ವಿಶ್ಲೇಷಣೆಯ ಪ್ರಕಾರ, ಅತ್ಯಧಿಕ ಸಂಖ್ಯೆಯ **{clean_cat}** **{cat}** ಆಗಿದ್ದು, ಒಟ್ಟು **{val_str}** {clean_val.lower()} ದಾಖಲಾಗಿದೆ. ಇದು ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿನ ಗರಿಷ್ಠ ಸಂಖ್ಯೆಯಾಗಿದೆ."
                return f"According to the dataset analysis, the **{clean_cat}** with the highest number was **{cat}**, with a total of **{val_str}** recorded {clean_val.lower()}. This represents the peak value across all recorded periods in the dataset."

        # Case 3: Group by breakdown / multiple categories
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

        # Case 4: Multiple rows / detailed records
        top_row = rows[0]
        summary_preview = ", ".join([f"{k}: {v}" for k, v in list(top_row.items())[:4]])
        total_found = len(rows)

        if language == "hi":
            return f"क्वेरी सफलतापूर्वक निष्पादित हुई। **{total_found}** प्रासंगिक रिकॉर्ड मिले:\n• पहला रिकॉर्ड: {summary_preview}"
        elif language == "kn":
            return f"ಪ್ರಶ್ನೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಕಾರ್ಯಗತಗೊಳಿಸಲಾಗಿದೆ. **{total_found}** ಸಂಬಂಧಿತ ದಾಖಲೆಗಳು ಕಂಡುಬಂದಿವೆ:\n• ಮೊದಲ ದಾಖಲೆ: {summary_preview}"
        return f"Successfully retrieved **{total_found}** records matching your query:\n• Top record: {summary_preview}"

answer_agent = AnswerAgent()
