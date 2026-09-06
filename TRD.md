# Technical Requirements Document (TRD)
## Smart Tatkal Guardian v2

---

## 1. System Overview

Three independent modules communicating over HTTP/WebSocket:

1. **Clone** — the target booking application (frontend + backend + DB)
2. **Bots** — standalone Playwright-driven attack scripts, run separately, hitting the Clone
3. **Guardian** — a middleware/reverse-proxy + detection service sitting in front of the Clone's booking API, plus a real-time dashboard

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Clone frontend | React + Vite + TypeScript + Tailwind CSS |
| Clone backend | FastAPI (Python) |
| Clone DB/Auth | Supabase (Postgres) |
| Bot scripts | Playwright (Python), asyncio for concurrency |
| Guardian middleware | FastAPI (Python), sits in front of Clone's booking endpoint |
| Guardian detection agents | Python — numpy/pandas for statistical scoring; scikit-learn optional for ensemble classifier |
| Guardian real-time state | Redis (optional) — in-memory rate counters, session state |
| Guardian dashboard | React + Vite + Tailwind, Recharts for score visualization |
| Guardian real-time transport | WebSockets (native FastAPI support) |
| Guardian storage | Supabase (Postgres) — session logs, scores, decisions |
| Local orchestration | Docker Compose — spins up all modules + shared DB with one command |

## 3. Data Models

### 3.1 Clone — `trains`
```
id: uuid
name: string
number: string
departure_time: timestamp
available_seats: integer
tatkal_open_time: timestamp
```

### 3.2 Clone — `users`
```
id: uuid
username: string
password_hash: string
created_at: timestamp
```

### 3.3 Clone — `bookings`
```
id: uuid
user_id: uuid (fk)
train_id: uuid (fk)
seat_number: string
booked_at: timestamp
session_id: uuid (fk -> guardian.sessions)
```

### 3.4 Guardian — `sessions`
```
id: uuid
user_id: uuid
ip_address: string
device_fingerprint: string
created_at: timestamp
captcha_solve_time_ms: integer
inter_field_intervals_ms: integer[]
mouse_movement_before_focus: boolean
behavioral_score: float
network_score: float
pattern_score: float
final_risk_score: float
decision: enum(allow, challenge, block)
decided_at: timestamp
```

### 3.5 Guardian — `agent_events` (raw signal log, for dashboard replay)
```
id: uuid
session_id: uuid (fk)
agent_name: enum(behavioral, network, pattern)
signal_name: string
signal_value: float
timestamp: timestamp
```

## 4. API Contracts

### 4.1 Clone Backend

```
POST /api/login              { username, password } -> { session_token }
GET  /api/trains             -> [ { id, name, available_seats, tatkal_open_time } ]
POST /api/book                { train_id, session_token, client_timing_metadata }
                              -> { status: confirmed | waitlisted | rejected }
```

`client_timing_metadata` (captured client-side via `performance.now()`):
```json
{
  "captcha_solve_time_ms": 850,
  "inter_field_intervals_ms": [320, 410, 275],
  "mouse_movement_before_focus": true,
  "page_load_to_first_action_ms": 1200
}
```

### 4.2 Guardian Middleware

All `/api/book` traffic is routed through Guardian before reaching the Clone backend.

```
POST /guardian/score          { session_id, client_timing_metadata, ip, device_fingerprint }
                              -> { final_risk_score, decision }
```

Guardian forwards the request to the Clone backend only if `decision != block`. If `decision == challenge`, Guardian returns a challenge response to the frontend (e.g., accessible secondary CAPTCHA) before allowing retry.

### 4.3 Guardian Dashboard (WebSocket)

```
WS /guardian/live
  -> streams: { session_id, agent_scores: {behavioral, network, pattern}, final_risk_score, decision, timestamp }
```

## 5. Detection Agent Specifications

### 5.1 Behavioral Agent
**Inputs:** `captcha_solve_time_ms`, `inter_field_intervals_ms`, `mouse_movement_before_focus`, `page_load_to_first_action_ms`

**Logic:**
- Compute z-score of `captcha_solve_time_ms` against a running distribution of recent sessions (not a fixed hard threshold)
- Flag unnaturally low variance across `inter_field_intervals_ms` (evasive bots with "randomized" delays often still cluster more tightly than genuine human variance)
- Penalize `mouse_movement_before_focus == false` combined with fast solve time
- Output: `behavioral_score` (0–1, higher = more bot-like)

### 5.2 Network Agent
**Inputs:** `ip_address`, `device_fingerprint`, session correlation across accounts

**Logic:**
- Cluster sessions sharing device fingerprints despite different account IDs
- Flag high request-rate-per-IP in the Tatkal opening window
- Output: `network_score` (0–1)

### 5.3 Pattern Agent
**Inputs:** sequence of page/API calls per session

**Logic:**
- Flag sessions that call `/api/book` without corresponding prior asset/page-load requests (skipped browsing)
- Flag sessions with no navigation pause between search and book actions
- Output: `pattern_score` (0–1)

### 5.4 Orchestrator
**Logic:**
```
final_risk_score = w1*behavioral_score + w2*network_score + w3*pattern_score
```
Weights (`w1, w2, w3`) tunable; start with equal weighting, adjust based on observed detection performance against naive vs. evasive bot archetypes during testing.

### 5.5 Decision Engine
```
if final_risk_score < T_low:      decision = allow
elif final_risk_score < T_high:   decision = challenge   (soft, accessible secondary check)
else:                             decision = block
```
No single agent score alone can force a `block` — only the combined `final_risk_score` does. This prevents any one gameable/false-positive-prone signal from causing a hard rejection.

## 6. Non-Functional Requirements

- **Latency budget:** Guardian's synchronous scoring path (behavioral + network + pattern, cheap statistical checks) must add minimal overhead to the booking request — target sub-100ms added latency
- **Tiered analysis:** Any heavier/ensemble-model scoring runs asynchronously, post-request, feeding a fraud-review queue rather than blocking the live transaction
- **Client-side timing capture:** All interval/timing measurements are computed client-side via `performance.now()` and sent as deltas — never inferred from server-side arrival timestamps, to stay immune to network latency variance
- **Accessibility:** No single behavioral signal may trigger a hard block; graduated response only

## 7. Deployment

- `docker-compose.yml` orchestrating: clone-frontend, clone-backend, guardian-service, guardian-dashboard, shared Postgres (or Supabase local), optional Redis
- Single command (`docker compose up`) brings up the full demo environment
