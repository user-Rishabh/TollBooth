"""
Tollbooth Modality Scoring Agents:
- Mouse/Pointer Agent
- Keyboard/Typing Agent
- Cross-Modal Consistency Check
- Network/Device Agent
- Pattern/Navigation Agent
"""
try:
    from .mouse import score_mouse
    from .keyboard import score_keyboard
    from .consistency import compute_consistency
    from .network import score_network
    from .pattern import score_pattern
except (ImportError, ValueError):
    from mouse import score_mouse
    from keyboard import score_keyboard
    from consistency import compute_consistency
    from network import score_network
    from pattern import score_pattern

__all__ = [
    "score_mouse",
    "score_keyboard",
    "compute_consistency",
    "score_network",
    "score_pattern",
]
