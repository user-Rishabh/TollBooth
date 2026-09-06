<p align="center">
  <img src="assets/banner.svg" alt="Tollbooth banner" width="100%">
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com/api?font=Fira+Code&size=20&pause=1200&color=F2A541&center=true&vCenter=true&width=560&lines=Build+the+target...;Attack+it+for+real...;Defend+it+with+behavior%2C+not+identity." alt="Typing SVG" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=0d1b2a">
  <img src="https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white">
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=0d1b2a">
  <img src="https://img.shields.io/badge/status-solo%20build-f2a541">
</p>

---

## 🚦 The problem

IRCTC's Tatkal booking window opens a small number of emergency-quota seats at an exact timestamp. Bots — running on already-verified, Aadhaar-authenticated accounts — complete the booking flow 10 to 100x faster than any human, because identity verification only proves a real person unlocked the session *once*. It says nothing about whether the actions happening inside that session, milliseconds later, are human or scripted.

**Tollbooth** is built around that exact gap: continuous behavioral verification within an already-authenticated session, not a one-time identity check.

## 🚂 How it works

Three independent modules, run like a checkpoint on a rail line — every request has to pass through the booth before it reaches the platform:

1. **Clone** — a minimal booking target with a **mock Aadhaar-style OTP login** (linked mobile → OTP → verify, mirroring the real flow's shape with no actual UIDAI integration), train search, and a book button
2. **Bots** — Playwright-driven attackers: naive (zero delay) and evasive (randomized delay, simulated human-like timing)
3. **Tollbooth** (the defense) — scores every session continuously **from the moment of login**, across three independent agents, and combines them into one weighted risk score before deciding: allow, challenge, or block

```
User / Bot → Login + OTP → Clone Frontend → Tollbooth Middleware → Decision Engine → Clone Backend
                                                    │
                                                    ├── Behavioral Agent  (mouse movement, keystroke timing structure, captcha timing)
                                                    ├── Network Agent     (IP / device fingerprint clustering)
                                                    ├── Pattern Agent     (skipped or out-of-order steps)
                                                    └── Live Dashboard    (WebSocket feed of every decision)
```

No single agent can force a hard block on its own — a bot has to fool all three at once, and any risky-but-ambiguous session gets a soft challenge instead of an outright rejection, so genuine users (including those on assistive tech) never get punished by one noisy signal.

## 🔍 What Tollbooth actually checks

**Behavioral Agent**
- Mouse movement before each field is focused (or absence of it)
- Inter-field and inter-keystroke timing
- Coefficient of variation of those intervals — catches "randomized" bot delays that are statistically too even to be human
- Same-hand vs. cross-hand keystroke digraph timing — real typing has physical-keyboard structure a naive randomizer doesn't reproduce
- Autocorrelation between consecutive timing gaps — human timing has rhythm; independently re-rolled random delays don't
- CAPTCHA solve time (one weighted input, never a standalone threshold)
- Page-load-to-first-action delay

**Network Agent**
- Device/browser fingerprint clustering across accounts
- Request rate per IP during the booking window
- Headless/automation indicators (weak signal, low weight)

**Pattern Agent**
- Skipped or out-of-order steps in the session
- Missing page/asset loads before a booking call
- No dwell time on intermediate screens
- Client-side `isTrusted` event check (catches naive extension-autofill bots; documented as not catching Playwright, which is natively trusted)

Full detail on each check, plus the scoring formula and thresholds, is in [`docs/TRD.md`](./docs/TRD.md).

## 🎫 Tech stack

| Layer | Choice |
|---|---|
| Clone frontend | React + Vite + TypeScript + Tailwind CSS |
| Clone backend | FastAPI (Python) |
| Clone DB/Auth | Supabase (Postgres) |
| Bot scripts | Playwright (Python) + asyncio |
| Tollbooth middleware | FastAPI (Python) |
| Detection agents | Python — numpy/pandas, scikit-learn optional |
| Real-time state | Redis (optional) |
| Dashboard | React + Vite + Tailwind + Recharts |
| Real-time transport | WebSockets |
| Orchestration | Docker Compose |

## 🛤️ Repository structure

```
tollbooth/
├── clone/
│   ├── frontend/
│   └── backend/
├── bots/
│   ├── naive_bot.py
│   ├── evasive_bot.py
│   └── config/
├── tollbooth/
│   ├── middleware/
│   ├── agents/
│   │   ├── behavioral.py
│   │   ├── network.py
│   │   └── pattern.py
│   ├── orchestrator.py
│   ├── decision_engine.py
│   └── dashboard/
├── assets/
│   └── banner.svg
├── docker-compose.yml
└── docs/
    ├── PRD.md
    ├── TRD.md
    └── IMPLEMENTATION_PLAN.md
```

## 🚉 Getting started

```bash
git clone <repo-url>
cd tollbooth
docker compose up
```

This brings up the Clone, Tollbooth middleware, dashboard, and shared database in one command.

To run an attack against the local Clone:

```bash
cd bots
python naive_bot.py       # zero-delay attacker
python evasive_bot.py     # randomized-delay attacker
```

Watch the live dashboard to see each session scored and a decision made in real time — naive bots get stopped at the gate instantly, evasive bots need the full ensemble to get caught.

## 📖 Documentation

- [`docs/PRD.md`](./docs/PRD.md) — product requirements: problem, goals, scope, user stories
- [`docs/TRD.md`](./docs/TRD.md) — technical requirements: data models, API contracts, full detection-agent checklist
- [`docs/IMPLEMENTATION_PLAN.md`](./docs/IMPLEMENTATION_PLAN.md) — phase-by-phase solo build order

## 🛡️ Status

Personal / portfolio project, solo build. Not affiliated with or attacking the real IRCTC system in any way, and does not integrate with real Aadhaar/UIDAI — both the target and the identity layer are fully self-contained mocks, built specifically so the attack and defense can be tested safely and honestly.

## Author

Rishabh — [portfolio](https://portfolio-rishabh27.vercel.app) · [GitHub](https://github.com/user-Rishabh) · [LinkedIn](https://linkedin.com/in/mrishabh27)
