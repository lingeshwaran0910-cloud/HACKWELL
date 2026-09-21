"""
Deterministic response requirement and resource matching rules for SafeCity AI.
Recommends emergency response configurations for human operator review without auto-dispatching.
"""

from typing import List, Dict, Any
from fusion.schemas import ResponseRequirement


def determine_response_requirement(
    is_incident: bool,
    severity: str,
    vehicle_count: int,
    people_count: int,
    road_blocked: bool,
    smoke_observed: bool,
    fire_observed: bool,
    overturned_vehicle: bool,
) -> ResponseRequirement:
    """
    Evaluates incident physical factors and deterministically produces
    recommended response unit categories and priority for human approval.
    """
    if not is_incident:
        return ResponseRequirement(
            priority="LOW",
            recommendedResponseTypes=[],
            reason="No active incident or hazard detected; emergency dispatch not recommended.",
        )

    recommended_types: List[str] = []
    reasons: List[str] = []

    # 1. Traffic Police requirement: any vehicle collision or road obstruction
    if vehicle_count > 0 or road_blocked:
        recommended_types.append("POLICE_TRAFFIC")
        reasons.append("Police/traffic unit needed for perimeter securing, traffic redirection, and incident logging")

    # 2. Fire & Rescue requirement: fire, smoke, rollover, entrapment hazard
    if fire_observed or smoke_observed or overturned_vehicle:
        recommended_types.append("FIRE_RESCUE")
        if fire_observed:
            reasons.append("Fire/rescue unit required for active suppression of visible flames")
        elif smoke_observed:
            reasons.append("Fire/rescue unit required for smoke hazard mitigation and thermal inspection")
        elif overturned_vehicle:
            reasons.append("Heavy rescue apparatus required for vehicle stabilization and extrication capability")

    # 3. Medical Ambulance requirement: high impact collision, people in roadway, or rollover
    # Strictly observation-based precaution, NOT a medical diagnosis
    if severity in ("CRITICAL", "HIGH") or people_count > 0 or overturned_vehicle or vehicle_count >= 2:
        recommended_types.append("AMBULANCE")
        if people_count > 0:
            reasons.append(f"Ambulance recommended as precautionary response due to {people_count} person(s) observed in roadway")
        elif overturned_vehicle:
            reasons.append("Ambulance recommended on standby due to high-energy rollover dynamic")
        else:
            reasons.append(f"Ambulance recommended on standby due to {severity.lower()} severity impact potential")

    # Priority mapping
    priority = severity if severity in ("CRITICAL", "HIGH", "MEDIUM", "LOW") else "MEDIUM"
    combined_reason = "; ".join(reasons) + "."

    return ResponseRequirement(
        priority=priority,  # type: ignore
        recommendedResponseTypes=recommended_types,  # type: ignore
        reason=combined_reason,
    )
