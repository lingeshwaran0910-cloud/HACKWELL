"""
Multi-object spatial-temporal tracking and persistence analysis for video evidence.
"""

from typing import List, Dict, Tuple, Optional
import math
import numpy as np

from schemas import (
    BoundingBox,
    DetectedObject,
    ObjectPersistence,
    MovementObservation,
)


def calculate_iou(boxA: BoundingBox, boxB: BoundingBox) -> float:
    """Calculates Intersection over Union (IoU) between two bounding boxes."""
    xA = max(boxA.x1, boxB.x1)
    yA = max(boxA.y1, boxB.y1)
    xB = min(boxA.x2, boxB.x2)
    yB = min(boxA.y2, boxB.y2)

    interWidth = max(0.0, xB - xA)
    interHeight = max(0.0, yB - yA)
    interArea = interWidth * interHeight

    boxAArea = max(0.0, boxA.x2 - boxA.x1) * max(0.0, boxA.y2 - boxA.y1)
    boxBArea = max(0.0, boxB.x2 - boxB.x1) * max(0.0, boxB.y2 - boxB.y1)
    unionArea = boxAArea + boxBArea - interArea

    if unionArea <= 0.0:
        return 0.0
    return interArea / unionArea


def calculate_centroid(bbox: BoundingBox) -> Tuple[float, float]:
    """Calculates center (x, y) coordinates of a bounding box."""
    return ((bbox.x1 + bbox.x2) / 2.0, (bbox.y1 + bbox.y2) / 2.0)


class SpatialTemporalTracker:
    """
    Tracks detected objects across sequential sampled video frames,
    assigning persistent IDs and calculating movement dynamics.
    """

    def __init__(self, iou_threshold: float = 0.25, max_distance_pixels: float = 120.0):
        self.iou_threshold = iou_threshold
        self.max_distance_pixels = max_distance_pixels
        self.next_id = 1
        # Map: tracking_id -> state dict
        self.tracks: Dict[int, Dict] = {}

    def update_frame(
        self,
        frame_idx: int,
        timestamp_sec: float,
        detections: List[DetectedObject],
    ) -> List[DetectedObject]:
        """
        Matches incoming detections to active tracks or registers new tracks.
        Assigns trackingId to each DetectedObject and updates temporal trajectory.
        """
        matched_track_ids = set()
        matched_detection_indices = set()

        # Match existing tracks using IoU + Centroid Distance
        for track_id, track in self.tracks.items():
            last_bbox = track["history"][-1]["bbox"]
            last_cx = (last_bbox.x1 + last_bbox.x2) / 2.0
            last_cy = (last_bbox.y1 + last_bbox.y2) / 2.0

            best_idx = -1
            best_score = -1.0

            for d_idx, det in enumerate(detections):
                if d_idx in matched_detection_indices:
                    continue
                # Same or compatible class family
                if det.className != track["className"]:
                    continue

                iou = calculate_iou(last_bbox, det.bbox)
                curr_cx = (det.bbox.x1 + det.bbox.x2) / 2.0
                curr_cy = (det.bbox.y1 + det.bbox.y2) / 2.0
                dist = math.sqrt((curr_cx - last_cx) ** 2 + (curr_cy - last_cy) ** 2)

                # Matching metric
                if iou >= self.iou_threshold or dist <= self.max_distance_pixels:
                    score = iou * 0.7 + max(0.0, 1.0 - (dist / self.max_distance_pixels)) * 0.3
                    if score > best_score:
                        best_score = score
                        best_idx = d_idx

            if best_idx != -1 and best_score > 0.2:
                matched_detection_indices.add(best_idx)
                matched_track_ids.add(track_id)
                det = detections[best_idx]
                det.trackingId = track_id

                track["history"].append({
                    "frameIndex": frame_idx,
                    "timestampSec": timestamp_sec,
                    "bbox": det.bbox,
                    "confidence": det.confidence,
                })
                track["confidences"].append(det.confidence)
                track["lastSeenSec"] = timestamp_sec

        # Create new tracks for unmatched detections
        for d_idx, det in enumerate(detections):
            if d_idx not in matched_detection_indices:
                track_id = self.next_id
                self.next_id += 1
                det.trackingId = track_id

                self.tracks[track_id] = {
                    "trackingId": track_id,
                    "className": det.className,
                    "firstSeenSec": timestamp_sec,
                    "lastSeenSec": timestamp_sec,
                    "history": [{
                        "frameIndex": frame_idx,
                        "timestampSec": timestamp_sec,
                        "bbox": det.bbox,
                        "confidence": det.confidence,
                    }],
                    "confidences": [det.confidence],
                }

        return detections

    def compute_persistence_and_movement(
        self, total_frames: int
    ) -> Tuple[List[ObjectPersistence], List[MovementObservation]]:
        """
        Computes persistence metrics and displacement observations across all tracks.
        """
        persistence_list: List[ObjectPersistence] = []
        movement_list: List[MovementObservation] = []

        for track_id, track in self.tracks.items():
            obs_count = len(track["history"])
            first_seen = track["firstSeenSec"]
            last_seen = track["lastSeenSec"]
            avg_conf = float(np.mean(track["confidences"])) if track["confidences"] else 0.0

            # Compute displacement between first and last positions
            first_bbox = track["history"][0]["bbox"]
            last_bbox = track["history"][-1]["bbox"]

            first_cx = (first_bbox.x1 + first_bbox.x2) / 2.0
            first_cy = (first_bbox.y1 + first_bbox.y2) / 2.0
            last_cx = (last_bbox.x1 + last_bbox.x2) / 2.0
            last_cy = (last_bbox.y1 + last_bbox.y2) / 2.0

            displacement = math.sqrt((last_cx - first_cx) ** 2 + (last_cy - first_cy) ** 2)
            is_stationary = displacement < 25.0  # under 25 pixels movement

            if is_stationary:
                movement_hint = "stationary"
            elif displacement > 80.0:
                movement_hint = "moving"
            else:
                movement_hint = "decelerated"

            persistence_ratio = round(obs_count / max(1, total_frames), 4)

            persistence_list.append(
                ObjectPersistence(
                    trackingId=track_id,
                    className=track["className"],
                    firstSeenSec=round(first_seen, 2),
                    lastSeenSec=round(last_seen, 2),
                    frameCount=obs_count,
                    persistenceRatio=persistence_ratio,
                    avgConfidence=round(avg_conf, 4),
                )
            )

            movement_list.append(
                MovementObservation(
                    trackingId=track_id,
                    className=track["className"],
                    displacementPixels=round(displacement, 2),
                    isStationary=is_stationary,
                    movementHint=movement_hint,
                )
            )

        return persistence_list, movement_list
