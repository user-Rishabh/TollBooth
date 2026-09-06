# System Design Document
## Smart Tatkal Guardian v2

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
                                       │ /api/book + client_timing_metadata
                                       ▼
                          ┌────────────────────────────┐
                          │   Guardian Middleware        │
                          │   (FastAPI, sits in front)   │
                          │                              │
                          │  ┌────────────┐              │
                          │  │ Behavioral │              │
                          │  │   Agent    │──┐           │
                          │  └────────────┘  │           │
                          │  ┌────────────┐  │  ┌──────┐ │
                          │  │  Network   │──┼─▶│ Orch.│ │──▶ Decision Engine
                          │  │   Agent    │  │  └──────┘ │      │
                          │  └────────────┘  │           │      │
                          │  ┌────────────┐  │           │      ├─▶ allow ──▶ forward to Clone Backend
                          │  │  Pattern   │──┘           │      ├─▶ challenge ──▶ return soft challenge
                          │  │   Agent    │              │      └─▶ block ──▶ reject
                          │  └────────────┘              │
                          └───────────┬──────────────────┘
                                       │ WebSocket stream
                                       ▼
                          ┌────────────────────────────┐
                          │   Guardian Dashboard         │
                          │  React/Vite/Tailwind/Recharts│
                          │  live session feed + scores  │
                          └────────────────────────────┘
                                       │
                                       ▼
                          ┌────────────────────────────┐
                          │   Clone Backend (FastAPI)    │
                          │   + Supabase (seats, bookings)│
                          └────────────────────────────┘
```

## 2. Component Responsibilities

| Component | Responsibility |
|---|---|
| Clone Frontend | Renders login/search/book UI; captures client-side timing metadata (`performance.now()`) |
| Clone Backend | Auth, train data, seat inventory, booking confirmation logic |
| Bot Attack Layer | Standalone scripts (not part of the "product") that drive the Clone Frontend via Playwright, with configurable archetype behavior |
| Guardian Middleware | Intercepts every `/api/book` call before it reaches the Clone Backend; runs scoring; enforces decision |
| Detection Agents | Independent scoring modules, each responsible for one signal family |
| Orchestrator | Combines agent scores into one `final_risk_score` |
| Decision Engine | Maps score to allow/challenge/block |
| Guardian Dashboard | Real-time visualization of session scoring and decisions, for the live demo |

## 3. Sequence Flows

### 3.1 Genuine User Flow
1. User logs in → loads train list → selects train
2. Frontend captures natural timing (CAPTCHA solve ~5–20s, mouse movement present, natural inter-field variance)
3. `/api/book` call includes this metadata → Guardian scores it low-risk → `allow` → forwarded to Clone Backend → booking confirmed

### 3.2 Naive Bot Flow
1. Playwright script logs in, selects train, fills CAPTCHA/fields with near-zero delay
2. Client timing metadata shows near-0ms solve time, uniform near-zero inter-field intervals, no mouse movement
3. Behavioral Agent scores very high risk → Orchestrator's combined score exceeds block threshold → `block`

### 3.3 Evasive Bot Flow
1. Playwright script injects randomized delays (e.g., 1.5–4s) and simulated mouse jitter before CAPTCHA/fields
2. Behavioral Agent alone may not flag it (solve time looks "human-range")
3. Network Agent detects shared device fingerprint across multiple "different" accounts running the same script, or Pattern Agent detects skipped page-load/navigation events
4. Combined `final_risk_score` from multiple agents crosses threshold → `challenge` or `block`, demonstrating why ensemble scoring is necessary where single-signal detection fails

## 4. Repository Structure

```
smart-tatkal-guardian-v2/
├── clone/
│   ├── frontend/            # React + Vite + TS + Tailwind
│   └── backend/             # FastAPI
├── bots/
│   ├── naive_bot.py
│   ├── evasive_bot.py
│   └── config/              # delay profiles, concurrency settings
├── guardian/
│   ├── middleware/          # FastAPI reverse-proxy + scoring entrypoint
│   ├── agents/
│   │   ├── behavioral.py
│   │   ├── network.py
│   │   └── pattern.py
│   ├── orchestrator.py
│   ├── decision_engine.py
│   └── dashboard/           # React + Vite + Tailwind + Recharts
├── docker-compose.yml
└── docs/
    ├── PRD.md
    ├── TRD.md
    └── DESIGN.md
```

## 5. Data Flow Summary

1. Client-side timing captured in-browser → sent as metadata with booking request
2. Guardian middleware intercepts request → dispatches to three agents in parallel
3. Agent scores → orchestrator → single risk score
4. Decision engine → action (allow/challenge/block) + logs to `sessions` and `agent_events` tables
5. WebSocket broadcasts the scoring event to the dashboard in real time
6. If `allow`, request forwarded to Clone Backend for actual booking

## 6. Deployment View

- Single `docker-compose.yml` bringing up: clone-frontend, clone-backend, guardian-middleware, guardian-dashboard, Postgres (Supabase local or plain Postgres), Redis (optional)
- All inter-service communication over a shared Docker network
- Local `.env` for Supabase keys / config, excluded from version control

## 7. Future Extensions (out of MVP scope)

- Swap statistical scoring for a trained ensemble classifier (scikit-learn) once enough labeled session data exists from test runs
- Add interaction-based CAPTCHA (drag/rotate) in place of text CAPTCHA in the Clone
- Add `isTrusted` event-trust checking client-side to catch naive extension-based autofill bots specifically (separate from Playwright-driven bots)
- Post-hoc async fraud-review queue for borderline sessions flagged by the heavier tier
