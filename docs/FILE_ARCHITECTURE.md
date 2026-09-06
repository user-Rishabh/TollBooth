# Repository File Architecture

This document describes the directory tree, file organization, and specific responsibility of every module in the **Tollbooth** repository.

```
TollBooth/
├── .env.example                     # Environment configuration template
├── .gitignore                       # Ignored build artifacts, secrets, and deps
├── docker-compose.yml               # Local orchestration for services & database
├── README.md                        # Project overview, quickstart, and documentation
├── assets/
│   └── banner.svg                   # Project banner graphic
├── docs/
│   ├── PRD.md                       # Product Requirements Document
│   ├── TRD.md                       # Technical Requirements Document
│   ├── DESIGN.md                    # High-level architecture and system design
│   └── FILE_ARCHITECTURE.md         # Repository map and file breakdown (this file)
│
├── clone/                           # Module 1: The Target ("RailBook")
│   ├── frontend/                    # React + Vite + TypeScript + Tailwind CSS
│   │   ├── Dockerfile               # Container build for frontend
│   │   ├── index.html               # SPA entry point
│   │   ├── package.json             # Frontend dependencies & scripts
│   │   └── src/
│   │       ├── App.tsx              # Main application router/view
│   │       ├── main.tsx             # React DOM root render
│   │       └── index.css            # Tailwind & theme styles (navy, orange, cream)
│   └── backend/                     # FastAPI backend
│       ├── Dockerfile               # Container build for backend
│       ├── main.py                  # API endpoints (/api/login, /api/verify-otp, /api/book)
│       └── requirements.txt         # FastAPI, Uvicorn, SQLAlchemy/Supabase dependencies
│
├── bots/                            # Module 2: The Attackers
│   ├── requirements.txt             # Playwright, asyncio dependencies
│   ├── naive_bot.py                 # Fast, zero-delay automated booking script
│   ├── evasive_bot.py               # Human-mimicking bot (randomized delays & mouse paths)
│   └── config/
│       ├── __init__.py
│       └── settings.py              # Attacker configuration (test accounts, intervals)
│
└── tollbooth/                       # Module 3: The Defense & Dashboard
    ├── orchestrator.py              # Combines agent scores into final_risk_score
    ├── decision_engine.py           # Evaluates final score -> allow / challenge / block
    ├── middleware/                  # Reverse proxy & scoring gate
    │   ├── Dockerfile               # Container build for Tollbooth middleware
    │   ├── main.py                  # Intercepts requests, collects telemetry, calls agents
    │   └── requirements.txt         # FastAPI, httpx, uvicorn
    ├── agents/                      # Modality scoring agents
    │   ├── __init__.py
    │   ├── mouse.py                 # Evaluates cursor movement, trajectories, jitter
    │   ├── keyboard.py              # Evaluates keystroke intervals, CoV, digraphs, rhythm
    │   ├── consistency.py           # Cross-modal consistency (mouse vs. keyboard agreement)
    │   ├── network.py               # IP velocity, device fingerprints, headless flags
    │   └── pattern.py               # Navigation flow, sequence verification, dwell times
    └── dashboard/                   # Real-time WebSocket monitoring UI
        ├── Dockerfile               # Container build for dashboard
        ├── index.html               # Dashboard HTML entry point
        ├── package.json             # Dashboard dependencies (React, Vite, Recharts, Tailwind)
        └── src/
            ├── App.tsx              # Dashboard UI & live charts
            ├── main.tsx             # React root render
            └── index.css            # Dashboard theme styling
```

---

## Component Details

### 1. `clone/` (Target Application - "RailBook")
- **`clone/frontend/`**:
  - Implements the 5 screens: Login, OTP Verification (mock Aadhaar), Train Search, Passenger Booking + CAPTCHA, and Confirmation / Challenge.
  - Records timing telemetry via `window.performance.now()` and cursor trajectories, packaging them into `client_timing_metadata`.
- **`clone/backend/`**:
  - Exposes `/api/register`, `/api/login`, `/api/send-otp`, `/api/verify-otp`, `/api/trains`, `/api/book`.
  - Manages seat inventory and bookings in Postgres.

### 2. `bots/` (Attack Layer)
- **`naive_bot.py`**:
  - Attacks `/api/verify-otp` and `/api/book` at maximum speed using Playwright page fills with 0ms delay.
- **`evasive_bot.py`**:
  - Injects sampled delays, simulated mouse movements, and natural pauses to test defenses.
- **`config/settings.py`**:
  - Holds target URLs, test credentials, and timing distribution parameters.

### 3. `tollbooth/` (Defense Layer & Live Dashboard)
- **`tollbooth/middleware/`**:
  - Sits directly in front of the Clone booking endpoints (`/api/verify-otp`, `/api/book`).
  - Calls detection agents in parallel, feeds scores to Orchestrator and Decision Engine, logs sessions, and pushes telemetry over WebSocket.
- **`tollbooth/agents/`**:
  - `mouse.py`: Generates `mouse_score`.
  - `keyboard.py`: Generates `keyboard_score`.
  - `consistency.py`: Generates `consistency_score = 1 - |mouse_score - keyboard_score|`.
  - `network.py`: Generates `network_score`.
  - `pattern.py`: Generates `pattern_score`.
- **`tollbooth/orchestrator.py`**:
  - Weighted combination: $w_1 \cdot \text{mouse} + w_2 \cdot \text{keyboard} + w_3 \cdot (1 - \text{consistency}) + w_4 \cdot \text{network} + w_5 \cdot \text{pattern}$.
- **`tollbooth/decision_engine.py`**:
  - Maps score to `allow`, `challenge`, or `block`.
- **`tollbooth/dashboard/`**:
  - Consumes the WebSocket at `/tollbooth/live` to render incoming sessions, live risk scores, per-agent breakdowns, and decision logs.
