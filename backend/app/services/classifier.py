"""
SAMVAD AI — Sign Landmark Classifier Service
Loads the trained PyTorch model (and Scikit-Learn fallback) and executes real-time inference with confidence rejection.
"""

import os
import json
import numpy as np
import torch
import torch.nn as nn
import joblib
from typing import Dict, Any, List, Optional


class KeypointClassifierPyTorch(nn.Module):
    def __init__(self, num_classes=26):
        super(KeypointClassifierPyTorch, self).__init__()
        self.net = nn.Sequential(
            nn.Linear(42, 128),
            nn.BatchNorm1d(128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.BatchNorm1d(64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, num_classes)
        )

    def forward(self, x):
        return self.net(x)


class SignClassifier:
    def __init__(self, models_dir: str = "backend/app/models", min_confidence: float = 0.60):
        self.models_dir = models_dir
        self.min_confidence = min_confidence
        self.pytorch_model: Optional[KeypointClassifierPyTorch] = None
        self.sklearn_model: Optional[Any] = None
        self.class_names: List[str] = []
        self.metadata: Dict[str, Any] = {}
        self.device = torch.device("cpu")
        self.load_models()

    def load_models(self):
        # 1. Load Labels & Metadata
        metadata_path = os.path.join(self.models_dir, "model_metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)
                self.class_names = self.metadata.get("classes", [])

        if not self.class_names:
            labels_path = os.path.join(self.models_dir, "keypoint_labels.json")
            if os.path.exists(labels_path):
                with open(labels_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.class_names = data.get("classes", [])

        num_classes = len(self.class_names) if self.class_names else 26

        # 2. Load PyTorch Model
        pt_path = os.path.join(self.models_dir, "keypoint_classifier.pt")
        if os.path.exists(pt_path):
            try:
                checkpoint = torch.load(pt_path, map_location=self.device)
                model = KeypointClassifierPyTorch(num_classes=num_classes)
                model.load_state_dict(checkpoint["model_state_dict"])
                model.eval()
                self.pytorch_model = model
                print(f"[Classifier] PyTorch model loaded successfully with {num_classes} classes.")
            except Exception as e:
                print(f"[Classifier] Failed to load PyTorch model: {e}")

        # 3. Load Scikit-Learn Model Fallback
        sk_path = os.path.join(self.models_dir, "keypoint_classifier.joblib")
        if os.path.exists(sk_path):
            try:
                self.sklearn_model = joblib.load(sk_path)
                print("[Classifier] Scikit-Learn model loaded successfully as fallback.")
            except Exception as e:
                print(f"[Classifier] Failed to load Scikit-Learn model: {e}")

    def predict(self, features_42d: List[float], custom_threshold: Optional[float] = None) -> Dict[str, Any]:
        """
        Classifies 42-dimensional normalized landmarks.
        Returns predicted label, confidence, top candidates, and whether it met the rejection threshold.
        """
        threshold = custom_threshold if custom_threshold is not None else self.min_confidence

        if len(features_42d) != 42:
            return {
                "sign": None,
                "confidence": 0.0,
                "accepted": False,
                "reason": f"Expected 42 features, got {len(features_42d)}",
                "top_candidates": []
            }

        input_arr = np.array(features_42d, dtype=np.float32).reshape(1, -1)

        # PyTorch prediction
        if self.pytorch_model is not None:
            self.pytorch_model.eval()
            with torch.no_grad():
                tensor_in = torch.from_numpy(input_arr).to(self.device)
                logits = self.pytorch_model(tensor_in)
                probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

            top_idx = int(np.argmax(probs))
            top_conf = float(probs[top_idx])

            # Get top 3 candidates
            sorted_indices = np.argsort(probs)[::-1][:3]
            top_candidates = [
                {
                    "sign": self.class_names[idx] if idx < len(self.class_names) else f"Class_{idx}",
                    "confidence": round(float(probs[idx]), 4)
                }
                for idx in sorted_indices
            ]

            predicted_sign = self.class_names[top_idx] if top_idx < len(self.class_names) else f"Class_{top_idx}"
            accepted = top_conf >= threshold

            return {
                "sign": predicted_sign if accepted else None,
                "raw_sign": predicted_sign,
                "confidence": round(top_conf, 4),
                "accepted": accepted,
                "rejection_threshold": threshold,
                "top_candidates": top_candidates,
                "backend": "pytorch"
            }

        # Fallback to Scikit-Learn if PyTorch not available
        elif self.sklearn_model is not None:
            probs = self.sklearn_model.predict_proba(input_arr)[0]
            top_idx = int(np.argmax(probs))
            top_conf = float(probs[top_idx])

            sorted_indices = np.argsort(probs)[::-1][:3]
            top_candidates = [
                {
                    "sign": self.class_names[idx] if idx < len(self.class_names) else f"Class_{idx}",
                    "confidence": round(float(probs[idx]), 4)
                }
                for idx in sorted_indices
            ]

            predicted_sign = self.class_names[top_idx] if top_idx < len(self.class_names) else f"Class_{top_idx}"
            accepted = top_conf >= threshold

            return {
                "sign": predicted_sign if accepted else None,
                "raw_sign": predicted_sign,
                "confidence": round(top_conf, 4),
                "accepted": accepted,
                "rejection_threshold": threshold,
                "top_candidates": top_candidates,
                "backend": "scikit-learn"
            }

        else:
            return {
                "sign": None,
                "confidence": 0.0,
                "accepted": False,
                "reason": "No model loaded",
                "top_candidates": []
            }

    def get_supported_classes(self) -> List[str]:
        return self.class_names

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata
