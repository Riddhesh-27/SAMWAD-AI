"""
SAMVAD AI — MediaPipe Hands Landmark Extractor
Detects 21 hand landmarks from image frames and computes normalized relative coordinates.
Uses official MediaPipe Tasks HandLandmarker API with local model bundle.
"""

import os
import cv2
import numpy as np
import base64
import mediapipe as mp
import mediapipe.tasks as mp_tasks
from typing import Optional, Tuple, List, Dict, Any

MODEL_TASK_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models", "hand_landmarker.task"))


class HandLandmarkExtractor:
    def __init__(self, model_path: str = MODEL_TASK_PATH, max_num_hands: int = 2):
        self.detector = None
        self.init_detector(model_path, max_num_hands)

    def init_detector(self, model_path: str, max_num_hands: int):
        if not os.path.exists(model_path):
            print(f"[LandmarkExtractor] Warning: Model task bundle not found at {model_path}")
            return
        try:
            base_options = mp_tasks.BaseOptions(model_asset_path=model_path)
            options = mp_tasks.vision.HandLandmarkerOptions(
                base_options=base_options,
                num_hands=max_num_hands,
                min_hand_detection_confidence=0.5,
                min_hand_presence_confidence=0.5,
                min_tracking_confidence=0.5
            )
            self.detector = mp_tasks.vision.HandLandmarker.create_from_options(options)
            print("[LandmarkExtractor] HandLandmarker initialized successfully (2-hand support enabled).")
        except Exception as e:
            print(f"[LandmarkExtractor] Error initializing HandLandmarker: {e}")

    def decode_base64_image(self, base64_str: str) -> Optional[np.ndarray]:
        """Decodes base64 JPEG/PNG string to OpenCV BGR numpy array."""
        try:
            if "," in base64_str:
                base64_str = base64_str.split(",")[1]
            img_bytes = base64.b64decode(base64_str)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            return None

    def extract_landmarks(self, image_bgr: np.ndarray) -> Optional[Dict[str, Any]]:
        """
        Processes BGR image and extracts 21 hand landmarks.
        Returns normalized 42-dimensional feature vector, raw 21 landmark points, and bounding box.
        """
        if self.detector is None or image_bgr is None or image_bgr.size == 0:
            return None

        h, w, _ = image_bgr.shape
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

        try:
            results = self.detector.detect(mp_image)
        except Exception as e:
            print(f"[LandmarkExtractor] Detection error: {e}")
            return None

        if not results.hand_landmarks:
            return None

        all_hands_raw = []
        all_bboxes = []
        all_handedness = []

        for hand_idx, hand_landmarks in enumerate(results.hand_landmarks):
            h_name = "Right"
            if results.handedness and len(results.handedness) > hand_idx and len(results.handedness[hand_idx]) > 0:
                h_name = results.handedness[hand_idx][0].category_name
            all_handedness.append(h_name)

            raw_landmarks = []
            x_coords = []
            y_coords = []

            for lm in hand_landmarks:
                cx, cy = int(lm.x * w), int(lm.y * h)
                x_coords.append(cx)
                y_coords.append(cy)
                raw_landmarks.append({
                    "x": round(float(lm.x), 4),
                    "y": round(float(lm.y), 4),
                    "z": round(float(lm.z), 4),
                    "px": cx,
                    "py": cy
                })

            bbox = {
                "x_min": max(0, min(x_coords) - 20),
                "y_min": max(0, min(y_coords) - 20),
                "x_max": min(w, max(x_coords) + 20),
                "y_max": min(h, max(y_coords) + 20),
                "width": max(x_coords) - min(x_coords) + 40,
                "height": max(y_coords) - min(y_coords) + 40
            }
            all_hands_raw.append(raw_landmarks)
            all_bboxes.append(bbox)

        # Primary hand
        primary_raw = all_hands_raw[0]
        norm_features = self.normalize_landmarks_42d(primary_raw)

        return {
            "num_hands": len(all_hands_raw),
            "all_hands": all_hands_raw,
            "all_bboxes": all_bboxes,
            "landmarks_42d": norm_features,
            "raw_landmarks": primary_raw,
            "handedness": all_handedness[0] if all_handedness else "Right",
            "all_handedness": all_handedness,
            "bbox": all_bboxes[0] if all_bboxes else None,
            "frame_width": w,
            "frame_height": h
        }

    @staticmethod
    def normalize_landmarks_42d(raw_landmarks: List[Dict[str, Any]]) -> List[float]:
        """
        Normalizes 21 (x, y) coordinates:
        1. Translate wrist (point 0) to origin (0, 0).
        2. Normalize coordinates by maximum absolute distance to make scale invariant.
        """
        coords = []
        base_x = raw_landmarks[0]["x"]
        base_y = raw_landmarks[0]["y"]

        # Step 1: Relative to wrist
        for lm in raw_landmarks:
            coords.append(lm["x"] - base_x)
            coords.append(lm["y"] - base_y)

        # Step 2: Scale normalization by max absolute value
        max_val = max(map(abs, coords)) if coords else 1.0
        if max_val == 0:
            max_val = 1.0

        normalized = [round(c / max_val, 6) for c in coords]
        return normalized

    def close(self):
        if self.detector:
            self.detector.close()
