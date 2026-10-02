import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Response
from pydantic import BaseModel

from app.core.config import DATA_DIR
from app.services.voice_service import voice_service

router = APIRouter(prefix="/voice", tags=["voice"])

AUDIO_TEMP_DIR = DATA_DIR / "temp_audio"
AUDIO_TEMP_DIR.mkdir(parents=True, exist_ok=True)

class SpeakRequest(BaseModel):
    text: str
    language: Optional[str] = "en"

@router.post("/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    language: Optional[str] = Form("en")
):
    """Transcribe spoken audio from microphone input"""
    temp_path = AUDIO_TEMP_DIR / f"{uuid.uuid4()}_{file.filename}"
    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        text = await voice_service.transcribe_audio(temp_path, language=language)
        return {"text": text, "language": language}
    finally:
        temp_path.unlink(missing_ok=True)

@router.post("/speak")
async def generate_speech(req: SpeakRequest):
    """Generate audio stream for spoken response"""
    audio_bytes = await voice_service.text_to_speech(req.text, language=req.language or "en")
    if not audio_bytes:
        # Return fallback json indicating browser SpeechSynthesis can be used
        return Response(content=b"", media_type="audio/mpeg", headers={"X-Use-Browser-TTS": "true"})
    
    return Response(content=audio_bytes, media_type="audio/mpeg")
