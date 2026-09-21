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
if THIS_DIR not in sys.path:
    sys.path.insert(0, THIS_DIR)

for _p in [
    os.path.join(THIS_DIR, "accident_detector"),
    os.path.join(THIS_DIR, "vision"),
    os.path.join(THIS_DIR, "gemini"),
    os.path.join(THIS_DIR, "fusion"),
]:
    if _p not in sys.path:
        sys.path.append(_p)

from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from accident_detector.detector import AccidentDetector
from accident_detector.schemas import AccidentDetectionResponse, VideoAnalysisFileRequest
from accident_detector.video_processor import VideoProcessor, VideoValidationError, VideoProcessingError
from vision.yolo_detector import YOLODetector
from gemini.video_analyzer import GeminiVideoAnalyzer
from fusion.evidence_fusion import fuse_evidence
from fusion.schemas import FusedIncidentAssessment  # type: ignore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("HACKWELLIntelligenceService")

app = FastAPI(
    title="HACKWELL SafeCity AI — Unified Intelligence Service",
    description=(
        "End-to-end video intelligence pipeline. "
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


def _process_full_pipeline(temp_path: str, filename: str) -> Dict[str, Any]:
    """
    Executes multi-source AI video pipeline with robust model fallback handling:
      1. Video frame sampling via OpenCV VideoProcessor
      2. Phase 1: Pretrained Accident Classification Model
      3. Phase 2: Ultralytics YOLO Visual Object & Tracking Evidence
      4. Phase 3: Gemini Semantic Video Analyzer (when API key available)
      5. Phase 4: Deterministic Evidence Fusion
    """
    video_processor = VideoProcessor()

    try:
        metadata = video_processor.inspect_metadata(temp_path)
        metadata["filename"] = filename
        frames, timestamps = video_processor.sample_frames(temp_path, num_frames=16)
    except (VideoValidationError, VideoProcessingError) as e:
        raise HTTPException(status_code=400, detail=f"Video rejected: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Frame extraction failed: {str(e)}")

    # ── Phase 1: Accident Detector Model ──────────────────────────────────
    accident_dict: Dict[str, Any] = {}
    try:
        detector = get_accident_detector()
        accident_result = detector.predict_video(temp_path)
        if accident_result.videoMetadata:
            accident_result.videoMetadata.filename = filename
        accident_dict = accident_result.model_dump()
    except Exception as e:
        logger.warning(f"Accident detector fallback/error: {e}")
        accident_dict = {
            "status": "error",
            "errorMessage": str(e),
            "collisionProbability": 0.0,
            "incidentDetected": False,
            "videoDurationSec": metadata.get("durationSec", 0.0),
            "frameCount": metadata.get("totalFrames", 0),
            "sampledFrameCount": len(frames),
        }

    # ── Phase 2: YOLO Visual Object Evidence ──────────────────────────────
    yolo_dict: Dict[str, Any] = {}
    try:
        yolo = get_yolo_detector()
        yolo_result = yolo.analyze_frames(frames, timestamps)
        yolo_dict = yolo_result.model_dump()
        yolo_dict.pop("annotatedFrameBase64", None)
    except Exception as e:
        logger.warning(f"YOLO detector fallback/error: {e}")
        yolo_dict = {
            "status": "error",
            "errorMessage": str(e),
            "estimatedVisibleVehicleCount": 0,
            "estimatedPeopleCount": 0,
            "detectedClasses": [],
            "movementObservations": [],
        }

    # ── Phase 3: Gemini Semantic Analysis ──────────────────────────────────
    gemini_dict: Dict[str, Any] = {}
    try:
        gemini = get_gemini_analyzer()
        gemini_result = gemini.analyze_video_frames(frames, timestamps, metadata)
        gemini_dict = gemini_result.model_dump()
    except Exception as e:
        logger.warning(f"Gemini analyzer fallback/error: {e}")
        gemini_dict = {
            "status": "unavailable",
            "errorMessage": str(e),
            "collisionObserved": False,
            "observations": [],
            "uncertainties": [f"Gemini analysis unavailable: {e}"],
        }

    # ── All models check ───────────────────────────────────────────────────
    if (
        accident_dict.get("status") == "error"
        and yolo_dict.get("status") == "error"
        and gemini_dict.get("status") in ("error", "unavailable")
    ):
        raise HTTPException(
            status_code=503,
            detail="All AI analysis models (Accident Model, YOLO, Gemini) are currently unavailable.",
        )

    # ── Phase 4: Evidence Fusion ───────────────────────────────────────────
    fused = fuse_evidence(
        accident_detection=accident_dict,
        yolo_evidence=yolo_dict,
        gemini_analysis=gemini_dict,
    )
    fused_dict = fused.model_dump()

    scene_desc = "Normal scene without active hazards."
    if fused.incidentDetected in ("YES", "POSSIBLE"):
        scene_desc = f"{fused.incidentType.replace('_', ' ').title()} detected with {fused.severity.lower()} severity."
    elif gemini_dict.get("observations"):
        scene_desc = ". ".join(gemini_dict["observations"][:2])

    detected_objects = yolo_dict.get("detectedClasses", [])
    movement_obs = yolo_dict.get("movementObservations", [])
    activities = []
    for m in movement_obs:
        if isinstance(m, dict):
            cls_name = m.get("className", "object")
            status = "stationary" if m.get("isStationary") else "moving"
            activities.append(f"{cls_name} ({status})")

    explanation_text = fused.responseRequirement.reason if fused.responseRequirement else "Scene analysis complete."
    if fused.supportingEvidence:
        explanation_text += " " + " ".join(fused.supportingEvidence[:2])

    logger.info(
        f"Full pipeline complete for '{filename}': detected={fused.incidentDetected} "
        f"type={fused.incidentType} confidence={fused.confidence:.3f} severity={fused.severity}"
    )

    return {
        "success": True,
        "video": {
            "filename": filename,
            "duration_seconds": metadata.get("durationSec", 0.0),
            "frames_analyzed": len(frames),
        },
        "scene": {
            "description": scene_desc,
            "objects": detected_objects,
            "activities": activities,
        },
        "incident": {
            "detected": fused.incidentDetected in ("YES", "POSSIBLE"),
            "status": fused.incidentDetected,
            "type": fused.incidentType,
            "confidence": fused.confidence,
            "severity": fused.severity,
        },
        "evidence": fused.supportingEvidence,
        "explanation": explanation_text,
        "model_results": {
            "accident": accident_dict,
            "objects": yolo_dict,
            "gemini": gemini_dict,
        },
        "fusedAssessment": fused_dict,
        "accidentDetection": accident_dict,
        "yoloEvidence": yolo_dict,
        "geminiAnalysis": gemini_dict,
    }


import threading


def _warm_detectors_background():
    try:
        get_accident_detector()
        get_yolo_detector()
        get_gemini_analyzer()
        logger.info("All detectors initialized in background.")
    except Exception as e:
        logger.warning(f"Non-fatal background warm error: {e}")


@app.on_event("startup")
def startup_event():
    logger.info("HACKWELL Intelligence Service starting — background detector warming...")
    thread = threading.Thread(target=_warm_detectors_background, daemon=True)
    thread.start()


@app.get("/health", summary="Check full-pipeline service health")
def health_check() -> Dict[str, Any]:
    detector = _accident_detector
    is_loaded = detector._is_loaded if detector else False
    model_name = detector.model_name if detector else "jatinmehra/Accident-Detection-using-Dashcam"
    return {
        "status": "ONLINE",
        "service": "hackwell-intelligence",
        "version": "2.0.0",
        "components": {
            "accidentDetector": {
                "loaded": is_loaded,
                "model": model_name,
                "status": "loaded" if is_loaded else "warming_or_fallback",
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
    if not video.filename:
        raise HTTPException(status_code=400, detail="Uploaded file must have a filename")

    suffix = os.path.splitext(video.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(await video.read())
        temp_path = f.name

    try:
        logger.info(f"Full pipeline analysis: '{video.filename}' → temp {temp_path}")
        return _process_full_pipeline(temp_path, video.filename)
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
    temp_path = payload.videoPath
    if not os.path.exists(temp_path):
        raise HTTPException(status_code=404, detail=f"File not found: {temp_path}")

    filename = os.path.basename(temp_path)
    return _process_full_pipeline(temp_path, filename)


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8001))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"HACKWELL Intelligence Service on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
