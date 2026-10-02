import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(override=True)

BASE_DIR = Path(__file__).resolve().parent.parent.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
IMAGE_DIR = DATA_DIR / "images"
SAMPLE_DIR = BASE_DIR / "sample_data"

# SQLite and DuckDB database directory:
# When project is located inside a cloud sync folder (e.g. OneDrive), cloud sync engines
# lock database files during writes, causing ERROR_SHARING_VIOLATION and sync errors (Red X).
# Active databases are routed to a dedicated local directory (~/.helixpert/data) by default.
_custom_db_dir = os.getenv("HELIXPERT_DB_DIR")
if _custom_db_dir:
    DB_DIR = Path(_custom_db_dir)
elif "OneDrive" in str(DATA_DIR):
    DB_DIR = Path.home() / ".helixpert" / "data"
else:
    DB_DIR = DATA_DIR

DB_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
IMAGE_DIR.mkdir(parents=True, exist_ok=True)
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

class Settings:
    PROJECT_NAME: str = "HeliXpert"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database (resolve relative sqlite paths to absolute DB_DIR)
    _raw_db_url: str = os.getenv("DATABASE_URL", "")
    DATABASE_URL: str = (
        f"sqlite:///{DB_DIR.as_posix()}/helixpert.db"
        if (not _raw_db_url or "sqlite:///./data" in _raw_db_url or _raw_db_url.startswith("sqlite:///data"))
        else _raw_db_url
    )
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    OPENAI_VISION_MODEL: str = os.getenv("OPENAI_VISION_MODEL", "gpt-4o")

    # Google Gemini
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("GOOGLE_API_KEY", ""))
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "helixpert-aerospace-secret-key-2026")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    # Limits
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500"))
    MAX_QUERY_ROWS: int = int(os.getenv("MAX_QUERY_ROWS", "1000"))

settings = Settings()
