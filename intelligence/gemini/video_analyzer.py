"""
Gemini Video Semantic Analyzer for SafeCity AI.
Extracts representative visual keyframes and submits them for high-level semantic collision observation.
"""

import io
import logging
from typing import List, Optional
import numpy as np
import cv2

from gemini.schemas import GeminiVideoAnalysis
from gemini.client import GeminiClient

logger = logging.getLogger("GeminiVideoAnalyzer")
logger.setLevel(logging.INFO)


class GeminiVideoAnalyzer:
    """
    Analyzes video frame sequences using Gemini to generate structured semantic observations.
    Acts purely as an evidence source without dispatch authority.
    """

    def __init__(self, client: Optional[GeminiClient] = None):
        self.client = client or GeminiClient()

    def analyze_video_frames(
        self,
        frames: List[np.ndarray],
        timestamps: List[float],
        video_metadata: Optional[dict] = None,
    ) -> GeminiVideoAnalysis:
        """
        Subsamples keyframes from the video, encodes to JPEG, and invokes Gemini semantic analysis.
        """
        if not frames:
            return GeminiVideoAnalysis(
                collisionObserved=False,
                approximateEventTimeSec=None,
                vehiclesVisible=0,
                peopleVisible=0,
                roadObstructionObserved=False,
                smokeObserved=False,
                fireObserved=False,
                overturnedVehicleObserved=False,
                sceneClarity="low",
                occlusion="high",
                ambiguity="high",
                observations=["No frames provided for semantic analysis"],
                uncertainties=["Empty frame sequence"],
                status="completed",
                modelName=self.client.model_name,
            )

        # Select 4-8 evenly spaced representative frames across sequence
        sample_count = min(6, len(frames))
        step = max(1, len(frames) // sample_count)
        selected_indices = [min(i * step, len(frames) - 1) for i in range(sample_count)]

        image_bytes_list: List[bytes] = []
        for idx in selected_indices:
            frame = frames[idx]
            # Resize frame to standard analysis resolution (e.g. 512px max dimension)
            h, w = frame.shape[:2]
            target_w = 512
            target_h = int(h * (target_w / float(w)))
            resized = cv2.resize(frame, (target_w, target_h), interpolation=cv2.INTER_AREA)

            _, buf = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
            image_bytes_list.append(buf.tobytes())

        duration_sec = video_metadata.get("durationSec", round(timestamps[-1] if timestamps else 0.0, 1)) if video_metadata else 0.0

        prompt = (
            f"Please analyze these {len(image_bytes_list)} sequential video frames from traffic/dashcam footage "
            f"(video duration: {duration_sec}s). "
            "Report whether a vehicle collision/accident occurred, visible vehicles, pedestrians, "
            "road blockages, smoke, fire, overturned vehicles, scene clarity, and explicit uncertainties."
        )

        return self.client.analyze_scene(prompt_text=prompt, image_bytes_list=image_bytes_list)
