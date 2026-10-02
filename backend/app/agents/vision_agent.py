import base64
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List
from app.core.config import settings
from app.core.gemini_client import gemini_client

VISION_PROMPT = """You are HeliXpert's Vision Intelligence Engine.
Analyze the provided image with high technical, visual, and aerospace precision.

TASK:
{task_description}

STRICT VISUAL ANALYSIS RULES:
1. Ground your analysis strictly and independently in the visible contents of this specific image.
2. If the user provided a question, answer it directly and accurately based on the visual evidence.
3. If the image depicts a helicopter or rotorcraft:
   - Identify the model/type if identifiable. If uncertain, state confidence as "Tentative" or "Uncertain" without hallucinating.
   - State the probable manufacturer (e.g. HAL, Airbus, Bell, Sikorsky, Boeing, etc.).
   - List key visible components accurately (e.g. Main Rotor Blades count, Fenestron or Tail Rotor, Skid vs Wheeled landing gear, Cockpit glass, Engine cowlings, Antennas, FLIR).
4. If the image is NOT a helicopter (e.g. fixed-wing aircraft, vehicle, chart, graphic, diagram, or object):
   - Accurately describe what the image actually depicts.
   - Set identified_model and probable_manufacturer to "N/A" or describe the actual subject.
   - DO NOT hallucinate helicopter parts on non-helicopter images!
5. Output ONLY a valid JSON object with the following schema:
{{
  "identified_model": "...",
  "confidence": "High" | "Moderate" | "Tentative" | "Uncertain" | "N/A",
  "probable_manufacturer": "...",
  "airframe_type": "...",
  "landing_gear": "...",
  "rotor_configuration": "...",
  "visible_components": ["..."],
  "detailed_analysis": "Comprehensive visual analysis grounded strictly in what is visible in this image."
}}
"""

class VisionAgent:
    @classmethod
    def analyze_image(
        cls,
        image_path: Path,
        user_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Analyzes uploaded image independently using Google Gemini Vision.
        Answers user-specific questions based on the actual uploaded image.
        """
        if not image_path.exists():
            return {
                "image_filename": image_path.name,
                "identified_model": "Image File Missing",
                "confidence": "N/A",
                "probable_manufacturer": "N/A",
                "airframe_type": "N/A",
                "visible_components": [],
                "detailed_analysis": f"The image file '{image_path.name}' could not be located in storage."
            }

        with open(image_path, "rb") as f:
            raw_bytes = f.read()
        base64_img = base64.b64encode(raw_bytes).decode("utf-8")

        ext = image_path.suffix.lower().lstrip(".")
        mime = f"image/{'jpeg' if ext in ['jpg', 'jpeg'] else ext}"
        
        task_desc = user_prompt.strip() if user_prompt and user_prompt.strip() else "Analyze this image in detail. Identify visible objects, equipment, components, and technical specifications."

        # 1. Try Google Gemini Vision
        if gemini_client.is_configured():
            prompt = VISION_PROMPT.format(task_description=task_desc)
            raw_resp = gemini_client.generate_vision(
                base64_image=base64_img,
                mime_type=mime,
                prompt=prompt,
                temperature=0.1,
                timeout=20
            )
            if raw_resp:
                parsed_json = gemini_client.extract_json(raw_resp)
                if parsed_json and isinstance(parsed_json, dict):
                    return cls._normalize_vision_result(parsed_json, image_path)

        # 2. Try OpenAI Vision if Gemini not available
        if settings.OPENAI_API_KEY and len(settings.OPENAI_API_KEY) > 20:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=settings.OPENAI_API_KEY)
                prompt = VISION_PROMPT.format(task_description=task_desc)
                response = client.chat.completions.create(
                    model=settings.OPENAI_VISION_MODEL,
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime};base64,{base64_img}"
                                    }
                                }
                            ]
                        }
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=800,
                    timeout=15
                )
                content = response.choices[0].message.content
                data = json.loads(content)
                return cls._normalize_vision_result(data, image_path)
            except Exception:
                pass

        # 3. Fallback when vision API is unreachable
        return {
            "image_filename": image_path.name,
            "identified_model": "Image Analysis Unavailable",
            "confidence": "Uncertain",
            "probable_manufacturer": "N/A",
            "airframe_type": "N/A",
            "landing_gear": "N/A",
            "rotor_configuration": "N/A",
            "visible_components": ["Image uploaded successfully"],
            "detailed_analysis": f"The image '{image_path.name}' ({len(raw_bytes) // 1024} KB) was received. Vision AI service was temporarily unreachable. Please retry inspection."
        }

    @classmethod
    def _normalize_vision_result(cls, data: Dict[str, Any], path: Path) -> Dict[str, Any]:
        return {
            "image_filename": path.name,
            "identified_model": data.get("identified_model") or "Visual Subject Identified",
            "confidence": data.get("confidence") or "Moderate",
            "probable_manufacturer": data.get("probable_manufacturer") or "N/A",
            "airframe_type": data.get("airframe_type") or "N/A",
            "landing_gear": data.get("landing_gear") or "N/A",
            "rotor_configuration": data.get("rotor_configuration") or "N/A",
            "visible_components": data.get("visible_components") or [],
            "detailed_analysis": data.get("detailed_analysis") or "Image analyzed successfully."
        }

    @classmethod
    def cross_reference_with_dataset(
        cls,
        vision_result: Dict[str, Any],
        dataset_sample_records: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Dynamically cross-references identified visual airframe model with actual records
        in the uploaded dataset. Never guesses or fabricates matches.
        """
        identified_model = vision_result.get("identified_model", "").lower()
        if not identified_model or identified_model in ["n/a", "unknown", "uncertain", "visual subject identified"]:
            return {
                "matched": False,
                "summary": "This image was analyzed independently and does not reference a specific dataset model.",
                "matching_fleet_candidates": []
            }

        if not dataset_sample_records:
            return {
                "matched": False,
                "summary": "No dataset records available to cross-reference.",
                "matching_fleet_candidates": []
            }

        # Look for model/manufacturer columns in the dataset
        first_row = dataset_sample_records[0]
        model_col = None
        mfg_col = None
        id_col = None

        for k in first_row.keys():
            k_lower = k.lower()
            if any(term in k_lower for term in ["model", "aircraft", "type", "airframe"]):
                model_col = k
            elif any(term in k_lower for term in ["mfg", "manufacturer", "oem"]):
                mfg_col = k
            elif any(term in k_lower for term in ["id", "tail", "reg", "serial"]):
                id_col = k

        matches = []
        for row in dataset_sample_records:
            row_model = str(row.get(model_col, "")).lower() if model_col else ""
            row_mfg = str(row.get(mfg_col, "")).lower() if mfg_col else ""

            # Check for keyword overlap
            model_tokens = [t for t in re.split(r"[\s\-_]+", identified_model) if len(t) > 2]
            if model_tokens and (any(t in row_model for t in model_tokens) or any(t in row_mfg for t in model_tokens)):
                matches.append({
                    "model": row.get(model_col, "Unknown Model"),
                    "manufacturer": row.get(mfg_col, "Unknown OEM"),
                    "helicopter_id": row.get(id_col, "Record"),
                    "match_confidence": "Direct Match" if row_model in identified_model else "Category Match"
                })

        # Deduplicate
        seen = set()
        unique_matches = []
        for m in matches:
            key = (m["model"], m["helicopter_id"])
            if key not in seen:
                seen.add(key)
                unique_matches.append(m)

        if unique_matches:
            return {
                "matched": True,
                "summary": f"Identified airframe '{vision_result.get('identified_model')}' correlates with {len(unique_matches)} records in the active dataset.",
                "matching_fleet_candidates": unique_matches[:6]
            }

        return {
            "matched": False,
            "summary": f"Identified airframe '{vision_result.get('identified_model')}' was analyzed independently. No corresponding records exist in the current dataset.",
            "matching_fleet_candidates": []
        }

vision_agent = VisionAgent()
