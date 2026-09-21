"""
FastAPI service exposing the SafeCity / HACKWELL Pretrained Accident Detector API.
"""

import os
import tempfile
import logging
from typing import Dict, Any
from fastapi import FastAPI, UploadFile, File, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from schemas import (
    AccidentDetectionResponse,
    VideoAnalysisFileRequest,
)
from detector import AccidentDetector
from video_processor import VideoValidationError, VideoProcessingError

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("AccidentDetectorAPI")

app = FastAPI(
    title="SafeCity AI - Pretrained Accident Video Detector API",
    description=(
        "Pretrained dashcam accident & vehicle collision detection microservice for SafeCity AI. "
        "Powered by Hugging Face 'jatinmehra/Accident-Detection-using-Dashcam'."
    ),
    version="1.0.0",
)

# Enable CORS for local backend/frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global lazy detector instance
detector = AccidentDetector()


@app.on_event("startup")
def startup_event():
    """Attempt non-blocking model pre-warm at startup."""
    logger.info("Initializing SafeCity Accident Detector Service...")
    # Pre-warm model in background thread or non-blocking check
    detector.load_model()


@app.get("/health", summary="Check service health and model status")
def health_check() -> Dict[str, Any]:
    """Returns microservice health and model loading state."""
    model_loaded = detector._is_loaded
    return {
        "status": "ONLINE",
        "service": "accident-detector",
        "model": {
            "name": detector.model_name,
            "source": "HuggingFace",
            "loaded": model_loaded,
            "status": "LOADED" if model_loaded else "HEURISTIC_FALLBACK",
            "loadError": detector._load_error if not model_loaded else None,
        },
    }


@app.post(
    "/analyze",
    response_model=AccidentDetectionResponse,
    summary="Analyze uploaded MP4 video for vehicle collision evidence",
)
async def analyze_video(video: UploadFile = File(...)) -> AccidentDetectionResponse:
    """
    Upload an MP4 video file for automated accident detection analysis.
    """
    if not video.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file must have a valid filename",
        )

    # Save uploaded file to temp file securely
    suffix = os.path.splitext(video.filename)[1] or ".mp4"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_path = temp_file.name
        content = await video.read()
        temp_file.write(content)

    try:
        logger.info(f"Received video upload '{video.filename}', processing temp file: {temp_path}")
        response = detector.predict_video(temp_path)
        # Override metadata filename with original uploaded filename
        response.videoMetadata.filename = video.filename
        return response
    except VideoValidationError as e:
        logger.warning(f"Video validation error for '{video.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except VideoProcessingError as e:
        logger.error(f"Video processing error for '{video.filename}': {e}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception(f"Unhandled exception during video analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Accident detector service failed: {str(e)}",
        )
    finally:
        # Clean up temporary upload file
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


@app.post(
    "/analyze-file",
    response_model=AccidentDetectionResponse,
    summary="Analyze local MP4 video file path for vehicle collision evidence",
)
def analyze_video_file(payload: VideoAnalysisFileRequest) -> AccidentDetectionResponse:
    """
    Analyze a server-side local MP4 video file path.
    """
    try:
        logger.info(f"Received analyze-file request for path: {payload.videoPath}")
        return detector.predict_video(payload.videoPath)
    except VideoValidationError as e:
        logger.warning(f"Video validation error: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except VideoProcessingError as e:
        logger.error(f"Video processing error: {e}")
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except Exception as e:
        logger.exception(f"Unhandled exception during file analysis: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Accident detector service failed: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    logger.info(f"Starting Accident Detector service on http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)
