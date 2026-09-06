"""
Tollbooth Decision Engine:
Maps final_risk_score to allow / challenge / block using graduated response thresholds.
No single agent can force a hard block.
"""
from enum import Enum

class Decision(str, Enum):
    ALLOW = "allow"
    CHALLENGE = "challenge"
    BLOCK = "block"

class DecisionEngine:
    def __init__(self, t_low: float = 0.35, t_high: float = 0.70):
        self.t_low = t_low
        self.t_high = t_high

    def decide(self, final_risk_score: float) -> Decision:
        if final_risk_score < self.t_low:
            return Decision.ALLOW
        elif final_risk_score < self.t_high:
            return Decision.CHALLENGE
        else:
            return Decision.BLOCK
