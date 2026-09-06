# Technical Requirements Document (TRD)
## Tollbooth

---

## 1. System Overview

Three independent modules communicating over HTTP/WebSocket:

1. **Clone** — the target booking application (frontend + backend + DB), including a mock Aadhaar OTP authentication step
2. **Bots** — standalone Playwright-driven attack scripts, run separately, hitting the Clone
3. **Tollbooth** — a middleware/reverse-proxy + detection service sitting in front of the Clone's booking API, plus a real-time dashboard

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Clone frontend | React + Vite + TypeScript + Tailwind CSS |
| Clone backend | FastAPI (Python) |
| Clone DB/Auth | Supabase (Postgres) |
| Bot scripts | Playwright (Python), asyncio for concurrency |
| Tollbooth middleware | FastAPI (Python), sits in front of Clone's booking endpoint |
| Detection agents | Python — numpy/pandas for statistical scoring; scikit-learn optional for ensemble classifier |
| Real-time state | Redis (optional) — in-memory rate counters, session state |
| Dashboard | React + Vite + Tailwind, Recharts for score visualization |
| Real-time transport | WebSockets (native FastAPI support) |
| Storage | Supabase (Postgres) — session logs, scores, decisions |
| Local orchestration | Docker Compose |

## 3. Data Models

### 3.1 Clone — `users`
```
id: uuid
username: string
password_hash: string
aadhaar_linked_mobile: string        # mock — not a real Aadhaar number, just a linked mobile
created_at: timestamp
```

### 3.2 Clone — `otp_verifications` (mock Aadhaar-style OTP flow)
```
id: uuid
user_id: uuid (fk)
otp_code: string          # generated mock code, not sent via any real SMS gateway
requested_at: timestamp
verified_at: timestamp (nullable)
expires_at: timestamp
attempt_count: integer
```

### 3.3 Clone — `trains`
```
id: uuid
name: string
number: string
departure_time: timestamp
available_seats: integer
tatkal_open_time: timestamp
```

### 3.4 Clone — `bookings`
```
id: uuid
user_id: uuid (fk)
train_id: uuid (fk)
seat_number: string
booked_at: timestamp
session_id: uuid (fk -> tollbooth.sessions)
```

### 3.5 Tollbooth — `sessions`
```
id: uuid
user_id: uuid
ip_address: string
device_fingerprint: string
created_at: timestamp
captcha_solve_time_ms: integer
inter_field_intervals_ms: integer[]
inter_keystroke_intervals_ms: integer[]
mouse_movement_before_focus: boolean
mouse_score: float
keyboard_score: float
consistency_score: float
network_score: float
pattern_score: float
final_risk_score: float
decision: enum(allow, challenge, block)
decided_at: timestamp
```

### 3.6 Tollbooth — `agent_events` (raw signal log, for dashboard replay)
```
id: uuid
session_id: uuid (fk)
agent_name: enum(mouse, keyboard, network, pattern, consistency)
signal_name: string
signal_value: float
timestamp: timestamp
```

## 4. API Contracts

### 4.1 Clone Backend — Auth (mock Aadhaar-style)

```
POST /api/register            { username, password, aadhaar_linked_mobile }
POST /api/login                { username, password } -> triggers OTP step
POST /api/send-otp             { user_id } -> { otp_expires_at }   # mock: OTP returned in response for test/demo use, no real SMS
POST /api/verify-otp           { user_id, otp_code } -> { session_token }
```

This mirrors the real IRCTC/Aadhaar flow's *shape* (password login → OTP tied to a linked mobile → OTP verification required before proceeding) without any real UIDAI integration. The mock OTP is either fixed for test accounts (so naive bots can automate it deterministically) or returned directly in the API response for demo convenience.

### 4.2 Clone Backend — Booking

```
GET  /api/trains               -> [ { id, name, available_seats, tatkal_open_time } ]
POST /api/book                  { train_id, session_token, client_timing_metadata }
                                -> { status: confirmed | waitlisted | rejected }
```

`client_timing_metadata` (captured client-side via `performance.now()`):
```json
{
  "captcha_solve_time_ms": 850,
  "inter_field_intervals_ms": [320, 410, 275],
  "inter_keystroke_intervals_ms": [110, 95, 140, 88, 105],
  "mouse_movement_before_focus": true,
  "mouse_trajectory": [{"x": 102, "y": 240, "t": 12}, {"x": 180, "y": 280, "t": 58}],
  "page_load_to_first_action_ms": 1200
}
```

### 4.3 Tollbooth Middleware

All `/api/send-otp`, `/api/verify-otp`, and `/api/book` traffic is routed through Tollbooth before reaching the Clone backend, since scoring begins at login, not only at booking.

```
POST /tollbooth/score           { session_id, client_timing_metadata, ip, device_fingerprint }
                                -> { final_risk_score, decision }
```

Tollbooth forwards the request to the Clone backend only if `decision != block`. If `decision == challenge`, Tollbooth returns a challenge response to the frontend (e.g., an accessible secondary check) before allowing retry.

### 4.4 Tollbooth Dashboard (WebSocket)

```
WS /tollbooth/live
  -> streams: { session_id, agent_scores: {mouse, keyboard, consistency, network, pattern}, final_risk_score, decision, timestamp }
```

## 5. Detection Agent Specifications — Full Checklist

Detection is organized by **modality** — each independent channel a real human's session produces (mouse, keyboard, network) is scored separately, and then checked for **consistency with the other modalities**, before feeding the orchestrator. This is a deliberate architecture choice: a bot author typically fakes each modality independently (one function for mouse jitter, a separate one for keystroke delay), so even a bot that scores "human-like" on every individual modality can still be caught if those modalities don't move together the way a real single human body naturally does.

```
                 SESSION
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    Mouse/       Keyboard/    Network/
    Pointer      Typing       Device
    Agent        Agent        Agent
        │           │           │
        └──────┬────┴───────────┘
               ↓
      CROSS-MODAL CONSISTENCY CHECK
               ↓
        (+ Pattern Agent — sequence/
         navigation checks, feeds in
         directly, not a "modality")
               ↓
         ORCHESTRATOR → final_risk_score
               ↓
      ALLOW / CHALLENGE / BLOCK
```

### 5.1 Mouse/Pointer Agent

| Check | What it measures | Why it matters |
|---|---|---|
| Mouse movement before focus | Was there cursor movement before a field was focused? | Naive bots (`.fill()`/`.type()`) skip this entirely; evasive bots can fake it |
| Movement path shape | Straight-line teleport vs. multi-point curved path | Real cursor motion has natural curvature/overshoot; naive simulated paths are often too geometrically clean |

**Output:** `mouse_score` (0–1, higher = more bot-like).

### 5.2 Keyboard/Typing Agent

| Check | What it measures | Why it matters |
|---|---|---|
| Inter-field timing | Time between completing one field and starting the next | Bots without delay logic show near-zero, uniform gaps |
| Inter-keystroke timing | Time between individual keystrokes within a field | Same purpose, finer granularity |
| **Coefficient of variation (CoV)** of keystroke/field intervals | `std_dev / mean` of the interval array | A "randomized" bot delay (e.g. `random.uniform(a,b)`) produces a specific, unnaturally even CoV; real human timing has a different distribution shape |
| **Same-hand vs. cross-hand digraph timing** | Classify each consecutive keystroke pair by whether both letters are typed by the same hand (QWERTY layout mapping); compare timing distributions between the two groups | Real typing is physically slower for same-hand digraphs than cross-hand ones; a randomized bot delay has no such structure, since it doesn't know or care what letters were typed |
| **Autocorrelation of consecutive gaps** | Statistical correlation between gap[i] and gap[i+1] across the session | Human timing has some rhythm/carry-over; independently re-rolled random delays are close to zero-autocorrelation noise |
| CAPTCHA solve time | Time from CAPTCHA render to submission | One weighted input among many — never a standalone pass/fail threshold |
| Page-load-to-first-action delay | Time between page render and the first user action | Very short values suggest a script acting immediately on DOM-ready rather than a human reading the page first |

**Output:** `keyboard_score` (0–1, higher = more bot-like).

### 5.2a Cross-Modal Consistency Check

```
consistency_score = 1 - |mouse_score - keyboard_score|
```

A real human's mouse and keyboard behavior come from the same body and the same mental state at the same time — they naturally move together (e.g. a rushed session shows up as *both* jerkier mouse movement *and* less even typing). A bot that fakes each modality with a separate, uncoordinated randomizer can end up looking human-like on one modality while still looking bot-like on the other. A low `consistency_score` (the two modality scores disagree strongly) is itself treated as a suspicious signal, independent of what either individual modality score says — this makes it harder to evade Tollbooth by only polishing one modality at a time.

**Output:** `consistency_score` (0–1, higher = more consistent/human-like), fed into the orchestrator alongside the two modality scores.

### 5.3 Network Agent

| Check | What it measures |
|---|---|
| Device/browser fingerprint clustering | Sessions sharing a fingerprint despite different account IDs |
| Request rate per IP | Abnormal request volume from one IP during the Tatkal window |
| Headless/automation indicators | `navigator.webdriver` flag, missing plugin lists, unusual `User-Agent`/CDP artifacts — a weak, evadable signal, weighted low, included only as a minor contributing input, not relied upon alone |

**Output:** `network_score` (0–1).

### 5.4 Pattern Agent

| Check | What it measures |
|---|---|
| Sequence anomalies | Booking call fired without the expected prior page/API sequence |
| Missing asset/page-load requests | A real browser loads CSS/JS/images before an API call; a raw API-hammering bot skips this |
| No dwell time on intermediate pages | E.g. zero time spent on the seat-selection screen between OTP verification and booking |
| `isTrusted` event check (client-side) | Flags naive extension-injected form values (`dispatchEvent` from page-context JS produces `isTrusted: false`). Documented limitation: does **not** catch Playwright/CDP-driven input, which is natively trusted by the browser — this check only catches the extension-autofill bot archetype, not the Playwright archetype |

**Output:** `pattern_score` (0–1). Not a "modality" like mouse/keyboard/network — feeds directly into the orchestrator rather than through the cross-modal consistency check.

### 5.5 Orchestrator

```
final_risk_score = w1*mouse_score + w2*keyboard_score + w3*(1 - consistency_score)
                  + w4*network_score + w5*pattern_score
```
Weights (`w1..w5`) tunable; start with equal weighting, adjust based on observed detection performance against naive vs. evasive bot archetypes during testing. `(1 - consistency_score)` is used so that low consistency (modalities disagree) *increases* risk, consistent with the other terms where higher = more bot-like. Score is recomputed continuously as new signals arrive throughout the session (from login onward), not only once at final submission.

### 5.6 Decision Engine
```
if final_risk_score < T_low:      decision = allow
elif final_risk_score < T_high:   decision = challenge   (soft, accessible secondary check)
else:                             decision = block
```
No single agent score alone can force a `block` — only the combined `final_risk_score` does.

## 6. Non-Functional Requirements

- **Latency budget:** Tollbooth's synchronous scoring path must add minimal overhead to each request — target sub-100ms added latency
- **Tiered analysis:** heavier/ensemble-model scoring runs asynchronously, post-request, for borderline sessions
- **Client-side timing capture:** all interval/timing measurements computed client-side via `performance.now()` and sent as deltas — immune to network latency variance, important for users in low-tier-city network conditions
- **Accessibility:** no single behavioral signal may trigger a hard block; graduated response only
- **Mock OTP realism without real integration:** the Aadhaar-style OTP step must mirror the real flow's shape (linked mobile, OTP required before booking) without any actual UIDAI/SMS gateway dependency

## 7. Deployment

- `docker-compose.yml` orchestrating: clone-frontend, clone-backend, tollbooth-middleware, tollbooth-dashboard, shared Postgres (or Supabase local), optional Redis
- Single command (`docker compose up`) brings up the full demo environment

## 8. Capacity Notes (measured, not assumed)

- Bot-attacker concurrency is bounded by Playwright's browser-instance overhead (RAM/CPU per headless browser), not by Tollbooth — expect tens of concurrent attacker sessions on a typical dev machine, not hundreds
- Tollbooth's scoring path itself (lightweight statistical checks + async I/O) is expected to handle a substantially higher request rate than the bot-attacker concurrency ceiling
- These two numbers should be measured separately: a direct load test against `/tollbooth/score` (synthetic payloads, no real browsers) measures scoring throughput; a separate test measures how many concurrent Playwright sessions the attack machine can sustain
