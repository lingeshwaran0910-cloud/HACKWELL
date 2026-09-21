"""
Evidence Quality and Operational Credibility evaluation engine for SafeCity AI.
Deterministically computes evidence quality and operational credibility with explainable reasons.
"""

from typing import Dict, Any, List, Tuple


def evaluate_evidence_quality(
    video_metadata: Dict[str, Any],
    gemini_analysis: Dict[str, Any],
    sampled_frame_count: int,
) -> Tuple[str, List[str]]:
    """
    Evaluates technical quality of sensory and visual input.
    Returns (quality_level: HIGH | MEDIUM | LOW, quality_reasons: List[str]).
    """
    reasons = []
    score = 100

    # 1. Video resolution & frame counts
    height = video_metadata.get("height", 0)
    width = video_metadata.get("width", 0)
    total_frames = video_metadata.get("totalFrames", 0)

    if height >= 720 and width >= 1280:
        reasons.append("HD video resolution provides clear vehicle boundary inspection")
    elif height < 360 or width < 480:
        score -= 25
        reasons.append("Low video resolution degrades license plate and object boundary definition")

    if sampled_frame_count >= 16:
        reasons.append(f"Adequate frame sampling window ({sampled_frame_count} frames)")
    elif sampled_frame_count < 8:
        score -= 20
        reasons.append(f"Sparse frame sampling ({sampled_frame_count} frames) may miss brief collision transients")

    # 2. Scene clarity & visual occlusion
    clarity = gemini_analysis.get("sceneClarity", "medium").lower()
    occlusion = gemini_analysis.get("occlusion", "low").lower()

    if clarity == "high":
        reasons.append("High scene lighting and visual clarity")
    elif clarity == "low":
        score -= 30
        reasons.append("Poor scene lighting or camera distortion impairs visual inspection")

    if occlusion in ("high", "severe"):
        score -= 35
        reasons.append("Substantial visual occlusion obscures point of impact")
    elif occlusion == "moderate":
        score -= 15
        reasons.append("Moderate visual obstruction in foreground/background")

    # Band mapping
    if score >= 75:
        level = "HIGH"
    elif score >= 50:
        level = "MEDIUM"
    else:
        level = "LOW"

    return level, reasons


def evaluate_credibility(
    evidence_quality: str,
    accident_model_score: float,
    yolo_evidence: Dict[str, Any],
    gemini_analysis: Dict[str, Any],
    has_contradiction: bool,
) -> Tuple[str, List[str]]:
    """
    Evaluates operational credibility: whether the evidence package is sufficiently
    reliable for emergency command-center consideration.
    Returns (credibility_level: HIGH | MEDIUM | LOW, credibility_reasons: List[str]).
    """
    reasons = []
    points = 0

    # 1. Quality baseline
    if evidence_quality == "HIGH":
        points += 30
        reasons.append("Solid underlying technical video quality")
    elif evidence_quality == "MEDIUM":
        points += 15
        reasons.append("Acceptable video quality with minor visual limitations")
    else:
        points += 0
        reasons.append("Degraded video quality reduces operational credibility")

    # 2. Multi-source agreement
    gemini_status = gemini_analysis.get("status", "unavailable")
    gemini_collision = gemini_analysis.get("collisionObserved", False)
    accident_detected_by_model = accident_model_score >= 0.65

    # Check vehicle presence
    vehicle_count = yolo_evidence.get("estimatedVisibleVehicleCount", 0)
    has_multi_vehicles = vehicle_count >= 2

    if accident_detected_by_model and gemini_status == "completed" and gemini_collision:
        points += 40
        reasons.append("Strong multi-source agreement between accident classifier and semantic vision analyzer")
    elif accident_detected_by_model and gemini_status != "completed":
        points += 20
        reasons.append("Accident model detected collision; semantic vision source was unavailable for cross-verification")
    elif not accident_detected_by_model and gemini_status == "completed" and not gemini_collision:
        points += 40
        reasons.append("Independent sources agree that no collision occurred")
    elif accident_detected_by_model != gemini_collision and gemini_status == "completed":
        points -= 20
        reasons.append("Direct disagreement between specialized accident model and semantic observation source")

    # 3. Object persistence and physical corroboration
    if has_multi_vehicles:
        points += 20
        reasons.append(f"YOLO visual detector confirmed presence of multiple vehicles ({vehicle_count}) at scene")
    elif vehicle_count == 1:
        points += 10
        reasons.append("Single vehicle observed in scene")
    else:
        reasons.append("No vehicles confirmed by object detector")

    # 4. Contradiction penalty
    if has_contradiction:
        points -= 30
        reasons.append("Presence of conflicting signals reduces overall credibility")

    # Credibility band
    if points >= 70:
        level = "HIGH"
    elif points >= 40:
        level = "MEDIUM"
    else:
        level = "LOW"

    return level, reasons
