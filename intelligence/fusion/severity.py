"""
Deterministic incident severity assessment for SafeCity AI.
Evaluates physical hazard factors without speculating on medical diagnoses.
"""

from typing import Dict, Any, List, Tuple


def evaluate_severity(
    is_incident: bool,
    vehicle_count: int,
    people_count: int,
    road_blocked: bool,
    smoke_observed: bool,
    fire_observed: bool,
    overturned_vehicle: bool,
    is_stationary_cluster: bool = False,
) -> Tuple[str, List[str]]:
    """
    Deterministically computes incident severity level: LOW | MEDIUM | HIGH | CRITICAL.
    Strictly forbids speculative medical diagnosis from imagery alone.
    """
    if not is_incident:
        return "LOW", ["No active collision or hazardous road incident detected"]

    score = 25  # Base score for suspected/confirmed vehicle incident
    reasons = []

    # 1. Fire / Smoke hazard factors
    if fire_observed:
        score += 50
        reasons.append("Active open fire/flames observed at scene")
    elif smoke_observed:
        score += 25
        reasons.append("Visible smoke plume observed around vehicle")

    # 2. Rollover / Overturned vehicle
    if overturned_vehicle:
        score += 35
        reasons.append("Vehicle rollover or overturned orientation detected")

    # 3. Multi-vehicle involvement
    if vehicle_count >= 3:
        score += 25
        reasons.append(f"Multiple vehicles involved ({vehicle_count} vehicles visible)")
    elif vehicle_count == 2:
        score += 15
        reasons.append("Two vehicles involved in collision impact")

    # 4. People exposure in roadway (visual presence only, NOT diagnosis)
    if people_count >= 2:
        score += 20
        reasons.append(f"Multiple pedestrians/occupants ({people_count}) observed in immediate roadway proximity")
    elif people_count == 1:
        score += 10
        reasons.append("Pedestrian/occupant observed near incident area")

    # 5. Road blockage and traffic obstruction
    if road_blocked:
        score += 15
        reasons.append("Traffic lanes visibly obstructed, presenting secondary collision risk")

    if is_stationary_cluster:
        score += 10
        reasons.append("Persistent post-impact vehicle stoppage detected in active roadway")

    # Final severity band mapping
    if score >= 75:
        severity = "CRITICAL"
    elif score >= 50:
        severity = "HIGH"
    elif score >= 30:
        severity = "MEDIUM"
    else:
        severity = "LOW"

    return severity, reasons
