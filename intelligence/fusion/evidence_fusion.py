"""
HACKWELL Evidence Fusion Engine — Phase 4.
Combines accident model, YOLO visual evidence, Gemini semantic analysis,
and video quality metrics into a single deterministic explainable incident assessment.
"""

import sys
import os
import math
import logging
from typing import Dict, Any, List, Optional, Tuple

# Allow running from the fusion directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import FusedIncidentAssessment, ResponseRequirement
from credibility import evaluate_evidence_quality, evaluate_credibility
from severity import evaluate_severity
from rules import determine_response_requirement

logger = logging.getLogger("EvidenceFusion")
logger.setLevel(logging.INFO)


def fuse_evidence(
    accident_detection: Dict[str, Any],
    yolo_evidence: Dict[str, Any],
    gemini_analysis: Dict[str, Any],
) -> FusedIncidentAssessment:
    """
    Fuses multi-source video evidence into a single, deterministic, explainable incident assessment.

    Inputs:
      - accident_detection: AccidentDetectionResponse dict from jatinmehra/Accident-Detection-using-Dashcam
      - yolo_evidence: AggregatedVisualEvidence dict from Ultralytics YOLO
      - gemini_analysis: GeminiVideoAnalysis dict from Gemini semantic analysis

    Returns FusedIncidentAssessment with confidence, credibility, severity, response requirement, etc.
    """

    # ── Accident Model Signals ─────────────────────────────────────────────
    collision_prob = float(accident_detection.get("collisionProbability", 0.0))
    model_incident_detected = bool(accident_detection.get("incidentDetected", False))
    model_suspected_time = accident_detection.get("suspectedEventTimeSec")
    model_name = accident_detection.get("model", {}).get("name", "unknown")
    sampled_frames = int(accident_detection.get("sampledFrameCount", 0))
    video_meta = accident_detection.get("videoMetadata") or {}
    video_duration = float(accident_detection.get("videoDurationSec", 0.0))
    total_frames = int(accident_detection.get("frameCount", 0))

    if isinstance(video_meta, dict) and not video_meta.get("durationSec"):
        video_meta = {
            "durationSec": video_duration,
            "totalFrames": total_frames,
            "fps": accident_detection.get("fps", 0.0),
            "width": accident_detection.get("width", 0),
            "height": accident_detection.get("height", 0),
            "filename": accident_detection.get("filename", ""),
        }

    # ── YOLO Visual Signals ────────────────────────────────────────────────
    vehicle_count = int(yolo_evidence.get("estimatedVisibleVehicleCount", 0))
    people_count = int(yolo_evidence.get("estimatedPeopleCount", 0))
    detected_classes = yolo_evidence.get("detectedClasses", [])
    tracking_available = bool(yolo_evidence.get("trackingAvailable", False))
    movement_obs = yolo_evidence.get("movementObservations", [])

    stationary_vehicles = sum(
        1 for m in movement_obs
        if m.get("className") in {"car", "bus", "truck", "motorcycle"}
        and m.get("isStationary", False)
    )
    has_stationary_cluster = stationary_vehicles >= 2

    # ── Gemini Semantic Signals ────────────────────────────────────────────
    gemini_status = gemini_analysis.get("status", "unavailable")
    gemini_collision = bool(gemini_analysis.get("collisionObserved", False))
    gemini_event_time = gemini_analysis.get("approximateEventTimeSec")
    road_blocked = bool(gemini_analysis.get("roadObstructionObserved", False))
    smoke_observed = bool(gemini_analysis.get("smokeObserved", False))
    fire_observed = bool(gemini_analysis.get("fireObserved", False))
    overturned = bool(gemini_analysis.get("overturnedVehicleObserved", False))
    gemini_uncertainties = gemini_analysis.get("uncertainties", [])
    gemini_observations = gemini_analysis.get("observations", [])

    # ── Evidence Quality ───────────────────────────────────────────────────
    evidence_quality, quality_reasons = evaluate_evidence_quality(
        video_metadata=video_meta,
        gemini_analysis=gemini_analysis,
        sampled_frame_count=sampled_frames,
    )

    # ── Contradiction Detection ────────────────────────────────────────────
    model_says_accident = collision_prob >= 0.60
    gemini_active = gemini_status == "completed"
    has_contradiction = (
        gemini_active and
        model_says_accident != gemini_collision and
        abs(collision_prob - (1.0 if gemini_collision else 0.0)) > 0.30
    )

    # ── Credibility ────────────────────────────────────────────────────────
    credibility, credibility_reasons = evaluate_credibility(
        evidence_quality=evidence_quality,
        accident_model_score=collision_prob,
        yolo_evidence=yolo_evidence,
        gemini_analysis=gemini_analysis,
        has_contradiction=has_contradiction,
    )

    # ── Incident Confidence (deterministic formula) ────────────────────────
    # Weight model score (0.40), YOLO corroboration (0.25), Gemini agreement (0.20),
    # quality factor (0.15), minus penalties for contradiction and poor evidence
    model_weight = collision_prob * 0.40

    yolo_weight = 0.0
    if vehicle_count >= 2:
        yolo_weight = 0.25
    elif vehicle_count == 1:
        yolo_weight = 0.12

    gemini_weight = 0.0
    if gemini_active:
        gemini_weight = 0.20 if gemini_collision else -0.10

    quality_factor = {"HIGH": 1.0, "MEDIUM": 0.75, "LOW": 0.5}.get(evidence_quality, 0.5)
    quality_weight = 0.15 * quality_factor

    contradiction_penalty = -0.15 if has_contradiction else 0.0

    raw_confidence = model_weight + yolo_weight + gemini_weight + quality_weight + contradiction_penalty
    confidence = round(max(0.0, min(1.0, raw_confidence)), 3)

    # ── Incident Detection Classification ─────────────────────────────────
    if confidence >= 0.65 or (collision_prob >= 0.75 and credibility != "LOW"):
        incident_detected = "YES"
    elif confidence >= 0.40 and credibility != "LOW":
        incident_detected = "POSSIBLE"
    elif collision_prob >= 0.50 and evidence_quality == "LOW":
        incident_detected = "POSSIBLE"
    else:
        incident_detected = "NO"

    # ── Severity ──────────────────────────────────────────────────────────
    is_incident = incident_detected in ("YES", "POSSIBLE")
    severity, severity_reasons = evaluate_severity(
        is_incident=is_incident,
        vehicle_count=vehicle_count,
        people_count=people_count,
        road_blocked=road_blocked,
        smoke_observed=smoke_observed,
        fire_observed=fire_observed,
        overturned_vehicle=overturned,
        is_stationary_cluster=has_stationary_cluster,
    )

    # ── Response Requirement ───────────────────────────────────────────────
    response = determine_response_requirement(
        is_incident=is_incident,
        severity=severity,
        vehicle_count=vehicle_count,
        people_count=people_count,
        road_blocked=road_blocked,
        smoke_observed=smoke_observed,
        fire_observed=fire_observed,
        overturned_vehicle=overturned,
    )

    # ── Suspected Event Timestamp ──────────────────────────────────────────
    # Prefer Gemini if available, fallback to accident model
    suspected_time = None
    if gemini_event_time is not None and gemini_active:
        suspected_time = round(float(gemini_event_time), 2)
    elif model_suspected_time is not None:
        suspected_time = round(float(model_suspected_time), 2)

    # ── Supporting Evidence ────────────────────────────────────────────────
    supporting: List[str] = []
    if collision_prob >= 0.65:
        supporting.append(
            f"Accident classification model reports {round(collision_prob * 100, 1)}% collision probability from {sampled_frames} sampled frames"
        )
    if vehicle_count >= 2:
        supporting.append(f"YOLO visual detector confirmed {vehicle_count} vehicles visible at scene")
    if people_count > 0:
        supporting.append(f"{people_count} person(s) observed in roadway proximity")
    if gemini_active and gemini_collision:
        supporting.append("Gemini semantic analyzer independently corroborates collision observation")
    if road_blocked:
        supporting.append("Visible lane blockage creates ongoing collision risk for approaching traffic")
    if overturned:
        supporting.append("Overturned vehicle geometry directly observed in scene")
    if smoke_observed:
        supporting.append("Visible smoke plume indicates post-impact thermal event")
    if fire_observed:
        supporting.append("Active flames detected — CRITICAL fire hazard")
    if has_stationary_cluster:
        supporting.append("Cluster of vehicles has been stationary persistently across multiple video frames")
    if detected_classes:
        supporting.append(f"Detected object classes in footage: {', '.join(detected_classes)}")
    supporting.extend(quality_reasons[:2])
    supporting.extend(gemini_observations[:3])

    # ── Conflicting Evidence ───────────────────────────────────────────────
    conflicting: List[str] = []
    if has_contradiction:
        conflicting.append(
            f"Accident model ({round(collision_prob * 100, 1)}% collision) conflicts with "
            f"Gemini semantic observation ({'collision observed' if gemini_collision else 'no collision observed'})"
        )
    if collision_prob < 0.50 and model_incident_detected:
        conflicting.append("Model collision score below operational threshold despite positive classification")
    if vehicle_count == 0 and collision_prob >= 0.60:
        conflicting.append("Accident model signals collision but YOLO found no vehicles in sampled frames")

    # ── Uncertainties ──────────────────────────────────────────────────────
    uncertainties: List[str] = []
    if evidence_quality == "LOW":
        uncertainties.append("Degraded video quality limits reliable scene inspection")
    if gemini_status != "completed":
        uncertainties.append(
            f"Gemini semantic analyzer was {gemini_status} — cross-verification not available"
        )
    if vehicle_count == 0:
        uncertainties.append("No vehicles confirmed by object detection; collision may occur outside camera angle")
    uncertainties.extend(gemini_uncertainties[:3])

    # ── Fusion Metrics (debugging transparency) ────────────────────────────
    fusion_metrics = {
        "model_weight": round(model_weight, 3),
        "yolo_weight": round(yolo_weight, 3),
        "gemini_weight": round(gemini_weight, 3),
        "quality_weight": round(quality_weight, 3),
        "contradiction_penalty": round(contradiction_penalty, 3),
        "raw_confidence": round(raw_confidence, 3),
        "has_contradiction": has_contradiction,
        "gemini_active": gemini_active,
        "model_name": model_name,
        "credibility_reasons": credibility_reasons,
        "severity_reasons": severity_reasons,
    }

    return FusedIncidentAssessment(
        incidentDetected=incident_detected,  # type: ignore
        incidentType="vehicle_collision" if is_incident else "no_collision",
        confidence=confidence,
        modelScore=round(collision_prob, 4),
        credibility=credibility,  # type: ignore
        evidenceQuality=evidence_quality,  # type: ignore
        severity=severity,  # type: ignore
        suspectedEventTimeSec=suspected_time,
        supportingEvidence=supporting,
        conflictingEvidence=conflicting,
        uncertainties=uncertainties,
        responseRequirement=response,
        fusionMetrics=fusion_metrics,
    )
