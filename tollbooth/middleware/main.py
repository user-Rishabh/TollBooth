import os
import sys
import uuid
import httpx
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, Request, Response, WebSocket, WebSocketDisconnect, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure tollbooth module path is available for imports
current_dir = Path(__file__).resolve().parent
tollbooth_dir = current_dir.parent
for p in [str(tollbooth_dir), str(current_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from orchestrator import Orchestrator
    from decision_engine import DecisionEngine, Decision
    from agents import (
        score_mouse,
        score_keyboard,
        compute_consistency,
        score_network,
        score_pattern,
    )
except ImportError:
    from tollbooth.orchestrator import Orchestrator
    from tollbooth.decision_engine import DecisionEngine, Decision
    from tollbooth.agents import (
        score_mouse,
        score_keyboard,
        compute_consistency,
        score_network,
        score_pattern,
    )

CLONE_BACKEND_URL = os.getenv("CLONE_BACKEND_URL", "http://localhost:8000").rstrip("/")

app = FastAPI(
    title="Tollbooth Security Defense Middleware",
    description="Multi-agent continuous behavioral scoring & reverse proxy gateway",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

orchestrator = Orchestrator()
decision_engine = DecisionEngine()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                if connection in self.active_connections:
                    self.active_connections.remove(connection)

manager = ConnectionManager()

# --- Pydantic Schemas ---

class ScoreRequest(BaseModel):
    session_id: Optional[str] = None
    user_id: Optional[str] = None
    ip: Optional[str] = None
    device_fingerprint: Optional[str] = None
    client_timing_metadata: Optional[Dict[str, Any]] = None
    session_context: Optional[Dict[str, Any]] = None
    flow_context: Optional[Dict[str, Any]] = None

class ScoreResponse(BaseModel):
    session_id: str
    decision: str
    final_risk_score: float
    agent_scores: Dict[str, float]
    timestamp: str

# --- Helper Functions ---

def evaluate_session(
    timing_meta: Optional[Dict[str, Any]],
    session_ctx: Optional[Dict[str, Any]],
    flow_ctx: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    meta = timing_meta or {}
    s_ctx = session_ctx or {}
    f_ctx = flow_ctx or {}

    m_score = round(score_mouse(meta), 3)
    k_score = round(score_keyboard(meta), 3)
    c_score = round(compute_consistency(m_score, k_score), 3)
    n_score = round(score_network(s_ctx), 3)
    p_score = round(score_pattern(f_ctx), 3)

    final_risk = round(orchestrator.calculate_risk(m_score, k_score, c_score, n_score, p_score), 3)
    decision = decision_engine.decide(final_risk)

    return {
        "final_risk_score": final_risk,
        "decision": decision.value,
        "agent_scores": {
            "mouse": m_score,
            "keyboard": k_score,
            "consistency": c_score,
            "network": n_score,
            "pattern": p_score,
        },
    }

# --- Endpoints ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "tollbooth-middleware", "backend_target": CLONE_BACKEND_URL}

@app.post("/tollbooth/score", response_model=ScoreResponse)
async def score_endpoint(req: ScoreRequest, request: Request):
    session_id = req.session_id or f"tb_{uuid.uuid4().hex[:12]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    # Enrich session context with request metadata
    s_ctx = dict(req.session_context or {})
    s_ctx.setdefault("user_agent", request.headers.get("user-agent", ""))
    s_ctx.setdefault("ip", req.ip or request.client.host if request.client else "127.0.0.1")

    eval_result = evaluate_session(req.client_timing_metadata, s_ctx, req.flow_context)

    broadcast_payload = {
        "session_id": session_id,
        "user_id": req.user_id,
        "final_risk_score": eval_result["final_risk_score"],
        "decision": eval_result["decision"],
        "agent_scores": eval_result["agent_scores"],
        "timestamp": now_iso,
    }
    await manager.broadcast(broadcast_payload)

    return ScoreResponse(
        session_id=session_id,
        decision=eval_result["decision"],
        final_risk_score=eval_result["final_risk_score"],
        agent_scores=eval_result["agent_scores"],
        timestamp=now_iso,
    )

@app.websocket("/tollbooth/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# --- Reverse Proxy Gateway to Clone Target ---

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"])
async def proxy_to_clone_backend(request: Request, path: str):
    target_url = f"{CLONE_BACKEND_URL}/api/{path}"
    body = await request.body()
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)

    # If this is a behavioral checkpoint endpoint (verify-otp, book), score telemetry first
    if request.method.upper() == "POST" and path in ["verify-otp", "book", "send-otp"]:
        try:
            body_json = await request.json()
        except Exception:
            body_json = {}

        timing_meta = body_json.get("client_timing_metadata", {})
        s_ctx = {
            "user_agent": request.headers.get("user-agent", ""),
            "ip": request.client.host if request.client else "127.0.0.1",
        }
        flow_ctx = {
            "path": path,
            "dwell_time_ms": timing_meta.get("total_interaction_time_ms"),
            "is_trusted": timing_meta.get("is_trusted", True),
        }

        eval_result = evaluate_session(timing_meta, s_ctx, flow_ctx)
        session_id = f"tb_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Stream event to live dashboard
        await manager.broadcast({
            "session_id": session_id,
            "user_id": body_json.get("user_id"),
            "endpoint": f"/api/{path}",
            "final_risk_score": eval_result["final_risk_score"],
            "decision": eval_result["decision"],
            "agent_scores": eval_result["agent_scores"],
            "timestamp": now_iso,
        })

        # Enforce decision thresholds
        if eval_result["decision"] == Decision.BLOCK.value:
            return Response(
                content=f'{{"detail": "Request blocked by Tollbooth behavioral security defense.", "decision": "block", "final_risk_score": {eval_result["final_risk_score"]}}}',
                status_code=status.HTTP_403_FORBIDDEN,
                media_type="application/json",
            )
        elif eval_result["decision"] == Decision.CHALLENGE.value:
            return Response(
                content=f'{{"detail": "Behavioral verification challenge required.", "decision": "challenge", "final_risk_score": {eval_result["final_risk_score"]}}}',
                status_code=status.HTTP_428_PRECONDITION_REQUIRED,
                media_type="application/json",
            )

    # Forward to Clone Backend
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            backend_resp = await client.request(
                method=request.method,
                url=target_url,
                params=request.query_params,
                headers=headers,
                content=body,
            )
            return Response(
                content=backend_resp.content,
                status_code=backend_resp.status_code,
                headers=dict(backend_resp.headers),
                media_type=backend_resp.headers.get("content-type"),
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unable to connect to Clone Backend at {CLONE_BACKEND_URL}",
            )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
