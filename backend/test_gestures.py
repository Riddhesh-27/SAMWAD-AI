"""Test the gesture analyzer with synthetic landmark data."""
import sys
sys.path.insert(0, '.')
from app.services.gesture_analyzer import analyze_conversational_gesture

def make_hand(config):
    """
    Create 21 synthetic landmark dicts for testing.
    config: 'thumbs_up', 'hello', 'okay', 'peace', 'fist'
    """
    # Start with all fingers extended (a base open hand)
    # Wrist at (0.5, 0.8)
    wrist = {'x': 0.5, 'y': 0.8}
    
    if config == 'thumbs_up':
        # Thumb tip well above wrist, all fingers curled tight
        return [
            wrist,                              # 0 wrist
            {'x': 0.52, 'y': 0.73},            # 1 thumb CMC
            {'x': 0.54, 'y': 0.67},            # 2 thumb MCP
            {'x': 0.55, 'y': 0.58},            # 3 thumb IP
            {'x': 0.55, 'y': 0.47},            # 4 thumb TIP (HIGH UP)
            {'x': 0.52, 'y': 0.72},            # 5 index MCP
            {'x': 0.52, 'y': 0.74},            # 6 index PIP (curled back)
            {'x': 0.51, 'y': 0.76},            # 7 index DIP
            {'x': 0.50, 'y': 0.78},            # 8 index TIP (very close to wrist)
            {'x': 0.50, 'y': 0.72},            # 9 mid MCP
            {'x': 0.50, 'y': 0.74},            # 10 mid PIP
            {'x': 0.50, 'y': 0.76},            # 11 mid DIP
            {'x': 0.50, 'y': 0.78},            # 12 mid TIP
            {'x': 0.48, 'y': 0.72},            # 13 ring MCP
            {'x': 0.48, 'y': 0.74},            # 14 ring PIP
            {'x': 0.48, 'y': 0.76},            # 15 ring DIP
            {'x': 0.48, 'y': 0.78},            # 16 ring TIP
            {'x': 0.46, 'y': 0.73},            # 17 pinky MCP
            {'x': 0.46, 'y': 0.75},            # 18 pinky PIP
            {'x': 0.46, 'y': 0.77},            # 19 pinky DIP
            {'x': 0.46, 'y': 0.79},            # 20 pinky TIP
        ]
    
    elif config == 'open_palm_hello':
        # All 5 fingers fully extended, spread wide
        return [
            wrist,                              # 0 wrist
            {'x': 0.54, 'y': 0.73},            # 1 thumb CMC
            {'x': 0.57, 'y': 0.67},            # 2 thumb MCP
            {'x': 0.60, 'y': 0.60},            # 3 thumb IP
            {'x': 0.63, 'y': 0.53},            # 4 thumb TIP (extended)
            {'x': 0.55, 'y': 0.70},            # 5 index MCP
            {'x': 0.55, 'y': 0.60},            # 6 index PIP
            {'x': 0.55, 'y': 0.52},            # 7 index DIP
            {'x': 0.55, 'y': 0.44},            # 8 index TIP
            {'x': 0.50, 'y': 0.69},            # 9 mid MCP
            {'x': 0.50, 'y': 0.59},            # 10 mid PIP
            {'x': 0.50, 'y': 0.50},            # 11 mid DIP
            {'x': 0.50, 'y': 0.42},            # 12 mid TIP
            {'x': 0.45, 'y': 0.70},            # 13 ring MCP
            {'x': 0.45, 'y': 0.60},            # 14 ring PIP
            {'x': 0.45, 'y': 0.52},            # 15 ring DIP
            {'x': 0.45, 'y': 0.45},            # 16 ring TIP
            {'x': 0.40, 'y': 0.72},            # 17 pinky MCP
            {'x': 0.39, 'y': 0.64},            # 18 pinky PIP
            {'x': 0.38, 'y': 0.57},            # 19 pinky DIP
            {'x': 0.37, 'y': 0.51},            # 20 pinky TIP
        ]
    
    elif config == 'peace':
        # Index + middle up, ring + pinky curled
        return [
            wrist,
            {'x': 0.54, 'y': 0.73},            # 1 thumb CMC
            {'x': 0.56, 'y': 0.68},            # 2 thumb MCP
            {'x': 0.57, 'y': 0.64},            # 3 thumb IP
            {'x': 0.57, 'y': 0.61},            # 4 thumb TIP
            {'x': 0.54, 'y': 0.70},            # 5 index MCP
            {'x': 0.53, 'y': 0.60},            # 6 index PIP
            {'x': 0.52, 'y': 0.52},            # 7 index DIP
            {'x': 0.51, 'y': 0.44},            # 8 index TIP
            {'x': 0.50, 'y': 0.69},            # 9 mid MCP
            {'x': 0.49, 'y': 0.59},            # 10 mid PIP
            {'x': 0.48, 'y': 0.51},            # 11 mid DIP
            {'x': 0.47, 'y': 0.43},            # 12 mid TIP
            {'x': 0.46, 'y': 0.70},            # 13 ring MCP
            {'x': 0.46, 'y': 0.74},            # 14 ring PIP (curled)
            {'x': 0.46, 'y': 0.77},            # 15 ring DIP
            {'x': 0.46, 'y': 0.79},            # 16 ring TIP
            {'x': 0.43, 'y': 0.72},            # 17 pinky MCP
            {'x': 0.43, 'y': 0.76},            # 18 pinky PIP (curled)
            {'x': 0.43, 'y': 0.78},            # 19 pinky DIP
            {'x': 0.43, 'y': 0.79},            # 20 pinky TIP
        ]
    
    return None


print("=== Gesture Analyzer Tests ===")
cases = [
    ('thumbs_up', 'WELL DONE'),
    ('open_palm_hello', 'HELLO'),
    ('peace', 'PEACE'),
]
all_pass = True
for config, expected_sign in cases:
    lm = make_hand(config)
    if lm is None:
        print(f"  SKIP: {config} (no test data)")
        continue
    result = analyze_conversational_gesture(lm)
    if result is None:
        status = 'FAIL'
        all_pass = False
        print(f"  {status}: {config} => None (expected {expected_sign})")
    else:
        got = result['sign']
        status = 'PASS' if got == expected_sign else 'FAIL'
        if got != expected_sign:
            all_pass = False
        print(f"  {status}: {config} => {got} (conf={result['confidence']})")

print()
print('Result:', 'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED')
