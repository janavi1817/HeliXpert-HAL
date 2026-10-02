import duckdb
import threading
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.core.config import settings, DATA_DIR, DB_DIR

DUCKDB_PATH = DB_DIR / "analytics.duckdb"

class DuckDBManager:
    _instance = None
    _lock = threading.Lock()
    
    def __init__(self):
        self.db_path = str(DUCKDB_PATH)
        # Main persistent connection
        self._conn = duckdb.connect(self.db_path)
    
    @classmethod
    def get_instance(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
            return cls._instance

    def _get_cursor(self):
        return self._conn.cursor()

    def create_table_from_df(self, table_name: str, df) -> None:
        """Register or replace a DataFrame as a table in DuckDB"""
        with self._lock:
            safe_table_name = "".join(c for c in table_name if c.isalnum() or c == "_")
            self._conn.register("temp_df", df)
            self._conn.execute(f'CREATE OR REPLACE TABLE "{safe_table_name}" AS SELECT * FROM temp_df')
            self._conn.unregister("temp_df")

    def create_table_from_file(self, table_name: str, file_path: str, file_type: str) -> None:
        """Create a table in DuckDB directly from a file"""
        with self._lock:
            safe_table_name = "".join(c for c in table_name if c.isalnum() or c == "_")
            p = Path(file_path).as_posix()
            
            if file_type == "csv":
                self._conn.execute(f'''
                    CREATE OR REPLACE TABLE "{safe_table_name}" AS 
                    SELECT * FROM read_csv_auto('{p}', header=True, all_varchar=False)
                ''')
            elif file_type == "parquet":
                self._conn.execute(f'''
                    CREATE OR REPLACE TABLE "{safe_table_name}" AS 
                    SELECT * FROM read_parquet('{p}')
                ''')
            elif file_type == "json":
                self._conn.execute(f'''
                    CREATE OR REPLACE TABLE "{safe_table_name}" AS 
                    SELECT * FROM read_json_auto('{p}')
                ''')
            else:
                import pandas as pd
                if file_type in ["xlsx", "xls"]:
                    df = pd.read_excel(file_path)
                    self._conn.register("temp_excel_df", df)
                    self._conn.execute(f'CREATE OR REPLACE TABLE "{safe_table_name}" AS SELECT * FROM temp_excel_df')
                    self._conn.unregister("temp_excel_df")

    def table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the DuckDB instance"""
        with self._lock:
            safe_table_name = "".join(c for c in table_name if c.isalnum() or c == "_")
            try:
                res = self._conn.execute(
                    f"SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '{safe_table_name}'"
                ).fetchone()
                return bool(res and res[0] > 0)
            except Exception:
                return False

    def get_table_schema(self, table_name: str) -> List[Dict[str, str]]:
        """Get column names and types for a table"""
        with self._lock:
            safe_table_name = "".join(c for c in table_name if c.isalnum() or c == "_")
            result = self._conn.execute(f'DESCRIBE "{safe_table_name}"').fetchall()
            return [{"name": row[0], "type": row[1]} for row in result]

    def get_row_count(self, table_name: str) -> int:
        with self._lock:
            safe_table_name = "".join(c for c in table_name if c.isalnum() or c == "_")
            result = self._conn.execute(f'SELECT COUNT(*) FROM "{safe_table_name}"').fetchone()
            return result[0] if result else 0

    def execute_read_only(self, sql_query: str, max_rows: int = 1000) -> Tuple[List[str], List[Dict[str, Any]]]:
        """Execute read-only SQL query and return (columns, rows_as_dicts)"""
        with self._lock:
            cursor = self._conn.cursor()
            cursor.execute(sql_query)
            description = cursor.description
            columns = [d[0] for d in description] if description else []
            rows = cursor.fetchmany(max_rows)
            
            dict_rows = []
            for row in rows:
                dict_rows.append(dict(zip(columns, row)))
            cursor.close()
            return columns, dict_rows

    def fetch_sample_rows(self, table_name: str, limit: int = 5) -> List[Dict[str, Any]]:
        safe_table_name = "".join(c for c in table_name if c.isalnum() or c == "_")
        sql = f'SELECT * FROM "{safe_table_name}" LIMIT {limit}'
        _, rows = self.execute_read_only(sql, max_rows=limit)
        return rows

duckdb_manager = DuckDBManager.get_instance()
