"""
Pattern Agent:
Evaluates flow sequence anomalies, skipped intermediate pages, missing asset
requests (CSS/JS/images), dwell time on intermediate screens, and isTrusted event checks.
Output: pattern_score (float, 0.0 to 1.0, higher = more bot-like)
"""
from typing import Dict, Any

def score_pattern(flow_context: Dict[str, Any]) -> float:
    """
    Placeholder calculation for pattern_score.
    """
    return 0.0
