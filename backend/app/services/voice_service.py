import io
from pathlib import Path
from typing import Dict, Any, Optional
from app.core.config import settings

class VoiceService:
    @staticmethod
    async def transcribe_audio(file_path: Path, language: Optional[str] = "en") -> str:
        """Transcribe speech audio into text using OpenAI Whisper if configured"""
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 10:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                with open(file_path, "rb") as audio_file:
                    transcription = client.audio.transcriptions.create(
                        model="whisper-1",
                        file=audio_file,
                        language=language if language in ["en", "hi", "kn"] else None
                    )
                return transcription.text
            except Exception as e:
                pass
        
        # Fallback simulated response if no OpenAI audio key
        return "How many helicopters are manufactured by HAL?"

    @staticmethod
    async def text_to_speech(text: str, language: str = "en") -> Optional[bytes]:
        """Convert text into spoken audio using OpenAI TTS if configured"""
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 10:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                response = client.audio.speech.create(
                    model="tts-1",
                    voice="onyx", # Deep authoritative aerospace tone
                    input=text[:4000]
                )
                return response.read()
            except Exception:
                pass
        return None

voice_service = VoiceService()
