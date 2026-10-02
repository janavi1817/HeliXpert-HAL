import re
import json
from typing import Dict, Any, List, Optional, Tuple
from app.database.models import Dataset
from app.core.config import settings
from app.core.gemini_client import gemini_client

ROUTER_PROMPT = """You are HeliXpert's Dynamic Multi-Dataset Router.
The user asked a question in a system with multiple active datasets and optional image analysis capability.

Active Datasets Available:
{datasets_description}

Conversation History (Recent Context):
{conversation_context}

User Question: "{question}"
Has Uploaded Image: {has_image}

ROUTING OBJECTIVES:
1. Analyze the user's intent. Determine:
   - "IMAGE_ONLY": User asks about visible objects/components in the uploaded image.
   - "IMAGE_AND_DATASET": User asks to inspect the uploaded image AND compare/lookup details against an active dataset.
   - "SINGLE_DATASET": Question targets information present in ONE specific active dataset.
   - "MULTI_DATASET": Question requires joining or querying information across TWO OR MORE active datasets (e.g., finding the model with the most accidents in Dataset A, and looking up its specifications in Dataset B).
   - "GENERAL_CONVERSATION": Conversational greeting or platform capability question.

2. Follow-Up Resolution:
   If the user uses pronouns or references like "it", "its", "that model", "the same year", look at the Conversation History to resolve what entity is being referred to.

3. Dataset Selection:
   Match the question's required attributes, metrics, entities against the actual columns, data types, and sample values of each active dataset. NEVER assume Dataset 1 is always relevant.

Output ONLY a valid JSON object:
{{
  "intent": "SINGLE_DATASET" | "MULTI_DATASET" | "IMAGE_ONLY" | "IMAGE_AND_DATASET" | "GENERAL_CONVERSATION",
  "target_dataset_ids": ["<id1>", ...],
  "resolved_question": "Full question with pronouns resolved if follow-up",
  "is_multi_dataset": false | true,
  "sub_intents": [
    {{
      "dataset_id": "<id>",
      "sub_question": "Specific question for this dataset",
      "target_metric_or_entity": "..."
    }}
  ],
  "reason": "Short explanation of dataset routing choice"
}}
"""

class DatasetRouter:
    """
    Intelligent Dynamic Dataset Router for HeliXpert.
    - Dynamically matches user intent against active datasets using schema, columns, samples, and descriptions.
    - Handles pronoun and entity resolution from conversation context.
    - Accurately splits multi-dataset queries across datasets without mixing data.
    - Seamlessly routes image questions and combined image+dataset questions.
    """

    @classmethod
    def _format_datasets_description(cls, datasets: List[Dict[str, Any]]) -> str:
        lines = []
        for i, d in enumerate(datasets, 1):
            cols_summary = ", ".join([f"{c['name']} ({c['type']})" for c in d.get("schema", [])[:15]])
            samples_str = json.dumps(d.get("sample_rows", [])[:2], default=str)
            lines.append(
                f"Dataset {i} [ID: {d['id']}]: \"{d['name']}\"\n"
                f"  Table Name: \"{d['table_name']}\"\n"
                f"  Columns ({len(d.get('schema', []))} total): {cols_summary}\n"
                f"  Sample Records: {samples_str}\n"
            )
        return "\n".join(lines)

    @classmethod
    def _heuristic_dataset_scoring(
        cls,
        question: str,
        datasets: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> List[Tuple[Dict[str, Any], int, List[str]]]:
        """
        Offline fallback scoring matching tokens, columns, and sample values across datasets.
        """
        q_lower = question.lower()
        q_tokens = set(re.findall(r"[a-z0-9_]+", q_lower))

        # Check for context entities in conversation history
        context_tokens = set()
        if conversation_history:
            for msg in conversation_history[-2:]:
                c_text = msg.get("content", "").lower()
                context_tokens.update(re.findall(r"[a-z0-9_]+", c_text))

        scored_datasets = []
        for d in datasets:
            score = 0
            matched_cols = []
            d_name = d["name"].lower()
            
            # Dataset name matches
            for tok in q_tokens:
                if len(tok) >= 3 and tok in d_name:
                    score += 25

            # Column matches
            for col in d.get("schema", []):
                c_name = col["name"].lower()
                c_parts = set(re.split(r"[_\s]+", c_name))
                if c_name in q_lower:
                    score += 20
                    matched_cols.append(col["name"])
                elif any(part in q_tokens and len(part) >= 3 for part in c_parts):
                    score += 10
                    matched_cols.append(col["name"])
                elif any(tok in c_name for tok in q_tokens if len(tok) >= 4):
                    score += 5
                    matched_cols.append(col["name"])

            # Sample row values match
            for row in d.get("sample_rows", []):
                for k, v in row.items():
                    if v and isinstance(v, str) and len(v) >= 3:
                        if v.lower() in q_lower:
                            score += 15
                            matched_cols.append(f"{k}:{v}")

            # Context matches for follow-up questions
            for c_tok in context_tokens:
                for col in d.get("schema", []):
                    if c_tok in col["name"].lower() and len(c_tok) >= 4:
                        score += 3

            scored_datasets.append((d, score, matched_cols))

        scored_datasets.sort(key=lambda x: x[1], reverse=True)
        return scored_datasets

    @classmethod
    def route(
        cls,
        question: str,
        active_datasets_info: List[Dict[str, Any]],
        has_image: bool = False,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        """
        Main dynamic routing entrypoint.
        """
        q = question.strip()
        q_lower = q.lower()

        # Check for image intent
        image_keywords = ["image", "picture", "photo", "visible", "inspect", "rotor blades in the image", "component in the image", "look at this"]
        asks_about_image = has_image and any(k in q_lower for k in image_keywords)
        dataset_keywords = ["dataset", "table", "specification", "records", "database", "fleet", "compare", "maximum range", "hours", "accident"]
        asks_about_dataset = any(k in q_lower for k in dataset_keywords)

        if has_image and asks_about_image and asks_about_dataset:
            intent = "IMAGE_AND_DATASET"
        elif has_image and (asks_about_image or not asks_about_dataset):
            # If an image was uploaded and user didn't ask exclusively about dataset rows
            intent = "IMAGE_ONLY"
        else:
            intent = "SINGLE_DATASET"

        # Check if question requires multiple datasets (e.g., "Which model had the most accidents, and what is its maximum range?")
        multi_indicators = [
            r"\band\b.*\b(range|speed|hours|specification|payload|seats|engine|ceiling)\b",
            r"\b(both datasets|across datasets|in each dataset|all datasets|multiple datasets)\b",
            r"\b(accidents?|crashes?)\b.*\band\b.*\b(specs?|specifications?|range|capacity)\b"
        ]
        is_multi_question = len(active_datasets_info) > 1 and any(re.search(pat, q_lower) for pat in multi_indicators)

        # 1. Try Gemini LLM Dynamic Routing
        if gemini_client.is_configured() and len(active_datasets_info) > 0:
            try:
                datasets_desc = cls._format_datasets_description(active_datasets_info)
                history_text = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')}" for m in (conversation_history or [])[-3:]])
                prompt = ROUTER_PROMPT.format(
                    datasets_description=datasets_desc,
                    conversation_context=history_text or "No prior messages.",
                    question=question,
                    has_image="Yes" if has_image else "No"
                )
                data = gemini_client.generate_json(prompt, temperature=0.0)
                if data and isinstance(data, dict):
                    t_ids = data.get("target_dataset_ids", [])
                    # Match dataset objects
                    matched_objs = [d for d in active_datasets_info if d["id"] in t_ids]
                    if not matched_objs and t_ids:
                        matched_objs = [active_datasets_info[0]]

                    return {
                        "intent": data.get("intent", intent),
                        "target_datasets": matched_objs if matched_objs else active_datasets_info[:1],
                        "resolved_question": data.get("resolved_question", question),
                        "is_multi_dataset": data.get("is_multi_dataset", len(matched_objs) > 1),
                        "sub_intents": data.get("sub_intents", []),
                        "reason": data.get("reason", "Dynamically routed by HeliXpert AI Router")
                    }
            except Exception:
                pass

        # 2. Heuristic Dynamic Scoring Fallback
        scored = cls._heuristic_dataset_scoring(question, active_datasets_info, conversation_history)
        
        if is_multi_question and len(scored) >= 2 and scored[1][1] > 0:
            target_datasets = [scored[0][0], scored[1][0]]
            return {
                "intent": "MULTI_DATASET" if not has_image else "IMAGE_AND_DATASET",
                "target_datasets": target_datasets,
                "resolved_question": question,
                "is_multi_dataset": True,
                "sub_intents": [
                    {"dataset_id": scored[0][0]["id"], "sub_question": question, "matched_columns": scored[0][2]},
                    {"dataset_id": scored[1][0]["id"], "sub_question": question, "matched_columns": scored[1][2]}
                ],
                "reason": f"Question requires combined insights from '{scored[0][0]['name']}' and '{scored[1][0]['name']}'."
            }

        primary_dataset = scored[0][0] if scored else (active_datasets_info[0] if active_datasets_info else None)
        return {
            "intent": intent,
            "target_datasets": [primary_dataset] if primary_dataset else [],
            "resolved_question": question,
            "is_multi_dataset": False,
            "sub_intents": [],
            "reason": f"Routed to '{primary_dataset['name'] if primary_dataset else 'None'}' based on schema match."
        }

dataset_router = DatasetRouter()
