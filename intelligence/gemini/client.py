"""
Gemini API client for semantic video and visual evidence analysis in SafeCity AI.
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List

from schemas import GeminiVideoAnalysis

logger = logging.getLogger("GeminiClient")
logger.setLevel(logging.INFO)

SYSTEM_PROMPT = """You are an objective computer-vision emergency incident video analyzer for SafeCity AI (HACKWELL).
Your purpose is to report DIRECTLY VISIBLE factual evidence and observations from traffic/dashcam footage.

CRITICAL RULES:
1. Distinguish between direct visual observations and speculations.
2. DO NOT invent unseen details. If something is not clearly visible, report it in uncertainties.
3. DO NOT diagnose medical injuries or claim someone is injured based solely on visual appearance.
4. DO NOT make dispatch decisions or emergency response determinations.
5. Return ONLY a valid JSON object matching this schema:
{
  "collisionObserved": true | false,
  "approximateEventTimeSec": number or null,
  "vehiclesVisible": integer,
  "peopleVisible": integer,
  "roadObstructionObserved": true | false,
  "smokeObserved": true | false,
  "fireObserved": true | false,
  "overturnedVehicleObserved": true | false,
  "sceneClarity": "high" | "medium" | "low",
  "occlusion": "high" | "moderate" | "low" | "none",
  "ambiguity": "high" | "medium" | "low",
  "observations": ["bullet list of factual visible details"],
  "uncertainties": ["bullet list of unclear, occluded, or unknown factors"]
}
"""


class GeminiClient:
    """
    Communicates with Google Gemini API using the google-genai SDK or REST fallback.
    Reads credentials exclusively from the environment.
    """

    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-2.5-flash"):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = model_name
        self._client = None

    def is_configured(self) -> bool:
        """Returns True if a valid non-empty API key is present."""
        return bool(self.api_key and self.api_key.strip())

    def _get_client(self):
        """Initializes Google GenAI client if configured."""
        if not self.is_configured():
            return None
        if self._client is None:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to initialize google.genai Client: {e}")
                self._client = None
        return self._client

    def analyze_scene(
        self,
        prompt_text: str,
        image_bytes_list: Optional[List[bytes]] = None,
    ) -> GeminiVideoAnalysis:
        """
        Sends multi-frame images or video context to Gemini and extracts structured semantic observations.
        Degrades gracefully without throwing unhandled exceptions if the service or key is unavailable.
        """
        if not self.is_configured():
            logger.info("GEMINI_API_KEY not configured. Skipping Gemini semantic analysis.")
            return GeminiVideoAnalysis(
                collisionObserved=False,
                approximateEventTimeSec=None,
                vehiclesVisible=0,
                peopleVisible=0,
                roadObstructionObserved=False,
                smokeObserved=False,
                fireObserved=False,
                overturnedVehicleObserved=False,
                sceneClarity="medium",
                occlusion="low",
                ambiguity="medium",
                observations=["Gemini API key not configured in environment"],
                uncertainties=["Semantic analysis bypassed due to unconfigured Gemini API key"],
                status="unavailable",
                modelName=self.model_name,
                errorMessage="GEMINI_API_KEY environment variable is not set",
            )

        client = self._get_client()
        if client is None:
            return GeminiVideoAnalysis(
                collisionObserved=False,
                approximateEventTimeSec=None,
                vehiclesVisible=0,
                peopleVisible=0,
                roadObstructionObserved=False,
                smokeObserved=False,
                fireObserved=False,
                overturnedVehicleObserved=False,
                sceneClarity="medium",
                occlusion="low",
                ambiguity="medium",
                observations=[],
                uncertainties=["Client initialization failed"],
                status="error",
                modelName=self.model_name,
                errorMessage="Could not initialize Google GenAI client",
            )

        try:
            from google.genai import types

            contents: List[Any] = [prompt_text]
            if image_bytes_list:
                for img_bytes in image_bytes_list:
                    contents.append(
                        types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
                    )

            config = types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.1,
                response_mime_type="application/json",
            )

            response = client.models.generate_content(
                model=self.model_name,
                contents=contents,
                config=config,
            )

            raw_text = response.text or ""
            parsed = self._parse_json_response(raw_text)
            parsed["status"] = "completed"
            parsed["modelName"] = self.model_name
            return GeminiVideoAnalysis(**parsed)

        except Exception as e:
            logger.warning(f"Gemini API invocation failed: {e}. Returning structured degraded analysis.")
            return GeminiVideoAnalysis(
                collisionObserved=False,
                approximateEventTimeSec=None,
                vehiclesVisible=0,
                peopleVisible=0,
                roadObstructionObserved=False,
                smokeObserved=False,
                fireObserved=False,
                overturnedVehicleObserved=False,
                sceneClarity="medium",
                occlusion="moderate",
                ambiguity="high",
                observations=[],
                uncertainties=[f"Gemini API request failed: {str(e)}"],
                status="error",
                modelName=self.model_name,
                errorMessage=str(e),
            )

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Safely parses JSON payload from response text."""
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        try:
            return json.loads(cleaned)
        except Exception as e:
            logger.error(f"Failed to parse Gemini JSON: {e}, raw text: {text[:200]}")
            return {
                "collisionObserved": False,
                "approximateEventTimeSec": None,
                "vehiclesVisible": 0,
                "peopleVisible": 0,
                "roadObstructionObserved": False,
                "smokeObserved": False,
                "fireObserved": False,
                "overturnedVehicleObserved": False,
                "sceneClarity": "low",
                "occlusion": "high",
                "ambiguity": "high",
                "observations": ["Malformed response received from model"],
                "uncertainties": ["Response parsing error"],
            }
