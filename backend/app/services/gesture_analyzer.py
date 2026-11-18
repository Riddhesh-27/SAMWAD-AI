"""
SAMVAD AI — Conversational Word Gesture Analyzer (Two-Hand & Single-Hand)
Performs strict, high-precision geometric analysis on MediaPipe 21 hand keypoints.
Supports both dual-hand gestures (WANT, HELP, WHAT) and single-hand words.
Designed to completely eliminate false-positive jitter, guessing, and letter collisions.
"""

import math
from typing import Optional, Dict, Any, List


def dist_2d(p1: Dict[str, Any], p2: Dict[str, Any]) -> float:
    return math.sqrt((p1["x"] - p2["x"]) ** 2 + (p1["y"] - p2["y"]) ** 2)


def finger_is_extended(tip, pip, mcp, wrist, ratio_threshold=1.12) -> bool:
    """
    Returns True if the finger tip is significantly farther from wrist than its PIP joint.
    """
    tip_dist = dist_2d(tip, wrist)
    pip_dist = dist_2d(pip, wrist)
    if pip_dist < 0.01:
        return False
    return tip_dist > (pip_dist * ratio_threshold)


def finger_is_curled(tip, pip, mcp, wrist) -> bool:
    """
    Returns True if the finger is clearly curled (tip is close to palm / NOT extended).
    """
    return not finger_is_extended(tip, pip, mcp, wrist, ratio_threshold=1.04)


def analyze_single_hand_metrics(raw_landmarks: List[Dict[str, Any]]) -> Dict[str, Any]:
    wrist     = raw_landmarks[0]
    thumb_tip = raw_landmarks[4]
    thumb_ip  = raw_landmarks[3]
    thumb_mcp = raw_landmarks[2]

    idx_tip  = raw_landmarks[8]
    idx_pip  = raw_landmarks[7]
    idx_mcp  = raw_landmarks[5]

    mid_tip  = raw_landmarks[12]
    mid_pip  = raw_landmarks[11]
    mid_mcp  = raw_landmarks[9]

    ring_tip = raw_landmarks[16]
    ring_pip = raw_landmarks[15]
    ring_mcp = raw_landmarks[13]

    pinky_tip = raw_landmarks[20]
    pinky_pip = raw_landmarks[19]
    pinky_mcp = raw_landmarks[17]

    idx_ext   = finger_is_extended(idx_tip,   idx_pip,   idx_mcp,   wrist, 1.12)
    mid_ext   = finger_is_extended(mid_tip,   mid_pip,   mid_mcp,   wrist, 1.12)
    ring_ext  = finger_is_extended(ring_tip,  ring_pip,  ring_mcp,  wrist, 1.12)
    pinky_ext = finger_is_extended(pinky_tip, pinky_pip, pinky_mcp, wrist, 1.12)
    thumb_ext = finger_is_extended(thumb_tip, thumb_ip,  thumb_mcp, wrist, 1.10)

    idx_curled   = finger_is_curled(idx_tip,   idx_pip,   idx_mcp,   wrist)
    mid_curled   = finger_is_curled(mid_tip,   mid_pip,   mid_mcp,   wrist)
    ring_curled  = finger_is_curled(ring_tip,  ring_pip,  ring_mcp,  wrist)
    pinky_curled = finger_is_curled(pinky_tip, pinky_pip, pinky_mcp, wrist)

    thumb_pointing_up   = (thumb_tip["y"] < thumb_ip["y"] - 0.025) and (thumb_tip["y"] < idx_mcp["y"] - 0.035)
    thumb_pointing_down = (thumb_tip["y"] > thumb_ip["y"] + 0.025) and (thumb_tip["y"] > wrist["y"])

    # Cupped/clawed check: fingers semi-bent (neither straight nor clenched into tight fist)
    is_cupped = (
        (not idx_ext and not idx_curled and dist_2d(idx_tip, idx_mcp) > 0.04) or
        (not mid_ext and not mid_curled and dist_2d(mid_tip, mid_mcp) > 0.04)
    )

    return {
        "wrist": wrist,
        "thumb_tip": thumb_tip, "idx_tip": idx_tip, "mid_tip": mid_tip, "ring_tip": ring_tip, "pinky_tip": pinky_tip,
        "thumb_ip": thumb_ip, "idx_pip": idx_pip, "mid_pip": mid_pip, "ring_pip": ring_pip, "pinky_pip": pinky_pip,
        "idx_mcp": idx_mcp, "mid_mcp": mid_mcp, "ring_mcp": ring_mcp, "pinky_mcp": pinky_mcp,
        "idx_ext": idx_ext, "mid_ext": mid_ext, "ring_ext": ring_ext, "pinky_ext": pinky_ext, "thumb_ext": thumb_ext,
        "idx_curled": idx_curled, "mid_curled": mid_curled, "ring_curled": ring_curled, "pinky_curled": pinky_curled,
        "thumb_pointing_up": thumb_pointing_up, "thumb_pointing_down": thumb_pointing_down,
        "is_cupped": is_cupped
    }


def analyze_conversational_gesture(
    raw_landmarks: Optional[List[Dict[str, Any]]], 
    all_hands: Optional[List[List[Dict[str, Any]]]] = None
) -> Optional[Dict[str, Any]]:
    """
    High-precision conversational sign language word recognizer.
    Supports both 2-hand gestures (WANT, HELP, WHAT) and distinct single-hand words.
    """
    if not all_hands:
        if raw_landmarks and len(raw_landmarks) == 21:
            all_hands = [raw_landmarks]
        else:
            return None

    num_hands = len(all_hands)
    if num_hands == 0:
        return None

    # ══════════════════════════════════════════════════════════════════════════
    # A. TWO-HAND GESTURES (Primary for signs like WANT, HELP, WHAT)
    # ══════════════════════════════════════════════════════════════════════════
    if num_hands >= 2:
        h1 = analyze_single_hand_metrics(all_hands[0])
        h2 = analyze_single_hand_metrics(all_hands[1])

        # ── 1. WANT (🤲 Both hands cupped / clawed reaching forward and pulling) ──
        # In ASL/ISL: Both hands held forward, palms up/facing inward, fingers curved
        both_cupped = (h1["is_cupped"] or (not h1["idx_ext"] and not h1["idx_curled"])) and \
                      (h2["is_cupped"] or (not h2["idx_ext"] and not h2["idx_curled"]))
        # Palms facing generally upward (wrist lower than or level with palm center)
        palms_up = (h1["wrist"]["y"] >= h1["idx_mcp"]["y"] - 0.05) and (h2["wrist"]["y"] >= h2["idx_mcp"]["y"] - 0.05)
        
        if both_cupped and palms_up:
            return {
                "sign": "WANT",
                "raw_sign": "WANT",
                "display": "🤲 WANT",
                "confidence": 0.97,
                "category": "two_hand_word_sign"
            }

        # ── 2. HELP (🆘 Two hands: one flat palm up, other thumbs-up fist on it) ──
        # Hand 1 flat palm up + Hand 2 thumbs-up fist (or vice versa)
        h1_flat = h1["idx_ext"] and h1["mid_ext"] and h1["ring_ext"] and h1["pinky_ext"]
        h2_thumbs_up = h2["thumb_pointing_up"] and h2["idx_curled"] and h2["mid_curled"]
        h2_flat = h2["idx_ext"] and h2["mid_ext"] and h2["ring_ext"] and h2["pinky_ext"]
        h1_thumbs_up = h1["thumb_pointing_up"] and h1["idx_curled"] and h1["mid_curled"]

        if (h1_flat and h2_thumbs_up) or (h2_flat and h1_thumbs_up):
            return {
                "sign": "HELP",
                "raw_sign": "HELP",
                "display": "🆘 HELP",
                "confidence": 0.98,
                "category": "two_hand_word_sign"
            }

        # ── 3. WHAT (❓ Both hands open, palms facing upward) ─────────────────
        both_open = (h1["idx_ext"] and h1["mid_ext"] and h1["ring_ext"]) and \
                    (h2["idx_ext"] and h2["mid_ext"] and h2["ring_ext"])
        if both_open and palms_up:
            return {
                "sign": "WHAT",
                "raw_sign": "WHAT",
                "display": "❓ WHAT",
                "confidence": 0.96,
                "category": "two_hand_word_sign"
            }

    # ══════════════════════════════════════════════════════════════════════════
    # B. SINGLE-HAND WORD GESTURES (Strict, mutually exclusive geometric rules)
    # ══════════════════════════════════════════════════════════════════════════
    primary_hand = all_hands[0]
    h = analyze_single_hand_metrics(primary_hand)

    # ── 1. OKAY (👌 O-Ring with other 3 fingers raised straight up) ────────────
    touching_thumb_index = dist_2d(h["thumb_tip"], h["idx_tip"]) < 0.08
    if touching_thumb_index and h["mid_ext"] and h["ring_ext"] and h["pinky_ext"]:
        return {
            "sign": "OKAY",
            "raw_sign": "OKAY",
            "display": "👌 OKAY",
            "confidence": 0.96,
            "category": "word_sign"
        }

    # ── 2. FOOD / EAT (🍽️ All 5 fingertips pinched in a tight feeding cluster) ─
    all_tips_pinched = (
        dist_2d(h["thumb_tip"], h["idx_tip"]) < 0.065 and
        dist_2d(h["thumb_tip"], h["mid_tip"]) < 0.065 and
        dist_2d(h["thumb_tip"], h["ring_tip"]) < 0.075 and
        not h["idx_ext"] and not h["mid_ext"] and not h["ring_ext"]
    )
    if all_tips_pinched:
        return {
            "sign": "FOOD",
            "raw_sign": "FOOD",
            "display": "🍽️ FOOD",
            "confidence": 0.95,
            "category": "word_sign"
        }

    # ── 3. NO (❌ Thumb, Index, Middle tips snapping together) ────────────────
    no_snap = (
        dist_2d(h["thumb_tip"], h["idx_tip"]) < 0.065 and
        dist_2d(h["thumb_tip"], h["mid_tip"]) < 0.065 and
        h["ring_curled"] and h["pinky_curled"]
    )
    if no_snap:
        return {
            "sign": "NO",
            "raw_sign": "NO",
            "display": "❌ NO",
            "confidence": 0.95,
            "category": "word_sign"
        }

    # ── 4. I LOVE YOU (🤟 Thumb, Index, Pinky extended) ───────────────────────
    if h["thumb_ext"] and h["idx_ext"] and h["pinky_ext"] and h["mid_curled"] and h["ring_curled"]:
        return {
            "sign": "I LOVE YOU",
            "raw_sign": "I_LOVE_YOU",
            "display": "🤟 I LOVE YOU",
            "confidence": 0.97,
            "category": "word_sign"
        }

    # ── 5. CALL ME (🤙 Thumb + Pinky extended shaka) ──────────────────────────
    if h["thumb_ext"] and h["pinky_ext"] and h["idx_curled"] and h["mid_curled"] and h["ring_curled"]:
        return {
            "sign": "CALL ME",
            "raw_sign": "CALL_ME",
            "display": "🤙 CALL ME",
            "confidence": 0.96,
            "category": "word_sign"
        }

    # ── 6. WATER (💧 Three middle fingers extended straight up 'W' hand) ──────
    if h["idx_ext"] and h["mid_ext"] and h["ring_ext"] and h["pinky_curled"] and not h["thumb_pointing_up"]:
        return {
            "sign": "WATER",
            "raw_sign": "WATER",
            "display": "💧 WATER",
            "confidence": 0.96,
            "category": "word_sign"
        }

    # ── 7. PEACE (✌️ Index + Middle extended apart in wide V) ─────────────────
    if h["idx_ext"] and h["mid_ext"] and h["ring_curled"] and h["pinky_curled"]:
        v_spread = dist_2d(h["idx_tip"], h["mid_tip"])
        if v_spread > 0.055:
            return {
                "sign": "PEACE",
                "raw_sign": "PEACE",
                "display": "✌️ PEACE",
                "confidence": 0.96,
                "category": "word_sign"
            }
        else:
            # ── 8. NAME (🏷️ Index + Middle extended straight TOGETHER parallel) ─
            return {
                "sign": "NAME",
                "raw_sign": "NAME",
                "display": "🏷️ NAME",
                "confidence": 0.95,
                "category": "word_sign"
            }

    # ── 9. WELL DONE (👍 Unmistakable Thumbs Up) ──────────────────────────────
    if h["thumb_pointing_up"] and h["idx_curled"] and h["mid_curled"] and h["ring_curled"] and h["pinky_curled"]:
        return {
            "sign": "WELL DONE",
            "raw_sign": "WELL_DONE",
            "display": "👍 WELL DONE",
            "confidence": 0.96,
            "category": "word_sign"
        }

    # ── 10. DISAGREE (👎 Unmistakable Thumbs Down) ────────────────────────────
    if h["thumb_pointing_down"] and h["idx_curled"] and h["mid_curled"] and h["ring_curled"] and h["pinky_curled"]:
        return {
            "sign": "DISAGREE",
            "raw_sign": "DISAGREE",
            "display": "👎 DISAGREE",
            "confidence": 0.95,
            "category": "word_sign"
        }

    # ── 11. I / ME (🤙→☝️ Pinky finger extended straight up, all others curled) ─
    # Classic ASL "I" — raise your little (pinky) finger, keep all others curled.
    # Completely distinct from YOU (index up), CALL ME (thumb+pinky), WELL DONE (thumb up).
    if (h["pinky_ext"] and
            h["idx_curled"] and h["mid_curled"] and h["ring_curled"] and
            not h["thumb_pointing_up"] and not h["thumb_ext"]):
        # Pinky must be pointing upward (tip higher than pip in image coords = smaller y)
        if h["pinky_tip"]["y"] < h["pinky_pip"]["y"] - 0.02:
            return {
                "sign": "I",
                "raw_sign": "I",
                "display": "🙋 I (Me)",
                "confidence": 0.96,
                "category": "word_sign"
            }

    # ── 12. YOU (👉 Index finger ONLY extended, pointing forward/upward) ──────
    # Index up with all other fingers curled (and thumb NOT extended/pointing up).
    if (h["idx_ext"] and
            h["mid_curled"] and h["ring_curled"] and h["pinky_curled"] and
            not h["thumb_pointing_up"] and not h["thumb_ext"]):
        # Index tip must be pointing upward (tip y < pip y in image)
        if h["idx_tip"]["y"] < h["idx_pip"]["y"] - 0.02:
            return {
                "sign": "YOU",
                "raw_sign": "YOU",
                "display": "👉 YOU",
                "confidence": 0.96,
                "category": "word_sign"
            }

    # ── 13. HELLO (👋 Open wide palm held vertically upright facing camera) ────
    # Strictest criteria: Hand must be held vertical upright, all 5 fingers wide spread
    if h["idx_ext"] and h["mid_ext"] and h["ring_ext"] and h["pinky_ext"] and h["thumb_ext"]:
        spread_idx_pinky = dist_2d(h["idx_tip"], h["pinky_tip"])
        is_upright = h["wrist"]["y"] > h["idx_mcp"]["y"] + 0.08
        if is_upright and spread_idx_pinky > 0.16:
            return {
                "sign": "HELLO",
                "raw_sign": "HELLO",
                "display": "👋 HELLO",
                "confidence": 0.96,
                "category": "word_sign"
            }

    # ── 14. THANK YOU (🙏 Flat hand with 4 fingers together forward from chin) ─
    if h["idx_ext"] and h["mid_ext"] and h["ring_ext"] and h["pinky_ext"]:
        spread_idx_pinky = dist_2d(h["idx_tip"], h["pinky_tip"])
        # Fingers touching together (not spread)
        if spread_idx_pinky <= 0.12 and not h["thumb_pointing_up"]:
            return {
                "sign": "THANK YOU",
                "raw_sign": "THANK_YOU",
                "display": "🙏 THANK YOU",
                "confidence": 0.95,
                "category": "word_sign"
            }

    # ── 15. STOP (✊ Closed tight fist) ───────────────────────────────────────
    if h["idx_curled"] and h["mid_curled"] and h["ring_curled"] and h["pinky_curled"] and \
       not h["thumb_pointing_up"] and not h["thumb_ext"]:
        return {
            "sign": "STOP",
            "raw_sign": "STOP",
            "display": "✊ STOP",
            "confidence": 0.94,
            "category": "word_sign"
        }

    # ── 16. Single-hand WANT fallback (cupped palm facing upward) ─────────────
    if h["is_cupped"] and (h["wrist"]["y"] >= h["idx_mcp"]["y"] - 0.02) and not h["idx_curled"]:
        return {
            "sign": "WANT",
            "raw_sign": "WANT",
            "display": "🤲 WANT",
            "confidence": 0.93,
            "category": "word_sign"
        }

    return None
