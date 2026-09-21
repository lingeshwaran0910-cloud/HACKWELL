"""
Pretrained Accident Detector module using HuggingFace model 'jatinmehra/Accident-Detection-using-Dashcam'.
"""

import time
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from schemas import (
    AccidentDetectionResponse,
    ModelInfo,
    VideoMetadata,
    ProcessingInfo,
)
from video_processor import VideoProcessor, VideoValidationError, VideoProcessingError

logger = logging.getLogger("AccidentDetector")
logger.setLevel(logging.INFO)

MODEL_NAME = "jatinmehra/Accident-Detection-using-Dashcam"
MODEL_SOURCE = "HuggingFace"


class AccidentDetector:
    """
    Inference engine for pretrained Hugging Face dashcam accident detection model.
    """

    def __init__(self, model_name: str = MODEL_NAME, threshold: float = 0.5):
        self.model_name = model_name
        self.threshold = threshold
        self.video_processor = VideoProcessor()
        self._model = None
        self._processor = None
        self._is_loaded = False
        self._load_error: Optional[str] = None

    def load_model(self) -> bool:
        """
        Loads Hugging Face model and image/video processor once into memory.
        """
        if self._is_loaded:
            return True

        logger.info(f"Loading pretrained model '{self.model_name}' from HuggingFace...")
        try:
            from transformers import AutoImageProcessor, AutoModelForVideoClassification
            import torch

            try:
                self._processor = AutoImageProcessor.from_pretrained(self.model_name)
            except Exception as proc_err:
                logger.info(f"Image processor not in repo, loading VideoMAE processor fallback: {proc_err}")
                self._processor = AutoImageProcessor.from_pretrained("MCG-NJU/videomae-base")

            self._model = AutoModelForVideoClassification.from_pretrained(self.model_name)
            self._model.eval()
            self._is_loaded = True
            logger.info(f"Successfully loaded model '{self.model_name}'")
            return True
        except Exception as e:
            self._load_error = str(e)
            logger.warning(
                f"Could not load Hugging Face model '{self.model_name}': {e}. "
                "Will use computer-vision heuristic analysis mode."
            )
            self._is_loaded = False
            return False

    def predict_video(self, file_path: str) -> AccidentDetectionResponse:
        """
        Analyzes target MP4 video file and returns structured accident detection evidence.
        """
        start_time = time.time()

        # Step 1: Inspect metadata & extract frames
        metadata_dict = self.video_processor.inspect_metadata(file_path)
        frames, timestamps = self.video_processor.sample_frames(file_path, num_frames=16)

        video_metadata = VideoMetadata(
            durationSec=metadata_dict["durationSec"],
            totalFrames=metadata_dict["totalFrames"],
            fps=metadata_dict["fps"],
            width=metadata_dict["width"],
            height=metadata_dict["height"],
            filename=metadata_dict["filename"],
        )

        # Step 2: Run inference via PyTorch/Transformers or fallback heuristic
        model_loaded = self.load_model()
        collision_prob = 0.0
        normal_prob = 1.0
        suspected_time_sec = None
        model_status = "LOADED" if model_loaded else "HEURISTIC_FALLBACK"

        if model_loaded and self._model is not None and self._processor is not None:
            try:
                import torch

                # Process 16 RGB frames for VideoMAE / VideoClassification model
                inputs = self._processor(images=frames, return_tensors="pt")
                with torch.no_grad():
                    outputs = self._model(**inputs)
                    logits = outputs.logits
                    probs = torch.softmax(logits, dim=-1).squeeze().tolist()

                if isinstance(probs, list) and len(probs) >= 2:
                    # Model labels: 1 = collision/accident, 0 = normal
                    collision_prob = round(float(probs[1]), 4)
                    normal_prob = round(float(probs[0]), 4)
                elif isinstance(probs, (float, int)):
                    collision_prob = round(float(probs), 4)
                    normal_prob = round(1.0 - collision_prob, 4)

                # Estimate peak collision timestamp by calculating frame differences
                suspected_time_sec = self._find_suspected_event_timestamp(frames, timestamps)

            except Exception as e:
                logger.error(f"Inference execution failed on loaded model: {e}")
                model_status = "HEURISTIC_FALLBACK"
                collision_prob, normal_prob, suspected_time_sec = self._cv_heuristic_predict(frames, timestamps)
        else:
            # Execute computer vision motion & optical anomaly heuristic fallback
            collision_prob, normal_prob, suspected_time_sec = self._cv_heuristic_predict(frames, timestamps)

        # Step 3: Determine detection classification
        incident_detected = collision_prob >= self.threshold
        incident_type = "vehicle_collision" if incident_detected else "no_collision"

        inference_duration = round(time.time() - start_time, 4)
        model_name_short = self.model_name.split("/")[-1] if "/" in self.model_name else self.model_name
        model_status_label = "loaded" if model_loaded else "heuristic_fallback"

        return AccidentDetectionResponse(
            incidentDetected=incident_detected,
            incidentType=incident_type,
            collisionProbability=collision_prob,
            normalProbability=normal_prob,
            suspectedEventTimeSec=suspected_time_sec,
            videoDurationSec=video_metadata.durationSec,
            frameCount=video_metadata.totalFrames,
            sampledFrameCount=len(frames),
            processingStatus="completed",
            model=ModelInfo(
                name=model_name_short,
                source=MODEL_SOURCE,
                status=model_status_label,
            ),
            videoMetadata=video_metadata,
            processing=ProcessingInfo(
                sampledFrameCount=len(frames),
                inferenceDurationSec=inference_duration,
                status="completed",
                modelStatus=model_status_label,
                errorMessage=self._load_error if not model_loaded else None,
            ),
        )

    def _find_suspected_event_timestamp(
        self, frames: List[np.ndarray], timestamps: List[float]
    ) -> Optional[float]:
        """
        Finds frame timestamp with maximum inter-frame pixel variation (collision/impact indicator).
        """
        if len(frames) < 2 or len(timestamps) < len(frames):
            return timestamps[0] if timestamps else 0.0

        max_diff = -1.0
        peak_idx = 0

        for i in range(1, len(frames)):
            # Calculate mean absolute pixel change between consecutive sampled frames
            diff = float(np.mean(np.abs(frames[i].astype(float) - frames[i - 1].astype(float))))
            if diff > max_diff:
                max_diff = diff
                peak_idx = i

        return timestamps[peak_idx]

    def _cv_heuristic_predict(
        self, frames: List[np.ndarray], timestamps: List[float]
    ) -> Tuple[float, float, Optional[float]]:
        """
        Computer vision fallback heuristic that measures visual motion disruption.
        Returns (collision_probability, normal_probability, suspected_event_time_sec).
        """
        if len(frames) < 2:
            return 0.1, 0.9, timestamps[0] if timestamps else 0.0

        diffs = []
        for i in range(1, len(frames)):
            diff = float(np.mean(np.abs(frames[i].astype(float) - frames[i - 1].astype(float))))
            diffs.append(diff)

        max_diff_idx = int(np.argmax(diffs))
        mean_diff = float(np.mean(diffs))
        max_diff = float(diffs[max_diff_idx])

        # Spike ratio indicates sudden impact / crash motion shift
        spike_ratio = max_diff / (mean_diff + 1e-5)
        
        # Sigmoidal mapping of motion spike to collision score
        if spike_ratio > 2.5 and max_diff > 30.0:
            collision_prob = min(0.95, round(0.5 + (spike_ratio / 10.0), 4))
        else:
            collision_prob = max(0.05, round(0.1 + (mean_diff / 250.0), 4))

        normal_prob = round(1.0 - collision_prob, 4)
        suspected_time = timestamps[max_diff_idx + 1] if max_diff_idx + 1 < len(timestamps) else timestamps[0]

        return collision_prob, normal_prob, suspected_time
