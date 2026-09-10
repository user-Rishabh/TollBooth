"""
Mouse/Pointer Agent:
Analyzes mouse movement prior to field focus, trajectory curvature,
jitter, and teleportation artifacts.
Output: mouse_score (float, 0.0 to 1.0, higher = more bot-like)
"""
import math
from typing import Dict, Any, List

def score_mouse(metadata: Dict[str, Any]) -> float:
    """
    Evaluates cursor movement dynamics to detect automated pointer behavior.
    """
    if not metadata:
        # Default moderate-low assumption if no metadata provided
        return 0.5

    risk_score = 0.0

    # 1. Check movement before focus
    movement_before_focus = metadata.get("mouse_movement_before_focus")
    if movement_before_focus is False:
        # High confidence signal: automated fill without pointer navigation
        risk_score += 0.55
    elif movement_before_focus is True:
        risk_score -= 0.15

    # 2. Check mouse trajectory if captured
    trajectory: List[Dict[str, Any]] = metadata.get("mouse_trajectory", [])
    if not trajectory or len(trajectory) < 2:
        if movement_before_focus is False:
            risk_score += 0.35
    else:
        # Calculate total path length vs Euclidean distance between start and end
        total_distance = 0.0
        max_speed = 0.0
        straight_segments = 0

        for i in range(1, len(trajectory)):
            p1 = trajectory[i - 1]
            p2 = trajectory[i]
            dx = p2.get("x", 0) - p1.get("x", 0)
            dy = p2.get("y", 0) - p1.get("y", 0)
            dt = max(1, p2.get("t", 0) - p1.get("t", 0))
            dist = math.hypot(dx, dy)
            total_distance += dist

            speed_px_per_sec = (dist / dt) * 1000.0
            if speed_px_per_sec > max_speed:
                max_speed = speed_px_per_sec

        start_p = trajectory[0]
        end_p = trajectory[-1]
        direct_dist = math.hypot(
            end_p.get("x", 0) - start_p.get("x", 0),
            end_p.get("y", 0) - start_p.get("y", 0),
        )

        # Unnaturally straight path (bots moving in pure linear math)
        if direct_dist > 50 and total_distance > 0:
            curvature_ratio = total_distance / direct_dist
            if curvature_ratio < 1.02:
                # Perfect or near-perfect straight line is bot-like
                risk_score += 0.30
            elif 1.05 <= curvature_ratio <= 2.5:
                # Natural human curved trajectory with slight overshoot
                risk_score -= 0.15

        # Instantaneous teleportation (> 8000 px/sec)
        if max_speed > 8000:
            risk_score += 0.30

    return max(0.0, min(1.0, risk_score))
