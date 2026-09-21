"""
Unit tests for Gemini semantic video understanding module.
Mocks all network calls — no live Gemini API requests required.
"""

import os
import sys
import unittest
from unittest.mock import MagicMock, patch
import numpy as np

# Ensure current directory is in python import path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schemas import GeminiVideoAnalysis
from client import GeminiClient
from video_analyzer import GeminiVideoAnalyzer


class TestGeminiSemanticAnalysis(unittest.TestCase):
    def test_unconfigured_api_key_graceful_degradation(self):
        # Client without API key
        client = GeminiClient(api_key="")
        self.assertFalse(client.is_configured())

        res = client.analyze_scene("Test prompt")
        self.assertIsInstance(res, GeminiVideoAnalysis)
        self.assertEqual(res.status, "unavailable")
        self.assertFalse(res.collisionObserved)
        self.assertIn("not set", res.errorMessage.lower())

    def test_mocked_successful_accident_response(self):
        mock_response_json = """
        {
          "collisionObserved": true,
          "approximateEventTimeSec": 7.8,
          "vehiclesVisible": 2,
          "peopleVisible": 3,
          "roadObstructionObserved": true,
          "smokeObserved": false,
          "fireObserved": false,
          "overturnedVehicleObserved": false,
          "sceneClarity": "high",
          "occlusion": "low",
          "ambiguity": "low",
          "observations": ["Sedan collided with SUV at intersection", "Debris scattered on roadway"],
          "uncertainties": ["License plates not legible"]
        }
        """
        client = GeminiClient(api_key="mock_test_key_123")
        with patch.object(client, "_get_client") as mock_get:
            mock_ai = MagicMock()
            mock_gen_response = MagicMock()
            mock_gen_response.text = mock_response_json
            mock_ai.models.generate_content.return_value = mock_gen_response
            mock_get.return_value = mock_ai

            analysis = client.analyze_scene("Analyze crash", image_bytes_list=[b"fake_jpeg"])
            self.assertIsInstance(analysis, GeminiVideoAnalysis)
            self.assertTrue(analysis.collisionObserved)
            self.assertEqual(analysis.approximateEventTimeSec, 7.8)
            self.assertEqual(analysis.vehiclesVisible, 2)
            self.assertEqual(analysis.peopleVisible, 3)
            self.assertTrue(analysis.roadObstructionObserved)
            self.assertFalse(analysis.fireObserved)
            self.assertEqual(analysis.sceneClarity, "high")
            self.assertEqual(analysis.status, "completed")

    def test_mocked_normal_traffic_response(self):
        mock_response_json = """
        {
          "collisionObserved": false,
          "approximateEventTimeSec": null,
          "vehiclesVisible": 4,
          "peopleVisible": 1,
          "roadObstructionObserved": false,
          "smokeObserved": false,
          "fireObserved": false,
          "overturnedVehicleObserved": false,
          "sceneClarity": "high",
          "occlusion": "none",
          "ambiguity": "low",
          "observations": ["Normal traffic flow along urban street"],
          "uncertainties": []
        }
        """
        client = GeminiClient(api_key="mock_test_key_123")
        with patch.object(client, "_get_client") as mock_get:
            mock_ai = MagicMock()
            mock_gen_response = MagicMock()
            mock_gen_response.text = mock_response_json
            mock_ai.models.generate_content.return_value = mock_gen_response
            mock_get.return_value = mock_ai

            analysis = client.analyze_scene("Analyze normal")
            self.assertIsInstance(analysis, GeminiVideoAnalysis)
            self.assertFalse(analysis.collisionObserved)
            self.assertIsNone(analysis.approximateEventTimeSec)
            self.assertEqual(analysis.vehiclesVisible, 4)

    def test_mocked_api_quota_or_timeout_error(self):
        client = GeminiClient(api_key="mock_test_key_123")
        with patch.object(client, "_get_client") as mock_get:
            mock_ai = MagicMock()
            mock_ai.models.generate_content.side_effect = RuntimeError("ResourceExhausted: 429 Quota Exceeded")
            mock_get.return_value = mock_ai

            analysis = client.analyze_scene("Analyze crash")
            self.assertIsInstance(analysis, GeminiVideoAnalysis)
            self.assertEqual(analysis.status, "error")
            self.assertFalse(analysis.collisionObserved)
            self.assertIn("ResourceExhausted", analysis.errorMessage)

    def test_mocked_malformed_json_response(self):
        client = GeminiClient(api_key="mock_test_key_123")
        with patch.object(client, "_get_client") as mock_get:
            mock_ai = MagicMock()
            mock_gen_response = MagicMock()
            mock_gen_response.text = "This is NOT JSON. Internal server error or free-form text."
            mock_ai.models.generate_content.return_value = mock_gen_response
            mock_get.return_value = mock_ai

            analysis = client.analyze_scene("Analyze crash")
            self.assertIsInstance(analysis, GeminiVideoAnalysis)
            self.assertEqual(analysis.status, "completed")
            self.assertEqual(analysis.sceneClarity, "low")
            self.assertIn("Malformed response", analysis.observations[0])

    def test_video_analyzer_frames_processing(self):
        client = GeminiClient(api_key="")
        analyzer = GeminiVideoAnalyzer(client=client)

        frames = [np.zeros((240, 320, 3), dtype=np.uint8) for _ in range(5)]
        timestamps = [0.0, 0.5, 1.0, 1.5, 2.0]

        analysis = analyzer.analyze_video_frames(frames, timestamps)
        self.assertIsInstance(analysis, GeminiVideoAnalysis)
        self.assertEqual(analysis.status, "unavailable")

    def test_video_analyzer_empty_frames(self):
        analyzer = GeminiVideoAnalyzer(client=GeminiClient(api_key="fake"))
        analysis = analyzer.analyze_video_frames([], [])
        self.assertIsInstance(analysis, GeminiVideoAnalysis)
        self.assertEqual(analysis.vehiclesVisible, 0)
        self.assertFalse(analysis.collisionObserved)


if __name__ == "__main__":
    unittest.main()
