import os
import re
import json
import time
import requests
from typing import Dict, Any, List, Optional, Tuple
from app.core.config import settings

class GeminiClient:
    """
    High-resilience client for Google Gemini REST API.
    Features:
    - Automatic multi-model fallback chain to bypass temporary 503 (demand spike) or 429 rate limits
    - Clean markdown stripping (```json ... ```) and robust JSON regex extraction
    - Support for text-to-SQL, conversational Q&A, and Vision inspection
    """

    def __init__(self):
        # Candidate model waterfall in priority order (fastest & tested first)
        primary_model = getattr(settings, "GEMINI_MODEL", "gemini-3-flash-preview")
        candidates = [primary_model, "gemini-3-flash-preview", "gemini-flash-latest", "gemma-4-26b-a4b-it", "gemini-3.8-flash"]
        # Deduplicate while preserving order
        self.model_candidates = []
        for m in candidates:
            if m and m not in self.model_candidates:
                self.model_candidates.append(m)

    def get_api_key(self) -> str:
        key = getattr(settings, "GOOGLE_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
        if not key:
            key = os.getenv("GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", ""))
        return key.strip() if key else ""

    def is_configured(self) -> bool:
        key = self.get_api_key()
        return bool(key and len(key) > 15 and not key.upper().startswith("YOUR_"))

    def call_api(
        self,
        contents: List[Dict[str, Any]],
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        response_mime_type: Optional[str] = None,
        timeout: int = 12,
        models_override: Optional[List[str]] = None
    ) -> Optional[str]:
        """
        Calls Gemini API with automatic fallback across supported model candidates.
        """
        api_key = self.get_api_key()
        if not api_key:
            return None

        models_to_try = models_override or self.model_candidates
        for model_name in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            
            payload: Dict[str, Any] = {
                "contents": contents,
                "generationConfig": {
                    "temperature": temperature
                }
            }

            if response_mime_type:
                payload["generationConfig"]["responseMimeType"] = response_mime_type

            if system_instruction:
                payload["systemInstruction"] = {
                    "parts": [{"text": system_instruction}]
                }

            try:
                response = requests.post(url, json=payload, timeout=timeout)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                elif response.status_code in [429, 503, 500, 404]:
                    # Temporary demand spike, rate limit, or model deprecation - try next model
                    continue
                else:
                    # Other status code
                    continue
            except Exception:
                continue

        return None

    def generate_text(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.2,
        timeout: int = 12
    ) -> Optional[str]:
        contents = [{"parts": [{"text": prompt}]}]
        return self.call_api(
            contents=contents,
            system_instruction=system_instruction,
            temperature=temperature,
            timeout=timeout
        )

    def generate_json(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.0,
        timeout: int = 12
    ) -> Optional[Dict[str, Any]]:
        raw_text = self.generate_text(
            prompt=prompt,
            system_instruction=system_instruction,
            temperature=temperature,
            timeout=timeout
        )
        if not raw_text:
            return None
        return self.extract_json(raw_text)

    def generate_vision(
        self,
        base64_image: str,
        mime_type: str,
        prompt: str,
        system_instruction: Optional[str] = None,
        temperature: float = 0.1,
        timeout: int = 18
    ) -> Optional[str]:
        contents = [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inlineData": {
                            "mimeType": mime_type,
                            "data": base64_image
                        }
                    }
                ]
            }
        ]
        # Vision-capable models only (exclude Gemma text models)
        vision_models = [m for m in self.model_candidates if not m.startswith("gemma")]
        return self.call_api(
            contents=contents,
            system_instruction=system_instruction,
            temperature=temperature,
            timeout=timeout,
            models_override=vision_models
        )

    @staticmethod
    def extract_json(text: str) -> Optional[Dict[str, Any]]:
        """Cleans and extracts JSON safely from LLM output, handling markdown fences."""
        if not text:
            return None
        cleaned = text.strip()
        # Remove markdown code fences ```json ... ``` or ``` ... ```
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

        # Try direct parse
        try:
            return json.loads(cleaned)
        except Exception:
            pass

        # Try regex extract matching outermost { ... }
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except Exception:
                pass

        return None

gemini_client = GeminiClient()
