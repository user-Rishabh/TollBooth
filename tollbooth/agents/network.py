"""
Network Agent:
Evaluates device/browser fingerprint clustering across accounts, request rate
per IP during the booking window, and headless browser automation flags.
Output: network_score (float, 0.0 to 1.0, higher = more bot-like)
"""
from typing import Dict, Any

BOT_USER_AGENTS = [
    "headlesschrome",
    "playwright",
    "puppeteer",
    "selenium",
    "phantomjs",
    "python-requests",
    "aiohttp",
    "httpx",
]

def score_network(session_context: Dict[str, Any]) -> float:
    """
    Evaluates network indicators, automation flags, and IP/fingerprint clustering.
    """
    if not session_context:
        return 0.2

    risk_score = 0.0

    # 1. Automation / Headless browser flags
    is_headless = session_context.get("is_headless") or session_context.get("webdriver")
    if is_headless:
        risk_score += 0.40

    user_agent = str(session_context.get("user_agent", "")).lower()
    for bot_sig in BOT_USER_AGENTS:
        if bot_sig in user_agent:
            risk_score += 0.45
            break

    # 2. IP velocity / request rate
    req_rate = session_context.get("request_rate_per_min", 0)
    if req_rate > 30:
        risk_score += 0.40
    elif req_rate > 15:
        risk_score += 0.20

    # 3. Fingerprint clustering across distinct accounts
    fp_accounts = session_context.get("fingerprint_account_count", 1)
    if fp_accounts > 3:
        # Same browser fingerprint booking under multiple user credentials
        risk_score += 0.35
    elif fp_accounts > 1:
        risk_score += 0.15

    return max(0.0, min(1.0, risk_score))
