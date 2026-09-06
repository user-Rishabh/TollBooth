"""
Tollbooth Orchestrator:
Combines modal agent scores and cross-modal consistency into a unified final_risk_score.

Formula:
  final_risk_score = w1*mouse_score + w2*keyboard_score + w3*(1 - consistency_score)
                    + w4*network_score + w5*pattern_score
"""

class Orchestrator:
    def __init__(
        self,
        w_mouse: float = 0.25,
        w_keyboard: float = 0.25,
        w_inconsistency: float = 0.20,
        w_network: float = 0.15,
        w_pattern: float = 0.15,
    ):
        self.w_mouse = w_mouse
        self.w_keyboard = w_keyboard
        self.w_inconsistency = w_inconsistency
        self.w_network = w_network
        self.w_pattern = w_pattern

    def calculate_risk(
        self,
        mouse_score: float,
        keyboard_score: float,
        consistency_score: float,
        network_score: float,
        pattern_score: float,
    ) -> float:
        inconsistency_risk = 1.0 - consistency_score
        raw_score = (
            self.w_mouse * mouse_score
            + self.w_keyboard * keyboard_score
            + self.w_inconsistency * inconsistency_risk
            + self.w_network * network_score
            + self.w_pattern * pattern_score
        )
        return max(0.0, min(1.0, raw_score))
