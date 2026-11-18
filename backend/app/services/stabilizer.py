"""
SAMVAD AI — Prediction Stabilizer & Cooldown Filter
Prevents erratic frame jitter, calculates multi-frame stability score, and prevents rapid-fire duplicate word spamming.
"""

import time
from collections import deque, Counter
from typing import Optional, Dict, Any, List


class PredictionStabilizer:
    def __init__(self, window_size: int = 5, stability_threshold: float = 0.80, cooldown_seconds: float = 2.0):
        self.window_size = window_size
        self.stability_threshold = stability_threshold
        self.cooldown_seconds = cooldown_seconds
        self.history: deque = deque(maxlen=window_size)
        self.last_confirmed_sign: Optional[str] = None
        self.last_confirmed_time: float = 0.0
        self.locked_sign: Optional[str] = None
        self.consecutive_empty_frames: int = 0

    def add_prediction(self, sign: Optional[str], confidence: float) -> Dict[str, Any]:
        """
        Ingests a frame prediction.
        Returns stabilized sign, current stability percentage, and whether it's ready to be auto-appended.
        Maintains sustained gesture hold-lock to prevent repeating identical words when held continuously.
        """
        now = time.time()

        if sign is None or confidence < 0.5:
            self.history.append(None)
            self.consecutive_empty_frames += 1
            # Release hold-lock only if hand is absent or dropped for 3+ frames AND cooldown passed
            if self.consecutive_empty_frames >= 3 and (now - self.last_confirmed_time >= self.cooldown_seconds):
                self.locked_sign = None
                self.last_confirmed_sign = None
        else:
            self.history.append(sign)
            self.consecutive_empty_frames = 0
            # Release hold-lock if user actively changed to a different gesture
            if self.locked_sign and sign != self.locked_sign:
                self.locked_sign = None

        # Count frequencies in recent window
        valid_predictions = [s for s in self.history if s is not None]
        if not valid_predictions:
            return {
                "stabilized_sign": None,
                "stability_score": 0.0,
                "ready_to_append": False,
                "in_cooldown": False,
                "is_locked": False,
                "message": "No stable hand detected"
            }

        counts = Counter(valid_predictions)
        most_common_sign, count = counts.most_common(1)[0]
        stability_score = round(count / self.window_size, 3)

        # Check if stability meets threshold
        is_stable = stability_score >= self.stability_threshold

        # Hold-lock check: prevent duplicate emitting as long as the exact same gesture is held
        is_locked = (self.locked_sign == most_common_sign)

        # Check cooldown timer
        in_cooldown = (most_common_sign == self.last_confirmed_sign) and (now - self.last_confirmed_time < self.cooldown_seconds)

        ready_to_append = is_stable and not is_locked and not in_cooldown

        if ready_to_append:
            self.last_confirmed_sign = most_common_sign
            self.last_confirmed_time = now
            self.locked_sign = most_common_sign

        return {
            "stabilized_sign": most_common_sign if is_stable else None,
            "raw_candidate": most_common_sign,
            "stability_score": stability_score,
            "ready_to_append": ready_to_append,
            "in_cooldown": in_cooldown or is_locked,
            "is_locked": is_locked,
            "cooldown_remaining": max(0.0, round(self.cooldown_seconds - (now - self.last_confirmed_time), 1)) if in_cooldown else 0.0
        }

    def reset(self):
        """Clears the history and cooldown lock."""
        self.history.clear()
        self.last_confirmed_sign = None
        self.last_confirmed_time = 0.0
        self.locked_sign = None
        self.consecutive_empty_frames = 0
