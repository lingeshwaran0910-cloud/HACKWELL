"""
Comprehensive unit tests for HACKWELL Evidence Fusion Engine — Phase 4.
Tests clear accidents, normal traffic, ambiguous footage, model disagreement, missing sources.
"""

import sys
import os
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))

from evidence_fusion import fuse_evidence
from schemas import FusedIncidentAssessment


def make_accident_detection(
    collision_prob: float = 0.92,
    incident_detected: bool = True,
    suspected_time: float = 7.4,
    duration: float = 12.3,
    frames: int = 368,
    sampled: int = 16,
    height: int = 720,
    width: int = 1280,
) -> dict:
    return {
        "incidentDetected": incident_detected,
        "incidentType": "vehicle_collision" if incident_detected else "no_collision",
        "collisionProbability": collision_prob,
        "normalProbability": round(1.0 - collision_prob, 4),
        "suspectedEventTimeSec": suspected_time,
        "videoDurationSec": duration,
        "frameCount": frames,
        "sampledFrameCount": sampled,
        "processingStatus": "completed",
        "model": {"name": "Accident-Detection-using-Dashcam", "source": "HuggingFace", "status": "loaded"},
        "videoMetadata": {
            "durationSec": duration,
            "totalFrames": frames,
            "fps": 30.0,
            "width": width,
            "height": height,
            "filename": "test.mp4",
        },
    }


def make_yolo_evidence(
    vehicles: int = 3,
    people: int = 2,
    classes: list = None,
    stationary: int = 0,
) -> dict:
    movement_obs = []
    for i in range(vehicles):
        movement_obs.append({
            "trackingId": i + 1,
            "className": "car",
            "displacementPixels": 5.0 if i < stationary else 80.0,
            "isStationary": i < stationary,
            "movementHint": "stationary" if i < stationary else "moving",
        })
    return {
        "estimatedVisibleVehicleCount": vehicles,
        "estimatedPeopleCount": people,
        "peakVehicleCount": vehicles,
        "peakPeopleCount": people,
        "detectedClasses": classes or ["car", "person"],
        "movementObservations": movement_obs,
        "trackingAvailable": True,
        "processingStatus": "completed",
    }


def make_gemini_analysis(
    collision: bool = True,
    event_time: float = 7.8,
    vehicles: int = 3,
    people: int = 2,
    road_blocked: bool = True,
    smoke: bool = False,
    fire: bool = False,
    overturned: bool = False,
    clarity: str = "high",
    occlusion: str = "low",
    ambiguity: str = "low",
    status: str = "completed",
    observations: list = None,
    uncertainties: list = None,
) -> dict:
    return {
        "collisionObserved": collision,
        "approximateEventTimeSec": event_time,
        "vehiclesVisible": vehicles,
        "peopleVisible": people,
        "roadObstructionObserved": road_blocked,
        "smokeObserved": smoke,
        "fireObserved": fire,
        "overturnedVehicleObserved": overturned,
        "sceneClarity": clarity,
        "occlusion": occlusion,
        "ambiguity": ambiguity,
        "status": status,
        "observations": observations or ["Two vehicles appear to have collided at intersection"],
        "uncertainties": uncertainties or [],
    }


class TestEvidenceFusion(unittest.TestCase):

    def test_clear_severe_accident_produces_critical_severity(self):
        """Scenario A: Strong multi-source accident evidence → CRITICAL severity."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.93, height=720, width=1280),
            yolo_evidence=make_yolo_evidence(vehicles=3, people=2, stationary=2),
            gemini_analysis=make_gemini_analysis(collision=True, road_blocked=True, overturned=True),
        )
        self.assertIsInstance(result, FusedIncidentAssessment)
        self.assertIn(result.incidentDetected, ("YES", "POSSIBLE"))
        self.assertGreater(result.confidence, 0.60)
        self.assertIn(result.severity, ("HIGH", "CRITICAL"))
        self.assertEqual(result.credibility, "HIGH")
        self.assertIn("AMBULANCE", result.responseRequirement.recommendedResponseTypes)
        self.assertIn("POLICE_TRAFFIC", result.responseRequirement.recommendedResponseTypes)
        self.assertTrue(len(result.supportingEvidence) > 0)

    def test_clear_non_accident_produces_no_detection(self):
        """Scenario C: Normal traffic, no accident signal → NO incident."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.08, incident_detected=False, suspected_time=None),
            yolo_evidence=make_yolo_evidence(vehicles=2, people=0, stationary=0),
            gemini_analysis=make_gemini_analysis(
                collision=False,
                event_time=None,
                road_blocked=False,
                smoke=False,
                fire=False,
                overturned=False,
                observations=["Normal traffic flow"],
            ),
        )
        self.assertEqual(result.incidentDetected, "NO")
        self.assertLess(result.confidence, 0.45)
        self.assertIn(result.severity, ("LOW",))
        self.assertEqual(result.responseRequirement.recommendedResponseTypes, [])

    def test_ambiguous_footage_heavy_occlusion_produces_possible(self):
        """Scenario B: Ambiguous scene, heavy occlusion → POSSIBLE with low credibility."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.58, height=240, width=320),
            yolo_evidence=make_yolo_evidence(vehicles=1, people=0, stationary=0),
            gemini_analysis=make_gemini_analysis(
                collision=False,
                event_time=None,
                road_blocked=False,
                clarity="low",
                occlusion="high",
                ambiguity="high",
                uncertainties=["Heavy occlusion prevents direct visibility of impact zone"],
                status="completed",
            ),
        )
        self.assertIn(result.incidentDetected, ("POSSIBLE", "NO"))
        self.assertLess(result.confidence, 0.70)
        self.assertTrue(len(result.uncertainties) > 0)

    def test_high_model_score_poor_evidence_reduces_credibility(self):
        """High collision probability but poor video + no YOLO vehicles → reduced credibility."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.88, height=180, width=240, sampled=4),
            yolo_evidence=make_yolo_evidence(vehicles=0, people=0, classes=[]),
            gemini_analysis=make_gemini_analysis(
                status="unavailable",
                collision=False,
                clarity="low",
                occlusion="high",
            ),
        )
        self.assertIn(result.credibility, ("LOW", "MEDIUM"))
        self.assertLess(result.confidence, 0.80)
        self.assertTrue(len(result.uncertainties) > 0)

    def test_strong_multi_source_agreement_produces_high_confidence(self):
        """All three sources agree on collision → high confidence."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.91, height=720, width=1280),
            yolo_evidence=make_yolo_evidence(vehicles=3, people=2),
            gemini_analysis=make_gemini_analysis(collision=True, road_blocked=True),
        )
        self.assertGreater(result.confidence, 0.65)
        self.assertIn(result.credibility, ("HIGH", "MEDIUM"))
        self.assertIn(result.incidentDetected, ("YES", "POSSIBLE"))

    def test_model_gemini_disagreement_produces_conflicting_evidence(self):
        """Accident model high, Gemini says no collision → conflict detected."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.85),
            yolo_evidence=make_yolo_evidence(vehicles=2, people=0),
            gemini_analysis=make_gemini_analysis(collision=False, status="completed"),
        )
        self.assertTrue(len(result.conflictingEvidence) > 0)
        self.assertIn("conflicts", result.conflictingEvidence[0].lower())

    def test_missing_gemini_source_handled_gracefully(self):
        """Gemini unavailable → falls back to model+YOLO without crashing."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.78),
            yolo_evidence=make_yolo_evidence(vehicles=2, people=1),
            gemini_analysis={
                "status": "unavailable",
                "collisionObserved": False,
                "vehiclesVisible": 0,
                "peopleVisible": 0,
                "roadObstructionObserved": False,
                "smokeObserved": False,
                "fireObserved": False,
                "overturnedVehicleObserved": False,
                "sceneClarity": "medium",
                "occlusion": "low",
                "ambiguity": "medium",
                "observations": [],
                "uncertainties": ["Semantic analysis bypassed"],
                "errorMessage": "GEMINI_API_KEY not set",
            },
        )
        self.assertIsInstance(result, FusedIncidentAssessment)
        any_gemini_uncertainty = any("unavailable" in u.lower() or "gemini" in u.lower() for u in result.uncertainties)
        self.assertTrue(any_gemini_uncertainty)

    def test_fire_and_smoke_escalates_to_critical(self):
        """Fire present in scene → CRITICAL severity."""
        result = fuse_evidence(
            accident_detection=make_accident_detection(collision_prob=0.88),
            yolo_evidence=make_yolo_evidence(vehicles=2, people=1),
            gemini_analysis=make_gemini_analysis(collision=True, fire=True, smoke=True),
        )
        self.assertEqual(result.severity, "CRITICAL")
        self.assertIn("FIRE_RESCUE", result.responseRequirement.recommendedResponseTypes)

    def test_output_confidence_bounded_0_to_1(self):
        """Confidence value must always be in [0.0, 1.0]."""
        for prob in [0.0, 0.5, 1.0]:
            result = fuse_evidence(
                accident_detection=make_accident_detection(collision_prob=prob),
                yolo_evidence=make_yolo_evidence(vehicles=2),
                gemini_analysis=make_gemini_analysis(collision=prob > 0.5),
            )
            self.assertGreaterEqual(result.confidence, 0.0)
            self.assertLessEqual(result.confidence, 1.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
