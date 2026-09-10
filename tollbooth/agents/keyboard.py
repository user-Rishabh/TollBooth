"""
Keyboard/Typing Agent:
Analyzes inter-field timing, inter-keystroke timing, Coefficient of Variation (CoV),
autocorrelation of consecutive gaps, page-load-to-first-action delay, and CAPTCHA solve duration.
Output: keyboard_score (float, 0.0 to 1.0, higher = more bot-like)
"""
import math
from typing import Dict, Any, List

def score_keyboard(metadata: Dict[str, Any]) -> float:
    """
    Evaluates typing cadence, intervals, and rhythm to detect automated inputs.
    """
    if not metadata:
        return 0.5

    risk_score = 0.0

    # 1. Page-load-to-first-action delay
    first_action_ms = metadata.get("page_load_to_first_action_ms")
    if first_action_ms is not None:
        if first_action_ms < 120:
            # Script acting instantaneously on DOM ready
            risk_score += 0.35
        elif 600 <= first_action_ms <= 8000:
            # Typical human cognitive dwell before action
            risk_score -= 0.10

    # 2. Inter-keystroke intervals
    keystroke_intervals: List[float] = [
        float(x) for x in metadata.get("inter_keystroke_intervals_ms", []) if x is not None
    ]

    if not keystroke_intervals:
        # Zero keystroke intervals captured for a form submission
        risk_score += 0.40
    else:
        n = len(keystroke_intervals)
        mean_interval = sum(keystroke_intervals) / n

        # Inhuman speed check: < 35ms per keystroke (faster than 280 WPM)
        if mean_interval < 35:
            risk_score += 0.60
        elif 80 <= mean_interval <= 350:
            # Human typing speed
            risk_score -= 0.10

        # Variance & Coefficient of Variation (CoV = std_dev / mean)
        if n >= 3 and mean_interval > 0:
            variance = sum((x - mean_interval) ** 2 for x in keystroke_intervals) / n
            std_dev = math.sqrt(variance)
            cov = std_dev / mean_interval

            if cov < 0.10:
                # Robotic / fixed uniform delay
                risk_score += 0.45
            elif 0.30 <= cov <= 0.85:
                # Natural human variability
                risk_score -= 0.15

            # Autocorrelation of consecutive gaps (r_lag1)
            if n >= 4 and std_dev > 0:
                xs = keystroke_intervals[:-1]
                ys = keystroke_intervals[1:]
                mean_x = sum(xs) / len(xs)
                mean_y = sum(ys) / len(ys)
                
                denom_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs))
                denom_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys))

                if denom_x > 0 and denom_y > 0:
                    cov_xy = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(len(xs)))
                    r_lag1 = cov_xy / (denom_x * denom_y)

                    # Pure independently randomized bot delays have r_lag1 near 0 with flat distribution
                    if abs(r_lag1) < 0.03 and cov < 0.25:
                        risk_score += 0.25

    # 3. Inter-field timing if present
    field_intervals: List[float] = [
        float(x) for x in metadata.get("inter_field_intervals_ms", []) if x is not None
    ]
    if field_intervals:
        avg_field_gap = sum(field_intervals) / len(field_intervals)
        if avg_field_gap < 50:
            risk_score += 0.30

    # 4. CAPTCHA solve duration if present
    captcha_time = metadata.get("captcha_solve_time_ms")
    if captcha_time is not None:
        if captcha_time < 400:
            risk_score += 0.40
        elif captcha_time > 1500:
            risk_score -= 0.10

    return max(0.0, min(1.0, risk_score))
