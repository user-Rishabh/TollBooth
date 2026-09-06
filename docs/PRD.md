# Product Requirements Document (PRD)
## Tollbooth — Bot Attack & Behavioral Defense System

---

## 1. Problem Statement

IRCTC's Tatkal booking system opens a small, fixed number of emergency-quota seats at an exact timestamp (10:00 AM / 11:00 AM). Demand vastly exceeds supply, and automated bots — running on verified, Aadhaar-authenticated accounts — consistently outcompete genuine human travelers by completing the booking flow (CAPTCHA solve, form fill, submission) 10–100x faster than any human possibly can.

Identity verification (Aadhaar OTP) solves "is this a real, unique person" but does **not** solve "is this specific action, right now, being performed by that person's fingers or by a script running inside their authenticated session." That gap — continuous behavioral verification within an already-authenticated session — is the problem this project addresses.

This project is not an attempt to "fix IRCTC," and it never interacts with the real IRCTC system. It is a self-contained demonstration: build a target (including a mock Aadhaar-style identity layer, matching how the real system works), attack it with real automation, and defend it with a purpose-built behavioral detection layer.

## 2. Goals

- Build a minimal but functional Tatkal-style booking clone as an attack target, including a mock Aadhaar OTP authentication step, so the identity layer matches the real-world constraint the project is designed around
- Build real automated bot clients (not simulated data) that attack the clone using realistic strategies
- Build a multi-agent behavioral detection system (Tollbooth) that continuously scores a session from login onward — not just at one checkpoint — and distinguishes bot-driven sessions from genuine ones
- Produce a live, demoable before/after: run the attack, show Tollbooth catching it in real time on a dashboard
- Document the reasoning behind each design decision as a portfolio/interview narrative asset

## 3. Non-Goals

- Not attacking or interacting with the real IRCTC system in any way
- Not integrating with the real Aadhaar/UIDAI system — authentication is a **mock** OTP flow that mirrors the real one's shape (mobile number tied to account, OTP sent, OTP verified) without any real government API
- Not building a production-grade, IRCTC-scale system (no requirement to handle IRCTC's real peak concurrency)
- Not implementing full Tatkal realism beyond what's needed to demonstrate the attack/defense loop (no real payment gateway, no real PNR generation)
- Not building a general-purpose bot-detection SaaS product — scope is a focused demo tied to one booking flow

## 4. Users / Personas

| Persona | Description | Relevance to project |
|---|---|---|
| Genuine traveler | A real user logging in, verifying via mock Aadhaar OTP, and booking a ticket manually | Baseline traffic; must not be penalized by detection |
| Naive bot | Automated script with near-zero delay, no human-like behavior | Easiest case; should be caught almost immediately |
| Evasive bot | Automated script with randomized delays and simulated human-like timing/mouse movement | Harder case; requires the full ensemble and statistical timing checks to catch |
| Demo viewer (you, in an interview/portfolio review) | Watches the dashboard, observes real-time scoring and blocking decisions | The actual audience this whole system is built to convince |

## 5. Core User Stories

1. As a genuine user, I can log in, verify via a mock Aadhaar OTP step, search a train, and book a seat through a simple UI without friction.
2. As a naive bot, I can automate the entire booking flow via Playwright with no delay logic, including the OTP step (using a fixed/known mock OTP for test accounts).
3. As an evasive bot, I can automate the booking flow with randomized delays, simulated mouse movement, and "randomized" keystroke timing to try to evade detection.
4. As Tollbooth, I score every session continuously from the moment of login — not only at CAPTCHA or only at final submission — combining behavioral, network, and pattern signals.
5. As Tollbooth, when a session's combined risk score is ambiguous, I trigger a graduated response (soft challenge) rather than an outright block.
6. As the operator, I can watch a live dashboard showing every session, its component agent scores, its final decision, and a log of outcomes.

## 6. Feature Scope (MVP)

### 6.1 IRCTC Clone ("RailBook")
- **Mock Aadhaar authentication**: user enters a mock Aadhaar-linked mobile number → receives a mock OTP (displayed on-screen or logged server-side for test purposes, since there is no real SMS/UIDAI integration) → enters OTP to complete login
- Train search (seeded/hardcoded train list)
- Single "Book" action that decrements seat inventory
- Basic booking-window countdown (seats open at a configured time)

### 6.2 Bot Attack Layer
- Naive bot archetype: instant form-fill, zero delay, direct-to-submit, automates the mock OTP step using a known test OTP
- Evasive bot archetype: randomized inter-action delays, simulated mouse jitter, randomized CAPTCHA/keystroke delay
- Ability to run multiple concurrent bot sessions (distributed attack simulation)

### 6.3 Tollbooth (Defense)

**Mouse/Pointer Agent — checks:**
- Mouse movement present (or absent) before each field is focused
- Movement path shape (straight-line teleport vs. multi-point curved path)

**Keyboard/Typing Agent — checks:**
- Inter-field and inter-keystroke timing intervals
- Statistical shape of those intervals: coefficient of variation (catches uniform "randomized" bot delays, which are statistically too even to be human)
- Same-hand vs. cross-hand keystroke digraph timing (real typing has physical-keyboard-driven structure that naive randomized delays don't reproduce)
- Autocorrelation between consecutive timing gaps (human timing has rhythm/carry-over; independently re-rolled random delays don't)
- CAPTCHA solve time (as one weighted input, never a standalone threshold)
- Page-load-to-first-action delay

**Cross-Modal Consistency Check:**
- `consistency_score = 1 - |mouse_score - keyboard_score|`
- Verifies that mouse and keyboard timing dynamics correlate as coming from the same unified human actor

**Network Agent — checks:**
- Device/browser fingerprint correlation across sessions/accounts
- Shared fingerprint despite different account IDs or IPs
- Request rate per IP during the booking window
- Headless-browser / automation fingerprint indicators (e.g. `navigator.webdriver` flag, missing plugin lists)

**Pattern Agent — checks:**
- Sequence of page/API calls per session (skipped intermediate steps)
- Missing asset/page-load requests before a booking call (a real browser loads CSS/JS/images; a raw API-hammering bot skips this entirely)
- No dwell time on intermediate pages (e.g., jumping from OTP verification straight to a completed booking with no time spent on the seat-selection screen)
- Client-side event trust check (`isTrusted`) to flag naive extension-injected form values

**Orchestrator & Decision Engine:**
- Combines agent scores into one weighted `final_risk_score`, continuously updated from login through final submission
- No single signal can force a hard block — decision is always based on the combined score
- Graduated response: allow / soft challenge / block
- Tiered scoring: cheap statistical checks run synchronously in the request path; any heavier/ensemble-model analysis runs asynchronously for borderline cases

**Live Dashboard:**
- Real-time session feed via WebSocket
- Per-agent score breakdown per session
- Decision log (allow/challenge/block) for demo replay

## 7. Success Metrics

- Naive bot is reliably caught (near-100% detection) using simple signals (mouse movement, raw timing)
- Evasive bot is caught at a meaningfully higher rate once the statistical timing checks (CoV, digraph timing, autocorrelation) are added, versus relying on raw speed alone
- False-positive rate on simulated "fast but genuine" human sessions stays low
- Dashboard clearly and legibly demonstrates detection happening live, in real time, during a demo run

## 8. Assumptions & Constraints

- No real IRCTC or UIDAI/Aadhaar integration; both are self-contained mocks
- No requirement for production-scale concurrency handling
- Detection logic is statistical/rule-based (numpy/pandas/scikit-learn level), not deep learning
- Project must remain demoable end-to-end within a single local/dev environment (Docker Compose)

## 9. Risks

| Risk | Mitigation |
|---|---|
| Playwright-driven input is indistinguishable from real input at the browser-event level (`isTrusted: true`) | Rely on timing/behavioral ensemble scoring rather than event-trust checks alone |
| Evasive bot with well-tuned randomized delays could still slip through raw timing checks | Add statistical structure checks (CoV, digraph timing, autocorrelation) that a naive randomizer doesn't reproduce |
| Over-aggressive detection could penalize accessibility-tool users in the demo narrative | Document graduated-response philosophy explicitly; no hard block from a single signal |
| Mock Aadhaar OTP step could be mistaken for a real identity-verification claim | Clearly document in README/PRD that this is a simulated mock with no real UIDAI integration |
