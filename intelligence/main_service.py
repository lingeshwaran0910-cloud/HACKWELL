"""
HACKWELL SafeCity AI — Unified Intelligence Python Microservice (Phase 4).
Exposes the full video analysis pipeline:
  - /analyze/full  → Runs Accident Model + YOLO + Gemini + Fusion → FusedIncidentAssessment
  - /analyze       → Accident model only (backward-compat)
  - /health        → Service health

All Gemini API key access is server-side only. Never exposed to frontend.
"""

import os
import sys
import tempfile
import logging
from typing import Dict, Any

# Ensure sub-packages resolve correctly
THIS_DIR = os.path.dirname(os.path.abspath(__file__))
ACCIDENT_DIR = os.path.join(THIS_DIR, "accident_detector")
VISION_DIR = os.path.join(THIS_DIR, "vision")
GEMINI_DIR = os.path.join(THIS_DIR, "gemini")
FUSION_DIR = os.path.join(THIS_DIR, "fusion")

for _p in [ACCIDENT_DIR, VISION_DIR, GEMINI_DIR, FUSION_DIR]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from detector import AccidentDetector
from schemas import AccidentDetectionResponse, VideoAnalysisFileRequest
from video_processor import VideoValidationError, VideoProcessingError
from yolo_detector import YOLODetector
from video_analyzer import GeminiVideoAnalyzer
from evidence_fusion import fuse_evidence
from fusion.schemas import FusedIncidentAssessment  # type: ignore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("HACKWELLIntelligenceService")

app = FastAPI(
    title="HACKWELL SafeCity AI — Unified Intelligence Service",
    description=(
        "End-to-end video accident analysis pipeline. "
        "Accident Model → YOLO Visual Evidence → Gemini Semantic → Fusion Assessment."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy-init global instances
_accident_detector: AccidentDetector = None  # type: ignore
_yolo_detector: YOLODetector = None  # type: ignore
_gemini_analyzer: GeminiVideoAnalyzer = None  # type: ignore


def get_accident_detector() -> AccidentDetector:
    global _accident_detector
    if _accident_detector is None:
        _accident_detector = AccidentDetector()
        _accident_detector.load_model()
    return _accident_detector


def get_yolo_detector() -> YOLODetector:
    global _yolo_detector
    if _yolo_detector is None:
        _yolo_detector = YOLODetector()
    return _yolo_detector


def get_gemini_analyzer() -> GeminiVideoAnalyzer:
    global _gemini_analyzer
    if _gemini_analyzer is None:
        _gemini_analyzer = GeminiVideoAnalyzer()
    return _gemini_analyzer


@app.on_event("startup")
def startup_event():
    logger.info("HACKWELL Intelligence Service starting — warming detectors...")
    try:
        get_accident_detector()
        get_yolo_detector()
        get_gemini_analyzer()
        logger.info("All detectors initialized.")
    except Exception as e:
        logger.warning(f"Non-fatal startup warm error: {e}")


@app.get("/health", summary="Check full-pipeline service health")
def health_check() -> Dict[str, Any]:
    detector = get_accident_detector()
    return {
        "status": "ONLINE",
        "service": "hackwell-intelligence",
        "version": "2.0.0",
        "components": {
            "accidentDetector": {
                "loaded": detector._is_loaded,
                "model": detector.model_name,
                "status": "loaded" if detector._is_loaded else "heuristic_fallback",
            },
            "yoloDetector": {"status": "available"},
            "geminiAnalyzer": {
                "status": "available" if os.environ.get("GEMINI_API_KEY") else "unavailable_no_key"
            },
        },
    }


@app.post(
    "/analyze",
    response_model=AccidentDetectionResponse,
    summary="[Phase 1] Accident model only — video upload",
)
async def analyze_video_accident_only(video: UploadFile = File(...)) -> AccidentDetectionResponse:
    """Backward-compatible endpoint: runs only the accident classification model."""
    if not video.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename")

    suffix = os.path.splitext(video.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(await video.read())
        temp_path = f.name

    try:
        detector = get_accident_detector()
        response = detector.predict_video(temp_path)
        if response.videoMetadata:
            response.videoMetadata.filename = video.filename
        return response
    except VideoValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except VideoProcessingError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.exception(f"Error in /analyze: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass


@app.post(
    "/analyze/full",
    summary="[Full Pipeline] Accident + YOLO + Gemini + Fusion — video upload",
)
async def analyze_video_full_pipeline(video: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Full HACKWELL pipeline:
      1. Accident detection model (jatinmehra/Accident-Detection-using-Dashcam)
      2. YOLO visual evidence (YOLOv8n object detection + tracking)
      3. Gemini semantic video analysis
      4. Evidence fusion into FusedIncidentAssessment

    Returns:
      - fusedAssessment: FusedIncidentAssessment (incident decision + credibility + severity + response)
      - accidentDetection: raw Phase 1 output
      - yoloEvidence: raw Phase 2 output (excludes base64 thumbnail for brevity)
      - geminiAnalysis: raw Phase 3 output
    """
    if not video.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename")

    suffix = os.path.splitext(video.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(await video.read())
        temp_path = f.name

    try:
        logger.info(f"Full pipeline analysis: '{video.filename}' → temp {temp_path}")

        # ── Phase 1: Accident Model ──────────────────────────────────────────
        detector = get_accident_detector()
        try:
            accident_result = detector.predict_video(temp_path)
            if accident_result.videoMetadata:
                accident_result.videoMetadata.filename = video.filename
            accident_dict = accident_result.model_dump()
        except (VideoValidationError, VideoProcessingError) as e:
            raise HTTPException(status_code=400, detail=f"Video rejected: {str(e)}")

        # ── Phase 2: YOLO Visual Evidence ─────────────────────────────────────
        yolo = get_yolo_detector()
        yolo_result = yolo.analyze_video(temp_path)
        yolo_dict = yolo_result.model_dump()
        # Strip base64 thumbnail from API response (large payload)
        yolo_dict.pop("annotatedThumbnail", None)

        # ── Phase 3: Gemini Semantic Analysis ─────────────────────────────────
        gemini = get_gemini_analyzer()
        gemini_result = gemini.analyze_video(temp_path)
        gemini_dict = gemini_result.model_dump()

        # ── Phase 4: Evidence Fusion ───────────────────────────────────────────
        fused = fuse_evidence(
            accident_detection=accident_dict,
            yolo_evidence=yolo_dict,
            gemini_analysis=gemini_dict,
        )
        fused_dict = fused.model_dump()

        logger.info(
            f"Full pipeline complete: detected={fused.incidentDetected} "
            f"confidence={fused.confidence:.3f} severity={fused.severity}"
        )

        return {
            "fusedAssessment": fused_dict,
            "accidentDetection": accident_dict,
            "yoloEvidence": yolo_dict,
            "geminiAnalysis": gemini_dict,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Full pipeline error for '{video.filename}': {e}")
        raise HTTPException(status_code=500, detail=f"Intelligence pipeline failed: {str(e)}")
    finally:
        try:
            os.remove(temp_path)
        except Exception:
            pass


@app.post(
    "/analyze/full/path",
    summary="[Full Pipeline] Accident + YOLO + Gemini + Fusion — server-side file path",
)
async def analyze_file_full_pipeline(payload: VideoAnalysisFileRequest) -> Dict[str, Any]:
    """Same full pipeline but accepts a server-side file path instead of an upload."""
    temp_path = payload.videoPath
    if not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail=f"File not found: {temp_path}")

    try:
        detector = get_accident_detector()
        accident_result = detector.predict_video(temp_path)
        accident_dict = accident_result.model_dump()

        yolo = get_yolo_detector()
        yolo_result = yolo.analyze_video(temp_path)
        yolo_dict = yolo_result.model_dump()
        yolo_dict.pop("annotatedThumbnail", None)

        gemini = get_gemini_analyzer()
        gemini_result = gemini.analyze_video(temp_path)
        gemini_dict = gemini_result.model_dump()

        fused = fuse_evidence(
            accident_detection=accident_dict,
            yolo_evidence=yolo_dict,
            gemini_analysis=gemini_dict,
        )

        return {
            "fusedAssessment": fused.model_dump(),
            "accidentDetection": accident_dict,
            "yoloEvidence": yolo_dict,
            "geminiAnalysis": gemini_dict,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Full pipeline path error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8001))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"HACKWELL Intelligence Service on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
