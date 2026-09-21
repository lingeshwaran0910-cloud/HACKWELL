"""
Unit and integration tests for YOLO visual evidence detection and tracking.
"""

import os
import sys
import unittest
import numpy as np
import cv2

# Ensure current directory is in python import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import (
    BoundingBox,
    DetectedObject,
    AggregatedVisualEvidence,
    FrameObservation,
)
from tracker import SpatialTemporalTracker, calculate_iou
from yolo_detector import YOLODetector, SUPPORTED_CLASSES, VEHICLE_CLASSES, PERSON_CLASSES


class TestYOLOVisualEvidence(unittest.TestCase):
    def setUp(self):
        self.detector = YOLODetector()

    def test_calculate_iou(self):
        boxA = BoundingBox(x1=10, y1=10, x2=50, y2=50)
        boxB = BoundingBox(x1=10, y1=10, x2=50, y2=50)
        self.assertAlmostEqual(calculate_iou(boxA, boxB), 1.0)

        boxC = BoundingBox(x1=100, y1=100, x2=200, y2=200)
        self.assertEqual(calculate_iou(boxA, boxC), 0.0)

        boxD = BoundingBox(x1=30, y1=10, x2=70, y2=50)
        iou = calculate_iou(boxA, boxD)
        self.assertGreater(iou, 0.0)
        self.assertLess(iou, 1.0)

    def test_model_loading(self):
        loaded = self.detector.load_model()
        self.assertTrue(loaded)
        self.assertIsNotNone(self.detector._model)
        self.assertTrue(self.detector._is_loaded)

    def test_supported_classes_real_coco(self):
        # Must only support real COCO classes - no accident, fire, smoke
        self.assertIn("car", SUPPORTED_CLASSES)
        self.assertIn("person", SUPPORTED_CLASSES)
        self.assertIn("motorcycle", SUPPORTED_CLASSES)
        self.assertIn("bus", SUPPORTED_CLASSES)
        self.assertIn("truck", SUPPORTED_CLASSES)

        self.assertNotIn("accident", SUPPORTED_CLASSES)
        self.assertNotIn("collision", SUPPORTED_CLASSES)
        self.assertNotIn("fire", SUPPORTED_CLASSES)
        self.assertNotIn("smoke", SUPPORTED_CLASSES)
        self.assertNotIn("overturned_vehicle", SUPPORTED_CLASSES)

    def test_detect_valid_frame(self):
        # Create synthetic frame with two distinct bright rectangular targets on dark canvas
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        # Draw vehicle-like rectangle
        cv2.rectangle(frame, (100, 150), (250, 300), (200, 200, 200), -1)

        obs = self.detector.detect_frame(frame, frame_idx=0, timestamp_sec=0.5)
        self.assertIsInstance(obs, FrameObservation)
        self.assertEqual(obs.frameIndex, 0)
        self.assertEqual(obs.timestampSec, 0.5)
        self.assertIsInstance(obs.detections, list)

    def test_no_detections_on_blank_frame(self):
        blank_frame = np.zeros((240, 320, 3), dtype=np.uint8)
        obs = self.detector.detect_frame(blank_frame, frame_idx=0, timestamp_sec=0.0)
        self.assertIsInstance(obs, FrameObservation)
        self.assertEqual(obs.vehicleCount, 0)
        self.assertEqual(obs.peopleCount, 0)

    def test_tracking_behavior_across_frames(self):
        tracker = SpatialTemporalTracker()

        # Frame 1: Car at (100, 100, 200, 200)
        det1 = [
            DetectedObject(
                className="car",
                confidence=0.85,
                bbox=BoundingBox(x1=100, y1=100, x2=200, y2=200),
            )
        ]
        tracked1 = tracker.update_frame(0, 0.0, det1)
        self.assertIsNotNone(tracked1[0].trackingId)
        initial_id = tracked1[0].trackingId

        # Frame 2: Car moved slightly to (110, 105, 210, 205)
        det2 = [
            DetectedObject(
                className="car",
                confidence=0.88,
                bbox=BoundingBox(x1=110, y1=105, x2=210, y2=205),
            )
        ]
        tracked2 = tracker.update_frame(1, 0.5, det2)
        # Should keep the same tracking ID
        self.assertEqual(tracked2[0].trackingId, initial_id)

        # Compute persistence & movement
        persistence, movement = tracker.compute_persistence_and_movement(total_frames=2)
        self.assertEqual(len(persistence), 1)
        self.assertEqual(persistence[0].trackingId, initial_id)
        self.assertEqual(persistence[0].frameCount, 2)
        self.assertEqual(persistence[0].persistenceRatio, 1.0)
        self.assertGreater(movement[0].displacementPixels, 0)

    def test_analyze_frames_sequence(self):
        # Generate 3 frames
        frames = [np.full((240, 320, 3), i * 30, dtype=np.uint8) for i in range(3)]
        timestamps = [0.0, 1.0, 2.0]

        evidence = self.detector.analyze_frames(frames, timestamps)
        self.assertIsInstance(evidence, AggregatedVisualEvidence)
        self.assertGreaterEqual(evidence.estimatedVisibleVehicleCount, 0)
        self.assertGreaterEqual(evidence.estimatedPeopleCount, 0)
        self.assertEqual(len(evidence.frameObservations), 3)
        self.assertTrue(evidence.trackingAvailable)
        self.assertEqual(evidence.processingStatus, "completed")
        self.assertEqual(evidence.model.source, "Ultralytics")

    def test_empty_frames_input(self):
        evidence = self.detector.analyze_frames([], [])
        self.assertIsInstance(evidence, AggregatedVisualEvidence)
        self.assertEqual(evidence.estimatedVisibleVehicleCount, 0)
        self.assertEqual(evidence.estimatedPeopleCount, 0)


if __name__ == "__main__":
    unittest.main()
