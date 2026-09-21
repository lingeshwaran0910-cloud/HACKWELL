"""
Pydantic schemas for Gemini Video Semantic Understanding evidence in SafeCity AI.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class GeminiVideoAnalysis(BaseModel):
    collisionObserved: bool = Field(..., description="Whether a physical collision/crash is directly visible in footage")
    approximateEventTimeSec: Optional[float] = Field(None, description="Approximate timestamp in seconds of collision event")
    vehiclesVisible: int = Field(0, description="Estimated number of vehicles directly visible in footage")
    peopleVisible: int = Field(0, description="Estimated number of people directly visible in footage")
    roadObstructionObserved: bool = Field(False, description="Whether traffic lanes appear obstructed or blocked")
    smokeObserved: bool = Field(False, description="Whether visible smoke plumes are present")
    fireObserved: bool = Field(False, description="Whether open flames/fire are directly visible")
    overturnedVehicleObserved: bool = Field(False, description="Whether an overturned, flipped, or rolled vehicle is observed")
    sceneClarity: str = Field("medium", description="Clarity rating: high | medium | low")
    occlusion: str = Field("low", description="Visual obstruction level: high | moderate | low | none")
    ambiguity: str = Field("low", description="Ambiguity of scene events: high | medium | low")
    observations: List[str] = Field(default_factory=list, description="Factual, grounded observations about visible scene")
    uncertainties: List[str] = Field(default_factory=list, description="Explicit uncertainties or unseen aspects")
    status: str = Field("completed", description="Analysis status: completed | unavailable | error")
    modelName: str = Field("gemini-2.5-flash", description="Gemini model used for analysis")
    errorMessage: Optional[str] = Field(None, description="Error detail if semantic analysis failed or was bypassed")
