# System Design Document
## Tollbooth — Defense Architecture & Module Design

---

## 1. High-Level Architecture

```
                         ┌─────────────────────┐
                         │   Bot Attack Layer   │
                         │  (Playwright, async) │
                         │  naive / evasive     │
                         └──────────┬───────────┘
                                    │ HTTP (browser-driven)
                                    ▼
┌───────────────┐          ┌──────────────────────┐
│  Genuine User  │────────▶│   Clone Frontend      │
│   (browser)    │  HTTP   │  React/Vite/TS/Tail.  │
└───────────────┘          └──────────┬───────────┘
                                       │ /api/verify-otp, /api/book + client_timing_metadata
                                       ▼
                          ┌────────────────────────────┐
                          │   Tollbooth Middleware     │
                          │   (FastAPI, sits in front) │
                          │                            │
                          │  ┌────────────┐            │
                          │  │   Mouse    │            │
                          │  │   Agent    │──┐         │
                          │  └────────────┘  │         │
                          │  ┌────────────┐  ├──▶ Cross-Modal Consistency Check
                          │  │  Keyboard  │  │   │
                          │  │   Agent    │──┘   │
                          │  └────────────┘      │     ┌──────┐
                          │  ┌────────────┐      ├───▶ │ Orch.│ ──▶ Decision Engine
                          │  │  Network   │──────┤     └──────┘        │
                          │  │   Agent    │      │                     ├─▶ allow ──▶ Clone Backend
                          │  └────────────┘      │                     ├─▶ challenge ──▶ soft challenge
                          │  ┌────────────┐      │                     └─▶ block ──▶ reject
                          │  │  Pattern   │──────┘
                          │  │   Agent    │
                          │  └────────────┘
                          └───────────┬────────────────┘
                                       │ WebSocket stream
                                       ▼
                          ┌────────────────────────────┐
                          │    Tollbooth Dashboard     │
                          │ React/Vite/Tailwind/Recharts│
                          │ live session feed + scores │
                          └────────────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────┐
                          │   Clone Backend (FastAPI)  │
                          │   + Postgres (seats, etc.) │
                          └────────────────────────────┘
```

## 2. Component Responsibilities

| Component | Responsibility |
|---|---|
| Clone Frontend ("RailBook") | Renders login/search/book UI; captures client-side timing metadata (`performance.now()`) |
| Clone Backend | Auth, train data, seat inventory, booking confirmation logic |
| Bot Attack Layer | Standalone scripts that drive the Clone Frontend via Playwright with naive and evasive archetypes |
| Tollbooth Middleware | Intercepts `/api/verify-otp` and `/api/book` calls; runs scoring; enforces decision |
| Mouse/Pointer Agent | Evaluates pre-focus mouse movement, trajectory curvature, jitter, and teleportation |
| Keyboard/Typing Agent | Evaluates inter-field timing, inter-keystroke timing, CoV, digraph timing, autocorrelation |
| Cross-Modal Consistency Check | Evaluates correlation between mouse and keyboard scores to catch independent fuzzer routines |
| Network Agent | Evaluates IP request rates, browser fingerprint clustering, and automation flags |
| Pattern Agent | Evaluates navigation flow, dwell times, missing asset loads, and `isTrusted` flags |
| Orchestrator | Combines agent scores into one weighted `final_risk_score` |
| Decision Engine | Maps score to allow/challenge/block (graduated response) |
| Tollbooth Dashboard | Real-time visualization of session scoring and decisions via WebSocket |

## 3. Repository Structure

```
tollbooth/
├── clone/
│   ├── frontend/            # React + Vite + TS + Tailwind ("RailBook")
│   └── backend/             # FastAPI + DB models
├── bots/
│   ├── naive_bot.py
│   ├── evasive_bot.py
│   └── config/              # delay profiles, target URLs
├── tollbooth/
│   ├── middleware/          # FastAPI reverse-proxy + scoring entrypoint
│   ├── agents/              # mouse, keyboard, consistency, network, pattern
│   ├── orchestrator.py
│   ├── decision_engine.py
│   └── dashboard/           # React + Vite + Tailwind + Recharts
├── assets/
│   └── banner.svg
├── docker-compose.yml
└── docs/
    ├── PRD.md
    ├── TRD.md
    ├── DESIGN.md
    └── FILE_ARCHITECTURE.md
```
