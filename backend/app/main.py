from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.postgres import init_db, SessionLocal
from app.services.dataset_service import dataset_service

from app.api.datasets import router as datasets_router
from app.api.chat import router as chat_router
from app.api.images import router as images_router
from app.api.voice import router as voice_router
from app.api.conversations import router as conversations_router
from app.api.dashboard import router as dashboard_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    init_db()
    # Seed sample HAL helicopter dataset on startup for immediate user testability
    db = SessionLocal()
    try:
        dataset_service.ensure_demo_dataset(db)
        dataset_service.load_persisted_documents_into_rag(db)
    except Exception as e:
        print(f"Demo dataset initialization notice: {e}")

    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Multimodal AI Aerospace Intelligence Platform for Helicopter Datasets",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production specify settings.FRONTEND_URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(images_router, prefix=settings.API_V1_STR)
app.include_router(voice_router, prefix=settings.API_V1_STR)
app.include_router(conversations_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "helixpert-backend"}
