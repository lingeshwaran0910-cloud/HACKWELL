"""
Pydantic schemas for the SafeCity / HACKWELL Evidence Fusion and Incident Assessment Engine.
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class ResponseRequirement(BaseModel):
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(..., description="Operational response priority level")
    recommendedResponseTypes: List[Literal["AMBULANCE", "FIRE_RESCUE", "POLICE_TRAFFIC"]] = Field(
        default_factory=list,
        description="Recommended emergency resource types for human operator review",
    )
    reason: str = Field(..., description="Grounded, deterministic rationale for the recommended resources")


class FusedIncidentAssessment(BaseModel):
    incidentDetected: Literal["YES", "NO", "POSSIBLE"] = Field(
        ..., description="Categorical incident detection state: YES | NO | POSSIBLE"
    )
    incidentType: str = Field("vehicle_collision", description="Identified incident classification")
    confidence: float = Field(..., description="Final deterministic operational confidence (0.0 to 1.0)")
    modelScore: float = Field(..., description="Raw model probability from video collision model")
    credibility: Literal["HIGH", "MEDIUM", "LOW"] = Field(
        ..., description="Operational reliability of the combined evidence package"
    )
    evidenceQuality: Literal["HIGH", "MEDIUM", "LOW"] = Field(
        ..., description="Technical quality of supporting visual and sensory observations"
    )
    severity: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = Field(
        ..., description="Deterministic incident severity rating"
    )
    suspectedEventTimeSec: Optional[float] = Field(
        None, description="Fused suspected event timestamp in seconds"
    )
    supportingEvidence: List[str] = Field(
        default_factory=list, description="Explicit factual observations that corroborate the incident"
    )
    conflictingEvidence: List[str] = Field(
        default_factory=list, description="Observations or signals that contradict the incident hypothesis"
    )
    uncertainties: List[str] = Field(
        default_factory=list, description="Known ambiguities, occlusions, or missing data sources"
    )
    responseRequirement: ResponseRequirement = Field(
        ..., description="Response unit recommendations for human operator review"
    )
    fusionMetrics: Dict[str, Any] = Field(
        default_factory=dict, description="Detailed intermediate scoring and corroboration metrics"
    )
