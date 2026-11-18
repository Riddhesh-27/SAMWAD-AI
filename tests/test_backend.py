"""
SAMVAD AI — Backend Unit & Integration Tests
Validates classifier inference, confidence rejection, stabilizer behavior, and offline grammar refinement.
"""

import pytest
import sys
import os
import numpy as np

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.services.classifier import SignClassifier
from app.services.stabilizer import PredictionStabilizer
from app.services.grammar_service import GrammarRefiner


class TestClassifier:
    @pytest.fixture(autouse=True)
    def setup_classifier(self):
        self.classifier = SignClassifier(models_dir="backend/app/models")

    def test_model_loaded(self):
        assert self.classifier.pytorch_model is not None or self.classifier.sklearn_model is not None
        classes = self.classifier.get_supported_classes()
        assert len(classes) == 26
        assert "A" in classes and "Z" in classes

    def test_prediction_output_shape(self):
        # 42 zero features (wrist at 0, all landmarks at 0)
        dummy_features = [0.0] * 42
        result = self.classifier.predict(dummy_features, custom_threshold=0.5)
        assert "confidence" in result
        assert "accepted" in result
        assert "top_candidates" in result
        assert len(result["top_candidates"]) == 3

    def test_confidence_rejection(self):
        # Extremely high threshold should reject
        dummy_features = [0.0] * 42
        result = self.classifier.predict(dummy_features, custom_threshold=0.999)
        assert result["accepted"] is False
        assert result["sign"] is None
        assert result["raw_sign"] is not None

    def test_invalid_feature_length(self):
        short_features = [0.0] * 10
        result = self.classifier.predict(short_features)
        assert result["accepted"] is False
        assert result["sign"] is None


class TestStabilizer:
    @pytest.fixture(autouse=True)
    def setup_stabilizer(self):
        self.stabilizer = PredictionStabilizer(window_size=4, stability_threshold=0.75, cooldown_seconds=0.5)

    def test_single_frame_not_ready(self):
        # Only 1 prediction in window of 4 shouldn't trigger ready_to_append
        res = self.stabilizer.add_prediction("A", 0.9)
        assert res["ready_to_append"] is False

    def test_stable_sequence_triggers_ready(self):
        # Feed 3 out of 4 'A' predictions
        self.stabilizer.add_prediction("A", 0.9)
        self.stabilizer.add_prediction("A", 0.9)
        res = self.stabilizer.add_prediction("A", 0.9)
        assert res["stability_score"] >= 0.75
        assert res["ready_to_append"] is True

    def test_cooldown_prevents_immediate_duplicate(self):
        # Reset to ensure clean state
        self.stabilizer.reset()
        # Feed 3 predictions
        self.stabilizer.add_prediction("B", 0.9)
        self.stabilizer.add_prediction("B", 0.9)
        res_ready = self.stabilizer.add_prediction("B", 0.9)
        assert res_ready["ready_to_append"] is True

        # Immediate next frame should be blocked by cooldown / hold-lock
        res_next = self.stabilizer.add_prediction("B", 0.9)
        assert res_next["in_cooldown"] is True
        assert res_next["ready_to_append"] is False

    def test_sustained_gesture_hold_lock(self):
        self.stabilizer.reset()
        # Feed 3 predictions to confirm
        self.stabilizer.add_prediction("C", 0.9)
        self.stabilizer.add_prediction("C", 0.9)
        res1 = self.stabilizer.add_prediction("C", 0.9)
        assert res1["ready_to_append"] is True

        # Keep holding the same sign for multiple frames - must remain locked and not append again
        for _ in range(5):
            res_hold = self.stabilizer.add_prediction("C", 0.9)
            assert res_hold["ready_to_append"] is False
            assert res_hold["is_locked"] is True

        # Lower hand (2 empty frames)
        self.stabilizer.add_prediction(None, 0.0)
        self.stabilizer.add_prediction(None, 0.0)

        # Show sign again - should be able to lock and append again
        self.stabilizer.add_prediction("C", 0.9)
        self.stabilizer.add_prediction("C", 0.9)
        res2 = self.stabilizer.add_prediction("C", 0.9)
        assert res2["ready_to_append"] is True


class TestGrammarRefiner:
    @pytest.fixture(autouse=True)
    def setup_refiner(self):
        self.refiner = GrammarRefiner()

    def test_fingerspelling_merging(self):
        text = "H E L L O"
        res = self.refiner.refine(text)
        assert "Hello" in res["refined_text"]

    def test_wh_question_inversion(self):
        res = self.refiner.refine("YOU NAME WHAT")
        assert res["refined_text"] == "What is your name?"

    def test_needs_wants_svo(self):
        res = self.refiner.refine("I WATER WANT")
        assert res["refined_text"] == "I would like some water, please."

    def test_copula_insertion(self):
        res = self.refiner.refine("ME HUNGRY")
        assert res["refined_text"] == "I am hungry."

    def test_bathroom_location(self):
        res = self.refiner.refine("WHERE BATHROOM")
        assert res["refined_text"] == "Where is the bathroom, please?"

    def test_empty_string(self):
        res = self.refiner.refine("")
        assert res["refined_text"] == ""

    def test_repeated_phrase_deduplication(self):
        res = self.refiner.refine("WELL DONE WELL DONE")
        assert res["refined_text"] == "Well done! Excellent work."

    def test_repeated_word_deduplication(self):
        res = self.refiner.refine("LIKE LIKE")
        assert res["refined_text"] == "Like."

    def test_repeated_greeting_deduplication(self):
        res = self.refiner.refine("HELLO HELLO")
        assert "Hello" in res["refined_text"]


class TestAPIEndpoints:
    @pytest.fixture(autouse=True)
    def setup_client(self):
        from starlette.testclient import TestClient
        from app.main import app
        self.client = TestClient(app)

    def test_root_and_health(self):
        res_root = self.client.get("/")
        assert res_root.status_code == 200
        assert res_root.json()["project"] == "SAMVAD AI"

        res_health = self.client.get("/api/health")
        assert res_health.status_code == 200
        assert res_health.json()["status"] == "healthy"
        assert res_health.json()["models"]["pytorch_model_available"] is True

    def test_classes_endpoint(self):
        res = self.client.get("/api/recognize/classes")
        assert res.status_code == 200
        data = res.json()
        assert data["total_classes"] == 42
        assert data["alphabet_classes_count"] == 26
        assert data["conversational_classes_count"] == 16
        assert len(data["classes"]) == 26

    def test_grammar_endpoint(self):
        res = self.client.post("/api/grammar/refine", json={"text": "YOU NAME WHAT", "mode": "manual"})
        assert res.status_code == 200
        assert res.json()["refined_text"] == "What is your name?"

    def test_landmark_recognition_endpoint(self):
        dummy_42d = [0.0] * 42
        res = self.client.post("/api/recognize/landmarks", json={"landmarks_42d": dummy_42d, "threshold": 0.0})
        assert res.status_code == 200
        data = res.json()
        assert "confidence" in data
        assert "accepted" in data
        assert "top_candidates" in data

    def test_landmark_recognition_mode(self):
        dummy_42d = [0.0] * 42
        res = self.client.post("/api/recognize/landmarks", json={"landmarks_42d": dummy_42d, "threshold": 0.0, "mode": "letters"})
        assert res.status_code == 200
        data = res.json()
        assert data["mode"] == "letters"

