from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.database.models import Base

# Set connect_args for SQLite if sqlite is used
connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        try:
            with engine.connect() as conn:
                from sqlalchemy import text
                # Check messages table
                m_info = conn.execute(text("PRAGMA table_info(messages)")).fetchall()
                m_cols = [r[1] for r in m_info]
                if "chosen_datasets" not in m_cols:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN chosen_datasets JSON"))
                if "rag_metadata" not in m_cols:
                    conn.execute(text("ALTER TABLE messages ADD COLUMN rag_metadata JSON"))
                
                # Check conversations table
                c_info = conn.execute(text("PRAGMA table_info(conversations)")).fetchall()
                c_cols = [r[1] for r in c_info]
                if "mode" not in c_cols:
                    conn.execute(text("ALTER TABLE conversations ADD COLUMN mode VARCHAR(20) DEFAULT 'nlp'"))
                if "active_datasets" not in c_cols:
                    conn.execute(text("ALTER TABLE conversations ADD COLUMN active_datasets JSON"))
                conn.commit()
        except Exception:
            pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
