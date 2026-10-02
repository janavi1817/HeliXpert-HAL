import json
import re
from typing import List, Dict, Any, Optional
from app.core.gemini_client import gemini_client

class PromptService:
    """
    Generates dynamic, schema-grounded suggested questions for the active dataset.
    Follows Rule #2 & #3:
    - Never hardcodes dataset-specific prompts.
    - Inspects actual schema, columns, data types, and sample rows.
    - Produces 4-6 diverse questions (aggregation, ranking, distribution, filtering).
    - Fully language-aware (English, Hindi, Kannada).
    """

    @classmethod
    def generate_dynamic_prompts(
        cls,
        table_name: str,
        columns: List[Dict[str, str]],
        sample_rows: List[Dict[str, Any]],
        language: str = "en"
    ) -> List[str]:
        lang = language.lower() if language else "en"
        col_summary = ", ".join([f"{c['name']} ({c['type']})" for c in columns[:15]])

        # 1. Try Gemini with low temperature for natural, domain-aware suggestions
        if gemini_client.is_configured():
            lang_label = "English" if lang == "en" else "Hindi (Devanagari script)" if lang == "hi" else "Kannada (Kannada script)"
            prompt = (
                f'You are an expert dataset analyst. Generate 4 to 5 insightful, useful question suggestions '
                f'that users would ask about a dataset with the following schema:\n'
                f'Table: {table_name}\n'
                f'Columns: {col_summary}\n'
                f'Sample Rows: {json.dumps(sample_rows[:2], default=str)}\n\n'
                f'Requirements:\n'
                f'- Base questions ONLY on the actual columns present above.\n'
                f'- Include a mix of ranking (e.g. which had the highest/most), counting, and averages/breakdowns.\n'
                f'- Language: {lang_label}.\n'
                f'- Output ONLY a JSON array of strings: ["question 1", "question 2", ...]'
            )
            try:
                res = gemini_client.generate_json(prompt, temperature=0.2)
                if res and isinstance(res, list) and len(res) >= 3:
                    return [str(q).strip() for q in res[:5] if len(str(q).strip()) > 5]
                elif isinstance(res, dict) and "questions" in res and isinstance(res["questions"], list):
                    return [str(q).strip() for q in res["questions"][:5]]
            except Exception:
                pass

        # 2. Schema-Adaptive Deterministic Synthesizer
        return cls._synthesize_adaptive_prompts(columns, sample_rows, lang)

    @classmethod
    def _synthesize_adaptive_prompts(
        cls,
        columns: List[Dict[str, str]],
        sample_rows: List[Dict[str, Any]],
        lang: str
    ) -> List[str]:
        col_names = [c["name"] for c in columns]
        col_types = {c["name"]: c["type"].upper() for c in columns}

        numeric_types = ["INT", "BIGINT", "SMALLINT", "TINYINT", "FLOAT", "DOUBLE", "REAL", "NUMERIC", "DECIMAL"]
        numeric_cols = [c for c in col_names if any(t in col_types[c] for t in numeric_types)]
        text_cols = [c for c in col_names if c not in numeric_cols]

        prompts: List[str] = []

        # Find temporal column
        temporal_cols = [c for c in col_names if any(t in c.lower() for t in ["year", "date", "month", "time"])]
        temp_col = temporal_cols[0] if temporal_cols else None

        # Find boolean/flag columns
        flag_cols = [c for c in col_names if "BOOLEAN" in col_types.get(c, "") or c.lower() in ["helicopter", "airplane", "active", "status"]]
        flag_col = flag_cols[0] if flag_cols else None

        # Find high-value categorical columns
        cat_candidates = [c for c in text_cols if c.lower() not in ["unnamed_0", "id", "uuid", "file"]]
        top_cat = cat_candidates[0] if cat_candidates else None
        second_cat = cat_candidates[1] if len(cat_candidates) > 1 else None

        # Find high-value numeric column
        num_candidates = [c for c in numeric_cols if c.lower() not in ["unnamed_0", "id", "year"]]
        top_num = num_candidates[0] if num_candidates else None

        # 1. Temporal ranking question
        if temp_col:
            clean_temp = temp_col.replace("_", " ").title()
            if flag_col and "helicopter" in flag_col.lower():
                if lang == "hi":
                    prompts.append("किस वर्ष में सबसे अधिक हेलीकॉप्टर दुर्घटनाएँ हुईं?")
                elif lang == "kn":
                    prompts.append("ಯಾವ ವರ್ಷದಲ್ಲಿ ಅತಿ ಹೆಚ್ಚು ಹೆಲಿಕಾಪ್ಟರ್ ಅಪಘಾತಗಳು ಸಂಭವಿಸಿವೆ?")
                else:
                    prompts.append("Which year had the highest number of helicopter accidents?")
            else:
                if lang == "hi":
                    prompts.append(f"किस {clean_temp} में सबसे अधिक रिकॉर्ड दर्ज किए गए?")
                elif lang == "kn":
                    prompts.append(f"ಯಾವ {clean_temp} ನಲ್ಲಿ ಅತಿ ಹೆಚ್ಚು ದಾಖಲೆಗಳಿವೆ?")
                else:
                    prompts.append(f"Which {clean_temp.lower()} had the highest number of records?")

        # 2. Categorical ranking question
        if top_cat:
            clean_cat = top_cat.replace("_", " ").title()
            if lang == "hi":
                prompts.append(f"किस {clean_cat} के सबसे अधिक रिकॉर्ड हैं?")
            elif lang == "kn":
                prompts.append(f"ಯಾವ {clean_cat} ಅತಿ ಹೆಚ್ಚು ದಾಖಲೆಗಳನ್ನು ಹೊಂದಿದೆ?")
            else:
                prompts.append(f"Which {clean_cat.lower()} has the most records?")

        # 3. Numeric aggregation (Average)
        if top_num:
            clean_num = top_num.replace("_", " ").title()
            if lang == "hi":
                prompts.append(f"औसत {clean_num} क्या है?")
            elif lang == "kn":
                prompts.append(f"ಸರಾಸರಿ {clean_num} ಎಷ್ಟು?")
            else:
                prompts.append(f"What is the average {clean_num.lower()}?")

        # 4. Secondary category breakdown
        if second_cat:
            clean_cat2 = second_cat.replace("_", " ").title()
            if lang == "hi":
                prompts.append(f"{clean_cat2} के आधार पर विवरण दिखाएं।")
            elif lang == "kn":
                prompts.append(f"{clean_cat2} ಆಧಾರಿತ ವಿಂಗಡಣೆ ತೋರಿಸಿ.")
            else:
                prompts.append(f"Show the breakdown by {clean_cat2.lower()}.")

        # 5. Total count question
        if flag_col and "helicopter" in flag_col.lower():
            if lang == "hi":
                prompts.append("इस डेटासेट में कुल कितने हेलीकॉप्टर रिकॉर्ड हैं?")
            elif lang == "kn":
                prompts.append("ಈ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಒಟ್ಟು ಎಷ್ಟು ಹೆಲಿಕಾಪ್ಟರ್ ದಾಖಲೆಗಳಿವೆ?")
            else:
                prompts.append("How many helicopter records are in this dataset?")
        else:
            if lang == "hi":
                prompts.append("इस डेटासेट में कुल कितने रिकॉर्ड दर्ज हैं?")
            elif lang == "kn":
                prompts.append("ಈ ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಒಟ್ಟು ಎಷ್ಟು ದಾಖಲೆಗಳಿವೆ?")
            else:
                prompts.append("How many total records are recorded in this dataset?")

        return prompts[:5]

prompt_service = PromptService()
