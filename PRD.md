# Product Requirements Document (PRD)
## TollBooth


---

## 1. Problem Statement

IRCTC's Tatkal booking system opens a small, fixed number of emergency-quota seats at an exact timestamp (10:00 AM / 11:00 AM). Demand vastly exceeds supply, and automated bots — running on verified, Aadhaar-authenticated accounts — consistently outcompete genuine human travelers by completing the booking flow (CAPTCHA solve, form fill, submission) 10–100x faster than any human possibly can.

Identity verification (Aadhaar OTP) solves "is this a real, unique person" but does **not** solve "is this specific action, right now, being performed by that person's fingers or by a script running inside their authenticated session." That gap — continuous behavioral verification within an already-authenticated session — is the problem this project addresses.

This project is not an attempt to "fix IRCTC." It is a self-contained demonstration system: build a target, attack it with real automation, and defend it with a purpose-built detection layer — to showcase applied security engineering, adversarial thinking, and full-stack execution.

## 2. Goals

- Build a minimal but functional Tatkal-style booking clone as an attack target
- Build real automated bot clients (not simulated data) that attack the clone using realistic strategies
- Build a multi-agent behavioral detection system ("TollBooth") that scores live traffic and distinguishes bot-driven sessions from genuine ones
- Produce a live, demoable before/after: run the attack, show Guardian catching it in real time on a dashboard
- Document the reasoning behind each design decision (why naive approaches fail, why ensemble scoring is used) as a portfolio/interview narrative asset

## 3. Non-Goals

- Not attacking or interacting with the real IRCTC system in any way
- Not building a production-grade, IRCTC-scale system (no requirement to handle 32,000 req/min)
- Not implementing full Tatkal realism (no real payment gateway, no real Aadhaar integration, no real PNR generation)
- Not building a general-purpose bot-detection SaaS product — scope is a focused demo tied to one booking flow

## 4. Users / Personas

| Persona | Description | Relevance to project |
|---|---|---|
| Genuine traveler | A real user booking a ticket manually through the UI | Baseline traffic; must not be penalized by detection |
| Naive bot | Automated script with near-zero delay, no human-like behavior | Easiest case; should be caught by simple signals |
| Evasive bot | Automated script with randomized delays, simulated human-like timing | Harder case; requires ensemble scoring to catch |
| Guardian operator (you, in demo) | Watches the dashboard, observes real-time scoring and blocking decisions | Demo audience / portfolio reviewer standpoint |

## 5. Core User Stories

1. As a genuine user, I can log in, search a train, and book a seat through a simple UI without friction.
2. As a naive bot, I can automate the entire booking flow via Playwright with no delay logic.
3. As an evasive bot, I can automate the booking flow with randomized delays and simulated mouse movement to try to evade detection.
4. As the Guardian system, I can score every incoming session in real time using multiple independent signals and produce a single risk score.
5. As the Guardian operator, I can watch a live dashboard showing every session, its component agent scores, its final decision (allow / challenge / block), and a log of outcomes.
6. As the Guardian system, when a session is ambiguous, I trigger a graduated response (soft challenge) rather than an outright block, to protect accessibility.

## 6. Feature Scope (MVP)

### 6.1 IRCTC Clone
- Login (mock authentication, no real OTP)
- Train search (seeded/hardcoded train list)
- Single "Book" action that decrements seat inventory
- Basic booking-window countdown (seats open at a configured time)

### 6.2 Bot Attack Layer
- Naive bot archetype: instant form-fill, zero delay, direct-to-submit
- Evasive bot archetype: randomized inter-action delays, simulated mouse jitter, randomized CAPTCHA solve delay
- Ability to run multiple concurrent bot sessions (distributed attack simulation)

### 6.3 Smart Tatkal Guardian (Defense)
- Behavioral Agent — CAPTCHA solve time, inter-field timing, mouse-movement-before-focus
- Network Agent — device/session fingerprint correlation across "different" accounts
- Pattern Agent — sequence/navigation anomalies (skipped intermediate steps)
- Orchestrator — combines agent scores into one weighted risk score
- Decision Engine — maps risk score to action: allow / soft challenge / block
- Live Dashboard — real-time session feed, per-agent scores, decision log

## 7. Success Metrics (for a portfolio/demo context)

- Naive bot is reliably caught (near-100% detection) using simple signals
- Evasive bot is caught at a meaningfully higher rate using ensemble scoring vs. any single signal alone
- False-positive rate on simulated "fast but genuine" human sessions stays low
- Dashboard clearly and legibly demonstrates detection happening live, in real time, during a demo run

## 8. Assumptions & Constraints

- No real IRCTC integration; clone is a self-contained standalone system
- No requirement for production-scale concurrency handling
- Detection logic is statistical/rule-based (numpy/pandas/scikit-learn level), not deep learning — signal is timing/behavior based, not requiring heavy models
- Project must remain demoable end-to-end within a single local/dev environment (Docker Compose)

## 9. Risks

| Risk | Mitigation |
|---|---|
| Playwright-driven input may be indistinguishable from real input at the browser-event level (`isTrusted: true`) | Rely on timing/behavioral ensemble scoring rather than event-trust checks alone |
| Evasive bot with well-tuned randomized delays could still slip through | Combine multiple independent signal types (behavioral + network + pattern) so evasion requires beating all simultaneously |
| Over-aggressive detection could "block" accessibility-tool users in the demo narrative | Document graduated-response philosophy explicitly as a design principle, not just an afterthought |
