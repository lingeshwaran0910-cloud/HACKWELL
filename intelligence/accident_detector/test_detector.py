"""
Unit and integration tests for the SafeCity / HACKWELL Accident Detector Service.
"""

import os
import sys
import tempfile
import unittest
import numpy as np
import cv2

# Ensure current directory is in python import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import AccidentDetectionResponse
from video_processor import VideoProcessor, VideoValidationError, VideoProcessingError
from detector import AccidentDetector


def create_synthetic_mp4(
    output_path: str,
    width: int = 320,
    height: int = 240,
    fps: float = 10.0,
    duration_sec: float = 2.0,
    simulate_accident: bool = True,
):
    """
    Programmatically creates a lightweight synthetic MP4 video for local testing.
    """
    total_frames = int(fps * duration_sec)
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out = cv2.VideoWriter(output_path, fourcc, fps, (width, height))

    try:
        for i in range(total_frames):
            # Normal background frame (moving gray gradient)
            frame = np.full((height, width, 3), (i * 10) % 255, dtype=np.uint8)

            if simulate_accident and i >= int(total_frames * 0.6):
                # Simulate bright collision/impact disruption in later frames
                cv2.rectangle(frame, (50, 50), (270, 190), (255, 255, 255), -1)

            out.write(frame)
    finally:
        out.release()


class TestAccidentDetector(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.test_video_path = os.path.join(self.temp_dir.name, "synthetic_test.mp4")
        create_synthetic_mp4(self.test_video_path, duration_sec=2.0, simulate_accident=True)

        self.normal_video_path = os.path.join(self.temp_dir.name, "normal_test.mp4")
        create_synthetic_mp4(self.normal_video_path, duration_sec=2.0, simulate_accident=False)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_video_validation_invalid_file(self):
        processor = VideoProcessor()
        with self.assertRaises(VideoValidationError):
            processor.validate_file(os.path.join(self.temp_dir.name, "non_existent.mp4"))

    def test_video_validation_invalid_extension(self):
        txt_path = os.path.join(self.temp_dir.name, "test.txt")
        with open(txt_path, "w") as f:
            f.write("not a video")

        processor = VideoProcessor()
        with self.assertRaises(VideoValidationError):
            processor.validate_file(txt_path)

    def test_video_metadata_inspection(self):
        processor = VideoProcessor()
        metadata = processor.inspect_metadata(self.test_video_path)

        self.assertIn("durationSec", metadata)
        self.assertGreater(metadata["durationSec"], 0)
        self.assertEqual(metadata["totalFrames"], 20)
        self.assertEqual(metadata["width"], 320)
        self.assertEqual(metadata["height"], 240)
        self.assertEqual(metadata["filename"], "synthetic_test.mp4")

    def test_detector_inference_output_contract(self):
        detector = AccidentDetector()
        response = detector.predict_video(self.test_video_path)

        self.assertIsInstance(response, AccidentDetectionResponse)
        self.assertIsInstance(response.incidentDetected, bool)
        self.assertIn(response.incidentType, ["vehicle_collision", "no_collision"])
        self.assertGreaterEqual(response.collisionProbability, 0.0)
        self.assertLessEqual(response.collisionProbability, 1.0)
        self.assertGreaterEqual(response.normalProbability, 0.0)
        self.assertLessEqual(response.normalProbability, 1.0)

        # Assert top-level requirement fields
        self.assertGreater(response.videoDurationSec, 0.0)
        self.assertGreater(response.frameCount, 0)
        self.assertGreater(response.sampledFrameCount, 0)
        self.assertEqual(response.processingStatus, "completed")

        # Assert model contract fields match requirement specification
        self.assertEqual(response.model.name, "Accident-Detection-using-Dashcam")
        self.assertEqual(response.model.source, "HuggingFace")
        self.assertIn(response.model.status, ["loaded", "heuristic_fallback"])

    def test_detector_normal_video_inference(self):
        detector = AccidentDetector()
        response = detector.predict_video(self.normal_video_path)

        self.assertIsInstance(response, AccidentDetectionResponse)
        self.assertGreaterEqual(response.normalProbability, 0.0)
        self.assertEqual(response.processingStatus, "completed")

    def test_corrupted_video_handling(self):
        corrupted_path = os.path.join(self.temp_dir.name, "corrupt.mp4")
        with open(corrupted_path, "wb") as f:
            f.write(b"NOT_A_VALID_MP4_HEADER_DATA_GARBAGE_1234567890")

        processor = VideoProcessor()
        with self.assertRaises((VideoProcessingError, VideoValidationError)):
            processor.sample_frames(corrupted_path)

    def test_model_loading_failure_graceful_fallback(self):
        # Test when model cannot be loaded (e.g. invalid name or offline)
        detector = AccidentDetector(model_name="non_existent/fake_model_repo")
        loaded = detector.load_model()
        self.assertFalse(loaded)
        self.assertIsNotNone(detector._load_error)

        # Inference should still proceed gracefully using heuristic fallback
        response = detector.predict_video(self.test_video_path)
        self.assertIsInstance(response, AccidentDetectionResponse)
        self.assertEqual(response.model.status, "heuristic_fallback")
        self.assertEqual(response.processingStatus, "completed")


if __name__ == "__main__":
    unittest.main()
