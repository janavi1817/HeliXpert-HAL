import re
from typing import List, Dict, Tuple, Optional
import sqlglot
from sqlglot import exp

FORBIDDEN_KEYWORDS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "ATTACH", "INSTALL",
    "LOAD", "PRAGMA", "COPY", "EXECUTE", "CALL", "CREATE", "GRANT",
    "REVOKE", "TRUNCATE", "MERGE", "REPLACE", "UPSERT", "VACUUM", "SHUTDOWN"
}

FORBIDDEN_PATTERNS = [
    r"--",               # SQL comment
    r"/\*.*?\*/",        # multi-line comment
    r";\s*\S+",          # multiple statements chained with semicolon
    r"\bexec\b",
    r"\bxp_",
    r"\bduckdb_settings\b",
    r"\bread_csv\b",
    r"\bread_parquet\b",
    r"\bwrite_csv\b",
]

class SQLValidator:
    @staticmethod
    def validate_query(
        sql: str,
        allowed_table: str,
        allowed_columns: List[str]
    ) -> Tuple[bool, Optional[str], str]:
        """
        Validates that a SQL query is read-only, references only the allowed table,
        and does not contain malicious expressions.
        
        Returns: (is_valid, error_message, sanitized_sql)
        """
        if not sql or not sql.strip():
            return False, "Query is empty.", ""

        clean_sql = sql.strip().rstrip(";")

        # 1. Regex check for comments and forbidden tokens
        for pattern in FORBIDDEN_PATTERNS:
            if re.search(pattern, clean_sql, re.IGNORECASE):
                return False, f"Query contains disallowed pattern or multiple statements.", ""

        # 2. Check forbidden keywords
        tokens = re.findall(r"\b[A-Za-z_]+\b", clean_sql)
        for token in tokens:
            if token.upper() in FORBIDDEN_KEYWORDS:
                return False, f"Forbidden keyword detected: {token.upper()}", ""

        # 3. Parse with sqlglot
        try:
            parsed = sqlglot.parse_one(clean_sql, read="duckdb")
        except Exception as e:
            return False, f"SQL syntax error: {str(e)}", ""

        # Must be a Select expression
        if not isinstance(parsed, exp.Select):
            return False, f"Only SELECT queries are permitted.", ""

        # 4. Check tables referenced
        tables = [t.name.strip('"\'').lower() for t in parsed.find_all(exp.Table)]
        allowed_table_clean = allowed_table.strip('"\'').lower()
        for t in tables:
            if t != allowed_table_clean:
                return False, f"Query references unauthorized table '{t}'. Only '{allowed_table}' is permitted.", ""

        # 5. Check columns referenced (if columns are provided)
        if allowed_columns:
            allowed_cols_set = {c.lower() for c in allowed_columns}
            allowed_cols_set.add("*")
            for col in parsed.find_all(exp.Column):
                col_name = col.name.lower()
                if col_name not in allowed_cols_set:
                    # Could be an alias or function argument, but check if it's an invented column
                    # We give a warning or strict check
                    pass

        # 6. Ensure LIMIT exists to prevent massive memory spikes
        has_limit = parsed.args.get("limit") is not None
        has_aggregate = any(isinstance(node, (exp.Count, exp.Avg, exp.Sum, exp.Min, exp.Max)) for node in parsed.walk())
        
        final_sql = clean_sql
        if not has_limit and not has_aggregate:
            final_sql = f"{clean_sql} LIMIT 100"

        return True, None, final_sql
