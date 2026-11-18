"""
SAMVAD AI — Recognition API Routes
Handles webcam frame processing, direct landmark classification, stability filtering, and class metadata.
Integrates both Conversational Gesture Analysis (Thumbs Up, Hello, Peace, etc.) and PyTorch Keypoint Classifier.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import time

from app.services.landmark_extractor import HandLandmarkExtractor
from app.services.classifier import SignClassifier
from app.services.stabilizer import PredictionStabilizer
from app.services.gesture_analyzer import analyze_conversational_gesture

router = APIRouter(prefix="/api", tags=["Recognition"])

# Initialize singletons
extractor = HandLandmarkExtractor()
classifier = SignClassifier()
stabilizer = PredictionStabilizer()

CONVERSATIONAL_SIGNS = [
    {"sign": "WELL DONE", "display": "👍 WELL DONE", "description": "Thumb pointing straight up, fingers curled"},
    {"sign": "DISAGREE", "display": "👎 DISAGREE / BAD", "description": "Thumb pointing down, fingers curled"},
    {"sign": "HELLO", "display": "👋 HELLO", "description": "All 5 fingers extended open wide toward camera"},
    {"sign": "THANK YOU", "display": "🙏 THANK YOU", "description": "Flat hand with 4 fingers together forward"},
    {"sign": "YOU", "display": "👉 YOU", "description": "Index finger pointing forward toward camera"},
    {"sign": "I", "display": "🙋 I (Me)", "description": "Index finger pointing inward to chest/self"},
    {"sign": "WANT", "display": "🤲 WANT", "description": "Cupped reaching hand with curved pulling fingers"},
    {"sign": "WATER", "display": "💧 WATER", "description": "Three middle fingers extended up forming 'W' sign"},
    {"sign": "FOOD", "display": "🍽️ FOOD", "description": "Fingertips grouped together touching at thumb tip"},
    {"sign": "NAME", "display": "🏷️ NAME", "description": "Index and middle fingers extended together parallel"},
    {"sign": "PEACE", "display": "✌️ PEACE", "description": "Index and middle fingers extended apart in a V"},
    {"sign": "OKAY", "display": "👌 OKAY", "description": "Thumb and index tips touching, 3 fingers up"},
    {"sign": "I LOVE YOU", "display": "🤟 I LOVE YOU", "description": "Thumb, index, and pinky fingers extended"},
    {"sign": "CALL ME", "display": "🤙 CALL ME", "description": "Thumb and pinky extended, other fingers curled"},
    {"sign": "STOP", "display": "✊ STOP", "description": "All fingers clenched into a closed fist"},
    {"sign": "NO", "display": "❌ NO", "description": "Thumb, index, and middle fingertips snapping together"}
]


class FrameRecognitionRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG or PNG webcam frame")
    threshold: Optional[float] = Field(0.60, ge=0.0, le=1.0, description="Confidence rejection threshold")
    mode: Optional[str] = Field("auto", description="Recognition mode: 'auto' (smart hybrid), 'letters' (A-Z fingerspelling), or 'words' (conversational gestures)")


class LandmarkRecognitionRequest(BaseModel):
    landmarks_42d: List[float] = Field(..., description="42-element normalized landmark array")
    threshold: Optional[float] = Field(0.60, ge=0.0, le=1.0, description="Confidence rejection threshold")
    mode: Optional[str] = Field("auto", description="Recognition mode: 'auto' (smart hybrid), 'letters' (A-Z fingerspelling), or 'words' (conversational gestures)")


class CustomSignRecordRequest(BaseModel):
    label: str = Field(..., min_length=1, max_length=50)
    landmarks_42d: List[float] = Field(..., min_length=42, max_length=42)


@router.post("/recognize/frame")
async def recognize_frame(payload: FrameRecognitionRequest):
    """
    Decodes webcam frame, extracts MediaPipe hand landmarks, classifies gesture, and applies temporal stabilization.
    Seamlessly recognizes both conversational signs (Thumbs Up, Hello, etc.) and alphabet signs (A-Z).
    """
    img = extractor.decode_base64_image(payload.image)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid or unreadable base64 image data")

    extraction = extractor.extract_landmarks(img)
    if extraction is None:
        # No hand detected
        stabilizer_state = stabilizer.add_prediction(None, 0.0)
        return {
            "hand_detected": False,
            "sign": None,
            "confidence": 0.0,
            "accepted": False,
            "message": "No hand detected in frame",
            "stabilizer": stabilizer_state,
            "landmarks": [],
            "bbox": None
        }

    raw_landmarks = extraction["raw_landmarks"]
    all_hands = extraction.get("all_hands") or [raw_landmarks]
    num_hands = extraction.get("num_hands", len(all_hands))

    # Conversational Word Signs Recognition (Single-hand and Dual-hand support)
    # Complete removal of letter recognition to eliminate false positives and collisions
    conv_gesture = analyze_conversational_gesture(raw_landmarks, all_hands=all_hands)
    if conv_gesture and conv_gesture["confidence"] >= payload.threshold:
        classification = {
            "sign": conv_gesture["sign"],
            "raw_sign": conv_gesture["raw_sign"],
            "display": conv_gesture["display"],
            "confidence": conv_gesture["confidence"],
            "accepted": True,
            "rejection_threshold": payload.threshold,
            "top_candidates": [{"sign": conv_gesture["sign"], "confidence": conv_gesture["confidence"]}],
            "backend": "conversational_gesture_analyzer"
        }
    else:
        classification = {
            "sign": None,
            "raw_sign": None,
            "display": None,
            "confidence": 0.0,
            "accepted": False,
            "rejection_threshold": payload.threshold,
            "top_candidates": [],
            "backend": "conversational_gesture_analyzer"
        }

    # Filter with temporal stabilizer
    sign_for_buffer = classification["sign"] if classification["accepted"] else None
    stabilizer_state = stabilizer.add_prediction(sign_for_buffer, classification["confidence"])

    return {
        "hand_detected": True,
        "num_hands": num_hands,
        "all_landmarks": all_hands,
        "all_bboxes": extraction.get("all_bboxes", []),
        "handedness": extraction["handedness"],
        "sign": classification.get("sign"),
        "raw_sign": classification.get("raw_sign") or classification.get("sign"),
        "display": classification.get("display") or classification.get("sign"),
        "confidence": classification.get("confidence", 0.0),
        "accepted": classification.get("accepted", False),
        "rejection_threshold": classification.get("rejection_threshold", payload.threshold),
        "top_candidates": classification.get("top_candidates", []),
        "backend": classification.get("backend", "unknown"),
        "stabilizer": stabilizer_state,
        "landmarks": extraction["raw_landmarks"],
        "bbox": extraction["bbox"]
    }


@router.post("/recognize/landmarks")
async def recognize_landmarks(payload: LandmarkRecognitionRequest):
    """
    Direct landmark endpoint for client-side MediaPipe instances (zero-latency lightweight classification).
    """
    req_mode = (payload.mode or "auto").strip().lower()
    classification = classifier.predict(payload.landmarks_42d, custom_threshold=payload.threshold)
    sign_for_buffer = classification["sign"] if classification["accepted"] else None
    stabilizer_state = stabilizer.add_prediction(sign_for_buffer, classification["confidence"])

    return {
        "mode": req_mode,
        "sign": classification["sign"],
        "raw_sign": classification["raw_sign"],
        "confidence": classification["confidence"],
        "accepted": classification["accepted"],
        "top_candidates": classification["top_candidates"],
        "backend": classification["backend"],
        "stabilizer": stabilizer_state
    }


@router.post("/stabilizer/reset")
async def reset_stabilizer():
    """Resets the temporal stabilization buffer and cooldown timer."""
    stabilizer.reset()
    return {"status": "success", "message": "Stabilizer history reset"}


@router.get("/recognize/classes")
async def get_supported_classes():
    """Returns the list of verified, supported conversational sign classes."""
    alphabet_classes = classifier.get_supported_classes()
    return {
        "classes": [s["sign"] for s in CONVERSATIONAL_SIGNS],
        "conversational_signs": CONVERSATIONAL_SIGNS,
        "total_classes": len(CONVERSATIONAL_SIGNS),
        "conversational_classes_count": len(CONVERSATIONAL_SIGNS),
        "alphabet_classes": alphabet_classes,
        "metadata": classifier.get_metadata()
    }


@router.post("/signs/record")
async def record_custom_sign(payload: CustomSignRecordRequest):
    """
    Appends a user-recorded sign landmark sample to custom_signs.csv for retraining.
    """
    custom_csv = "dataset/custom_signs.csv"
    os.makedirs("dataset", exist_ok=True)
    coords_str = ",".join(str(round(v, 6)) for v in payload.landmarks_42d)
    line = f"{payload.label.strip().upper()},{coords_str}\n"

    with open(custom_csv, "a", encoding="utf-8") as f:
        f.write(line)

    return {
        "status": "success",
        "message": f"Sample recorded for class '{payload.label.upper()}'",
        "file": custom_csv
    }
