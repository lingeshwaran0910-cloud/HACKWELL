"""
Video validation and frame sampling engine for SafeCity Video Intelligence.
"""

import os
from typing import Dict, Any, List, Tuple
import cv2
import numpy as np


class VideoValidationError(Exception):
    """Raised when video file fails format, existence, or size validation."""
    pass


class VideoProcessingError(Exception):
    """Raised when video frame extraction or OpenCV processing fails."""
    pass


SUPPORTED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}


class VideoProcessor:
    """
    Handles video validation, metadata inspection, and frame sampling.
    """

    def __init__(self, max_file_size_mb: float = 500.0):
        self.max_file_size_mb = max_file_size_mb

    def validate_file(self, file_path: str) -> str:
        """
        Validates existence, extension, and file size of target video.
        """
        if not os.path.exists(file_path):
            raise VideoValidationError(f"Video file does not exist: {file_path}")

        if not os.path.isfile(file_path):
            raise VideoValidationError(f"Specified path is not a file: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in SUPPORTED_EXTENSIONS:
            raise VideoValidationError(
                f"Unsupported video format '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
            )

        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        if file_size_mb <= 0:
            raise VideoValidationError(f"Video file is empty (0 bytes): {file_path}")

        if file_size_mb > self.max_file_size_mb:
            raise VideoValidationError(
                f"Video file size ({file_size_mb:.1f} MB) exceeds maximum allowed limit of {self.max_file_size_mb} MB"
            )

        return file_path

    def inspect_metadata(self, file_path: str) -> Dict[str, Any]:
        """
        Inspects video metadata using OpenCV VideoCapture.
        Returns duration, total frames, FPS, width, and height.
        """
        self.validate_file(file_path)

        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise VideoProcessingError(f"OpenCV failed to open video file: {file_path}")

        try:
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = float(cap.get(cv2.CAP_PROP_FPS))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            if fps <= 0:
                fps = 30.0  # Fallback standard FPS if metadata missing

            if total_frames <= 0:
                # Count frames manually if CAP_PROP_FRAME_COUNT returned 0
                frame_count = 0
                while True:
                    ret, _ = cap.read()
                    if not ret:
                        break
                    frame_count += 1
                total_frames = frame_count

            duration_sec = total_frames / fps if fps > 0 else 0.0

            if total_frames <= 0:
                raise VideoProcessingError("Video contains 0 readable frames")

            return {
                "durationSec": round(duration_sec, 2),
                "totalFrames": total_frames,
                "fps": round(fps, 2),
                "width": width,
                "height": height,
                "filename": os.path.basename(file_path),
            }
        finally:
            cap.release()

    def sample_frames(
        self, file_path: str, num_frames: int = 16
    ) -> Tuple[List[np.ndarray], List[float]]:
        """
        Uniformly samples `num_frames` RGB frames across the video duration.
        Returns a tuple of (list of RGB numpy arrays, list of timestamp seconds).
        """
        metadata = self.inspect_metadata(file_path)
        total_frames = metadata["totalFrames"]
        fps = metadata["fps"]

        cap = cv2.VideoCapture(file_path)
        if not cap.isOpened():
            raise VideoProcessingError(f"Failed to open video for frame sampling: {file_path}")

        frames: List[np.ndarray] = []
        timestamps: List[float] = []

        try:
            if total_frames <= num_frames:
                frame_indices = list(range(total_frames))
            else:
                frame_indices = np.linspace(0, total_frames - 1, num=num_frames, dtype=int).tolist()

            for idx in frame_indices:
                cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
                ret, frame = cap.read()
                if ret and frame is not None:
                    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    timestamp_sec = round(idx / fps, 2) if fps > 0 else 0.0
                    frames.append(rgb_frame)
                    timestamps.append(timestamp_sec)

            if not frames:
                raise VideoProcessingError(f"No frames could be extracted from video: {file_path}")

            return frames, timestamps
        finally:
            cap.release()
