"""
Cross-Modal Consistency Check:
Evaluates whether mouse and keyboard modalities correlate as coming from the same
underlying human state, catching independently fuzzed/randomized bot routines.

Formula:
  consistency_score = 1.0 - abs(mouse_score - keyboard_score)
Output: consistency_score (float, 0.0 to 1.0, higher = more consistent/human-like)
"""

def compute_consistency(mouse_score: float, keyboard_score: float) -> float:
    """
    Computes cross-modal consistency between mouse and keyboard scores.
    """
    diff = abs(mouse_score - keyboard_score)
    return max(0.0, min(1.0, 1.0 - diff))
