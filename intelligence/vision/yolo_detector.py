"""
Ultralytics YOLO visual evidence detector for vehicle and pedestrian detection in SafeCity AI.
"""

import os
import io
import time
import base64
import logging
from typing import List, Dict, Optional, Tuple, Set
import numpy as np
import cv2

from vision.schemas import (
    BoundingBox,
    DetectedObject,
    FrameObservation,
    AggregatedVisualEvidence,
    VisionModelInfo,
)
from vision.tracker import SpatialTemporalTracker

logger = logging.getLogger("YOLODetector")
logger.setLevel(logging.INFO)

# Real COCO classes supported by standard YOLOv8
VEHICLE_CLASSES: Set[str] = {"car", "motorcycle", "bus", "truck", "bicycle"}
PERSON_CLASSES: Set[str] = {"person"}
TRAFFIC_OBJECT_CLASSES: Set[str] = {"traffic light", "stop sign"}
SUPPORTED_CLASSES: Set[str] = VEHICLE_CLASSES | PERSON_CLASSES | TRAFFIC_OBJECT_CLASSES


class YOLODetector:
    """
    Inference engine using Ultralytics YOLO to extract visual evidence of vehicles,
    pedestrians, and traffic scene objects from video footage.
    """

    def __init__(self, model_name: str = "yolov8n.pt", confidence_threshold: float = 0.25):
        self.model_name = model_name
        self.confidence_threshold = confidence_threshold
        self._model = None
        self._is_loaded = False
        self._load_error: Optional[str] = None

    def load_model(self) -> bool:
        """Loads Ultralytics YOLO model into memory once."""
        if self._is_loaded:
            return True

        logger.info(f"Loading YOLO model '{self.model_name}'...")
        try:
            from ultralytics import YOLO

            self._model = YOLO(self.model_name)
            self._is_loaded = True
            logger.info(f"Successfully loaded YOLO model '{self.model_name}'")
            return True
        except Exception as e:
            self._load_error = str(e)
            logger.warning(f"Could not load YOLO model '{self.model_name}': {e}. Using CV fallback mode.")
            self._is_loaded = False
            return False

    def detect_frame(
        self,
        frame: np.ndarray,
        frame_idx: int = 0,
        timestamp_sec: float = 0.0,
    ) -> FrameObservation:
        """
        Runs object detection on a single frame and returns structured observations.
        """
        model_loaded = self.load_model()
        detections: List[DetectedObject] = []
        vehicle_count = 0
        people_count = 0

        if model_loaded and self._model is not None:
            try:
                # Run YOLO inference
                results = self._model(frame, conf=self.confidence_threshold, verbose=False)
                for r in results:
                    boxes = r.boxes
                    if boxes is None:
                        continue
                    for box in boxes:
                        cls_idx = int(box.cls[0].item())
                        cls_name = r.names.get(cls_idx, "").lower()

                        # Filter strictly to supported COCO classes
                        if cls_name not in SUPPORTED_CLASSES:
                            continue

                        conf = round(float(box.conf[0].item()), 4)
                        xyxy = box.xyxy[0].tolist()
                        bbox = BoundingBox(
                            x1=round(xyxy[0], 2),
                            y1=round(xyxy[1], 2),
                            x2=round(xyxy[2], 2),
                            y2=round(xyxy[3], 2),
                        )

                        det = DetectedObject(className=cls_name, confidence=conf, bbox=bbox)
                        detections.append(det)

                        if cls_name in VEHICLE_CLASSES:
                            vehicle_count += 1
                        elif cls_name in PERSON_CLASSES:
                            people_count += 1

            except Exception as e:
                logger.error(f"Frame {frame_idx} inference error: {e}")
        else:
            # Computer-vision motion/contour fallback when YOLO model is unavailable
            detections, vehicle_count, people_count = self._cv_contour_detect(frame)

        return FrameObservation(
            frameIndex=frame_idx,
            timestampSec=round(timestamp_sec, 2),
            detections=detections,
            vehicleCount=vehicle_count,
            peopleCount=people_count,
        )

    def analyze_frames(
        self,
        frames: List[np.ndarray],
        timestamps: List[float],
    ) -> AggregatedVisualEvidence:
        """
        Processes a sequence of sampled video frames, tracks objects across time,
        and returns aggregated visual evidence.
        """
        if not frames:
            return AggregatedVisualEvidence(
                estimatedVisibleVehicleCount=0,
                estimatedPeopleCount=0,
                peakVehicleCount=0,
                peakPeopleCount=0,
                detectedClasses=[],
                objectPersistence=[],
                movementObservations=[],
                frameObservations=[],
                trackingAvailable=False,
                processingStatus="completed",
                model=VisionModelInfo(name=self.model_name, status="no_frames"),
            )

        tracker = SpatialTemporalTracker()
        frame_observations: List[FrameObservation] = []
        all_detected_classes: Set[str] = set()

        peak_vehicle_count = 0
        peak_people_count = 0
        peak_frame_idx = 0
        max_objects_in_frame = -1

        for idx, (frame, t_sec) in enumerate(zip(frames, timestamps)):
            obs = self.detect_frame(frame, frame_idx=idx, timestamp_sec=t_sec)

            # Update multi-object tracker
            obs.detections = tracker.update_frame(idx, t_sec, obs.detections)
            frame_observations.append(obs)

            for d in obs.detections:
                all_detected_classes.add(d.className)

            if obs.vehicleCount > peak_vehicle_count:
                peak_vehicle_count = obs.vehicleCount
            if obs.peopleCount > peak_people_count:
                peak_people_count = obs.peopleCount

            total_objs = obs.vehicleCount + obs.peopleCount
            if total_objs > max_objects_in_frame:
                max_objects_in_frame = total_objs
                peak_frame_idx = idx

        # Compute object persistence and movement across all tracked entities
        persistence_list, movement_list = tracker.compute_persistence_and_movement(total_frames=len(frames))

        # Distinct estimated vehicle & people counts from active persistent tracks
        tracked_vehicles = [p for p in persistence_list if p.className in VEHICLE_CLASSES]
        tracked_people = [p for p in persistence_list if p.className in PERSON_CLASSES]

        estimated_vehicles = max(peak_vehicle_count, len(tracked_vehicles))
        estimated_people = max(peak_people_count, len(tracked_people))

        # Generate annotated thumbnail of the peak frame
        annotated_b64 = None
        if frames and peak_frame_idx < len(frames):
            try:
                annotated_b64 = self._generate_annotated_thumbnail(
                    frames[peak_frame_idx],
                    frame_observations[peak_frame_idx].detections,
                )
            except Exception as e:
                logger.warning(f"Could not render annotated thumbnail: {e}")

        model_status = "loaded" if self._is_loaded else "heuristic_fallback"

        return AggregatedVisualEvidence(
            estimatedVisibleVehicleCount=estimated_vehicles,
            estimatedPeopleCount=estimated_people,
            peakVehicleCount=peak_vehicle_count,
            peakPeopleCount=peak_people_count,
            detectedClasses=sorted(list(all_detected_classes)),
            objectPersistence=persistence_list,
            movementObservations=movement_list,
            frameObservations=frame_observations,
            trackingAvailable=True,
            annotatedFrameBase64=annotated_b64,
            model=VisionModelInfo(
                name=self.model_name,
                source="Ultralytics",
                status=model_status,
            ),
            processingStatus="completed",
        )

    def _generate_annotated_thumbnail(
        self, frame: np.ndarray, detections: List[DetectedObject]
    ) -> Optional[str]:
        """Draws bounding boxes and labels onto frame and encodes as Base64 JPEG."""
        canvas = frame.copy()
        for det in detections:
            bbox = det.bbox
            p1 = (int(bbox.x1), int(bbox.y1))
            p2 = (int(bbox.x2), int(bbox.y2))

            color = (0, 255, 0) if det.className in VEHICLE_CLASSES else (255, 100, 0)
            cv2.rectangle(canvas, p1, p2, color, 2)

            label = f"{det.className} #{det.trackingId or '?'}: {det.confidence:.2f}"
            cv2.putText(
                canvas,
                label,
                (p1[0], max(15, p1[1] - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.45,
                color,
                1,
                cv2.LINE_AA,
            )

        # Resize for thumbnail
        h, w = canvas.shape[:2]
        thumb_w = 400
        thumb_h = int(h * (thumb_w / float(w)))
        thumb = cv2.resize(canvas, (thumb_w, thumb_h), interpolation=cv2.INTER_AREA)

        _, buffer = cv2.imencode(".jpg", thumb, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
        return base64.b64encode(buffer).decode("utf-8")

    def _cv_contour_detect(
        self, frame: np.ndarray
    ) -> Tuple[List[DetectedObject], int, int]:
        """Fallback computer-vision contour analysis when YOLO model is unavailable."""
        detections: List[DetectedObject] = []
        v_count = 0
        p_count = 0

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if len(frame.shape) == 3 else frame
        blurred = cv2.GaussianBlur(gray, (7, 7), 0)
        edges = cv2.Canny(blurred, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > 1000:
                x, y, w, h = cv2.boundingRect(cnt)
                aspect = w / float(h + 1e-5)
                # Aspect ratio heuristic: horizontal rectangular blobs are likely vehicles
                cls_name = "car" if aspect > 1.1 else "person"
                conf = min(0.75, round(0.4 + (area / 10000.0), 2))
                bbox = BoundingBox(x1=float(x), y1=float(y), x2=float(x + w), y2=float(y + h))
                detections.append(DetectedObject(className=cls_name, confidence=conf, bbox=bbox))
                if cls_name == "car":
                    v_count += 1
                else:
                    p_count += 1

        return detections, v_count, p_count
