"""
SAMVAD AI — Health and System Status Routes
Provides runtime information, model availability, offline readiness, and latency benchmarks.
"""

from fastapi import APIRouter
import time
import os
import torch

router = APIRouter(prefix="/api", tags=["Health"])

START_TIME = time.time()


@router.get("/health")
async def health_check():
    """
    Returns server health, uptime, device availability, model readiness, and offline capability.
    """
    model_pt = os.path.exists("backend/app/models/keypoint_classifier.pt")
    model_sk = os.path.exists("backend/app/models/keypoint_classifier.joblib")
    cuda_available = torch.cuda.is_available()

    return {
        "status": "healthy",
        "app_name": "SAMVAD AI",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "offline_ready": True,
        "models": {
            "pytorch_model_available": model_pt,
            "sklearn_model_available": model_sk,
            "inference_device": "cuda" if cuda_available else "cpu"
        },
        "components": {
            "hand_detection": "MediaPipe Hands v1.1.0 (Local)",
            "classification": "PyTorch Keypoint MLP (Local)",
            "grammar_refinement": "Rule-based ISL Engine (Local / Offline)",
            "speech_synthesis": "Browser Web Speech API & Android TTS (Client-side)"
        }
    }
