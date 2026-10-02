import re
from typing import Dict, Any, List, Optional

class QueryRouter:
    """
    Intelligent Query Router for HeliXpert.
    Enforces Rule #7:
    Classify questions such as:
    - 'Which year had the highest number of helicopter accidents?'
    - 'How many helicopter accidents occurred?'
    - 'Which operator had the most accidents?'
    - 'What was the average number of fatalities?'
    - 'Which state had the most accidents?'
    as STRUCTURED DATA QUESTIONS.
    They MUST go to DuckDB/Text-to-SQL as the authoritative source of truth.
    Semantic RAG must NEVER be the primary calculation mechanism for structured questions.
    """

    STRUCTURED_PATTERNS = [
        # Aggregations & Counts
        r"\b(how many|count|number of|total|sum|average|mean|avg|median|rate|percentage|ratio)\b",
        # Extremes & Rankings
        r"\b(highest|lowest|most|least|maximum|max|minimum|min|top|bottom|worst|best|largest|smallest|greatest|fastest|slowest)\b",
        # Categorical / Groupings
        r"\b(which year|what year|which operator|what operator|which state|what state|which model|what model|which country|what country)\b",
        r"\b(which|what|who|where|when)\b.*\b(had|have|recorded|reported|experienced|involved|registered|caused)\b",
        # Distributions & Breakdowns
        r"\b(by year|per year|by operator|per operator|by state|per state|by model|per model|breakdown|distribution)\b",
        # Datasets & Tables
        r"\b(accident|accidents|crash|crashes|incident|incidents|fatality|fatalities|flight|hours|engine|fleet|status)\b"
    ]

    @classmethod
    def classify(
        cls,
        question: str,
        columns: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        q = question.lower().strip()
        tokens = set(re.findall(r"[a-z0-9_]+", q))

        # Check regex patterns
        matched_patterns = []
        for pat in cls.STRUCTURED_PATTERNS:
            if re.search(pat, q, re.IGNORECASE):
                matched_patterns.append(pat)

        # Check schema column overlaps if schema is provided
        col_matches = []
        if columns:
            for c in columns:
                c_name = c["name"].lower().replace("_", "")
                for t in tokens:
                    if len(t) >= 4 and (t in c_name or c_name in t):
                        col_matches.append(c["name"])

        # Determine route
        is_structured = bool(matched_patterns) or bool(col_matches)

        # If question is asking about data, numbers, records, it is definitely structured
        if any(w in tokens for w in ["records", "data", "rows", "table", "dataset", "show", "list"]):
            is_structured = True

        route = "STRUCTURED" if is_structured else "SEMANTIC_ONLY"

        return {
            "route": route,
            "is_structured": is_structured,
            "matched_patterns_count": len(matched_patterns),
            "column_matches": list(set(col_matches)),
            "reason": (
                "Question contains analytical, numerical, ranking, or schema-specific attributes "
                "requiring DuckDB as the single source of truth."
                if is_structured else
                "General qualitative or conversational query."
            )
        }

query_router = QueryRouter()
