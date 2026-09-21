"""
Schemas for YOLO visual evidence extraction and object tracking in SafeCity AI.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BoundingBox(BaseModel):
    x1: float = Field(..., description="Top-left x coordinate in pixels")
    y1: float = Field(..., description="Top-left y coordinate in pixels")
    x2: float = Field(..., description="Bottom-right x coordinate in pixels")
    y2: float = Field(..., description="Bottom-right y coordinate in pixels")


class DetectedObject(BaseModel):
    className: str = Field(..., description="COCO class name, e.g. car, person, motorcycle, bus, truck")
    confidence: float = Field(..., description="Model confidence score between 0.0 and 1.0")
    bbox: BoundingBox = Field(..., description="Bounding box pixel coordinates")
    trackingId: Optional[int] = Field(None, description="Persistent tracking ID across frames if tracking is active")


class FrameObservation(BaseModel):
    frameIndex: int = Field(..., description="0-indexed sampled frame sequence position")
    timestampSec: float = Field(..., description="Timestamp in seconds relative to video start")
    detections: List[DetectedObject] = Field(default_factory=list, description="All valid detected objects in this frame")
    vehicleCount: int = Field(0, description="Count of vehicles in this frame (car, bus, truck, motorcycle, bicycle)")
    peopleCount: int = Field(0, description="Count of persons in this frame")


class ObjectPersistence(BaseModel):
    trackingId: Optional[int] = Field(None, description="Assigned tracking ID")
    className: str = Field(..., description="Detected object class")
    firstSeenSec: float = Field(..., description="Timestamp of first observation in seconds")
    lastSeenSec: float = Field(..., description="Timestamp of last observation in seconds")
    frameCount: int = Field(..., description="Number of sampled frames this object appeared in")
    persistenceRatio: float = Field(..., description="Fraction of frames from first to last seen in which object appeared")
    avgConfidence: float = Field(..., description="Average detection confidence score")


class MovementObservation(BaseModel):
    trackingId: int = Field(..., description="Tracking ID of object")
    className: str = Field(..., description="Object class name")
    displacementPixels: float = Field(..., description="Total pixel distance moved across observation window")
    isStationary: bool = Field(..., description="Whether object remained essentially stationary (< threshold displacement)")
    movementHint: str = Field("unknown", description="Descriptive movement state: moving | stationary | decelerated | stopped")


class VisionModelInfo(BaseModel):
    name: str = "yolov8n"
    source: str = "Ultralytics"
    status: str = "loaded"


class AggregatedVisualEvidence(BaseModel):
    estimatedVisibleVehicleCount: int = Field(..., description="Estimated distinct vehicles visible across scene")
    estimatedPeopleCount: int = Field(..., description="Estimated distinct persons visible across scene")
    peakVehicleCount: int = Field(0, description="Maximum vehicles visible simultaneously in any single frame")
    peakPeopleCount: int = Field(0, description="Maximum people visible simultaneously in any single frame")
    detectedClasses: List[str] = Field(default_factory=list, description="Distinct supported classes detected in footage")
    objectPersistence: List[ObjectPersistence] = Field(default_factory=list, description="Temporal persistence per tracked entity")
    movementObservations: List[MovementObservation] = Field(default_factory=list, description="Movement and displacement dynamics")
    frameObservations: List[FrameObservation] = Field(default_factory=list, description="Frame-by-frame observation logs")
    trackingAvailable: bool = Field(False, description="Whether multi-object tracking was actively computed")
    annotatedFrameBase64: Optional[str] = Field(None, description="Base64 JPEG thumbnail of peak frame with bounding boxes")
    model: VisionModelInfo = Field(default_factory=VisionModelInfo)
    processingStatus: str = Field("completed", description="Status: completed | partial | failed")
    errorMessage: Optional[str] = Field(None, description="Error detail if vision processing degraded")
