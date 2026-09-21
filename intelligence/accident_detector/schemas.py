"""
Pydantic schemas for the SafeCity / HACKWELL Accident Detector Service.
"""

from typing import Optional
from pydantic import BaseModel, Field


class ModelInfo(BaseModel):
    name: str = "Accident-Detection-using-Dashcam"
    source: str = "HuggingFace"
    status: str = "loaded"


class VideoMetadata(BaseModel):
    durationSec: float = Field(..., description="Total video duration in seconds")
    totalFrames: int = Field(..., description="Total frame count in video")
    fps: float = Field(..., description="Frames per second")
    width: int = Field(..., description="Video frame width in pixels")
    height: int = Field(..., description="Video frame height in pixels")
    filename: str = Field(..., description="Original or target video filename")


class ProcessingInfo(BaseModel):
    sampledFrameCount: int = Field(..., description="Number of frames sampled for model inference")
    inferenceDurationSec: float = Field(..., description="Inference execution duration in seconds")
    status: str = Field(..., description="Processing status: completed | partial | failed")
    modelStatus: str = Field(..., description="Model execution status: loaded | heuristic_fallback | error")
    errorMessage: Optional[str] = Field(None, description="Detailed error message if processing failed or degraded")


class AccidentDetectionResponse(BaseModel):
    incidentDetected: bool = Field(..., description="Whether a vehicle collision / accident event was detected")
    incidentType: str = Field("vehicle_collision", description="Identified event type: vehicle_collision | no_collision | unknown")
    collisionProbability: float = Field(..., description="Model probability score for collision/accident")
    normalProbability: float = Field(..., description="Model probability score for normal driving")
    suspectedEventTimeSec: Optional[float] = Field(None, description="Timestamp in seconds where collision signal peaked")
    videoDurationSec: float = Field(..., description="Total duration of video in seconds")
    frameCount: int = Field(..., description="Total frame count of the video")
    sampledFrameCount: int = Field(..., description="Number of sampled frames analyzed")
    processingStatus: str = Field("completed", description="Status of video processing: completed | failed")
    model: ModelInfo = Field(default_factory=ModelInfo)
    videoMetadata: Optional[VideoMetadata] = None
    processing: Optional[ProcessingInfo] = None


class VideoAnalysisFileRequest(BaseModel):
    videoPath: str = Field(..., description="Absolute or relative path to local MP4 video file")
