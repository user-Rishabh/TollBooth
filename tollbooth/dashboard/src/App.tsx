import React, { useState, useEffect, useRef } from 'react'
import { ShieldCheck, ShieldAlert, ShieldX, Activity, Radio, Cpu, RefreshCw, Layers } from 'lucide-react'

interface AgentScores {
  mouse: number
  keyboard: number
  consistency: number
  network: number
  pattern: number
}

interface TelemetryEvent {
  session_id: string
  user_id?: string
  endpoint?: string
  final_risk_score: number
  decision: 'allow' | 'challenge' | 'block'
  agent_scores: AgentScores
  timestamp: string
}

const WS_URL = import.meta.env.VITE_TOLLBOOTH_WS_URL || 'ws://localhost:8001/tollbooth/live'

export default function App() {
  const [connected, setConnected] = useState<boolean>(false)
  const [events, setEvents] = useState<TelemetryEvent[]>([])
  const [stats, setStats] = useState({ total: 0, allowed: 0, challenged: 0, blocked: 0 })
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    let reconnectTimeout: any

    const connectWs = () => {
      try {
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws

        ws.onopen = () => {
          setConnected(true)
        }

        ws.onmessage = (event) => {
          try {
            const data: TelemetryEvent = JSON.parse(event.data)
            if (data.session_id && data.decision) {
              setEvents((prev) => [data, ...prev.slice(0, 49)])
              setStats((prev) => ({
                total: prev.total + 1,
                allowed: prev.allowed + (data.decision === 'allow' ? 1 : 0),
                challenged: prev.challenged + (data.decision === 'challenge' ? 1 : 0),
                blocked: prev.blocked + (data.decision === 'block' ? 1 : 0),
              }))
            }
          } catch {
            // Non-JSON message, ignore
          }
        }

        ws.onclose = () => {
          setConnected(false)
          reconnectTimeout = setTimeout(connectWs, 3000)
        }

        ws.onerror = () => {
          ws.close()
        }
      } catch {
        setConnected(false)
        reconnectTimeout = setTimeout(connectWs, 3000)
      }
    }

    connectWs()

    return () => {
      clearTimeout(reconnectTimeout)
      wsRef.current?.close()
    }
  }, [])

  const latest = events[0]

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'allow':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            ALLOW
          </span>
        )
      case 'challenge':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700">
            <ShieldAlert className="w-3.5 h-3.5" />
            CHALLENGE
          </span>
        )
      case 'block':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700">
            <ShieldX className="w-3.5 h-3.5" />
            BLOCK
          </span>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🚦</span>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              <span>Tollbooth Defense Guardian</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Live Feed
              </span>
            </h1>
            <p className="text-xs text-slate-400">Continuous Multi-Agent Behavioral Scoring Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                connected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse' : 'bg-rose-500'
              }`}
            ></span>
            <span className="text-xs text-slate-300 font-mono font-medium">
              {connected ? 'WS LIVE' : 'WS RECONNECTING'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider font-mono">Total Requests</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-emerald-400 uppercase tracking-wider font-mono">Allowed</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{stats.allowed}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-amber-400 uppercase tracking-wider font-mono">Challenged</div>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{stats.challenged}</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs text-rose-400 uppercase tracking-wider font-mono">Blocked</div>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{stats.blocked}</div>
          </div>
        </div>

        {/* Real-Time Active Session Banner */}
        {latest ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="text-xs text-slate-400 font-mono">Latest Intercepted Session</div>
                <div className="text-lg font-bold text-white font-mono flex items-center gap-2 mt-0.5">
                  <span>{latest.session_id}</span>
                  {latest.user_id && (
                    <span className="text-xs font-sans text-slate-400">({latest.user_id})</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[11px] text-slate-400 font-mono">Final Risk Score</div>
                  <div
                    className={`text-xl font-black font-mono ${
                      latest.final_risk_score >= 0.7
                        ? 'text-rose-400'
                        : latest.final_risk_score >= 0.35
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {(latest.final_risk_score * 100).toFixed(1)}%
                  </div>
                </div>
                {getDecisionBadge(latest.decision)}
              </div>
            </div>

            {/* Agent Modality Breakdown */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-3">
              {Object.entries(latest.agent_scores).map(([agent, score]) => (
                <div key={agent} className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3">
                  <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
                    <span className="capitalize text-slate-300 font-medium">{agent}</span>
                    <span className="text-slate-400">{score.toFixed(2)}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        agent === 'consistency'
                          ? score > 0.6
                            ? 'bg-emerald-500'
                            : 'bg-rose-500'
                          : score > 0.6
                          ? 'bg-rose-500'
                          : score > 0.35
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, score * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-10 text-center text-slate-400">
            <Radio className="w-8 h-8 text-amber-500/60 mx-auto mb-3 animate-pulse" />
            <h3 className="text-base font-semibold text-slate-200">Listening for Booking Sessions</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Tollbooth Middleware is active. Submissions from the RailBook frontend or attack bots will appear here in real time.
            </p>
          </div>
        )}

        {/* Live Stream Event Log Table */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-slate-200">Audit Stream (Latest 50 Sessions)</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">{events.length} Captured</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono border-b border-slate-800 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Session ID</th>
                  <th className="px-4 py-3">Endpoint</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Risk Score</th>
                  <th className="px-4 py-3">Agent Breakdown (M/K/C/N/P)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-sans">
                      No sessions scored yet. Execute an OTP verification or booking to stream telemetry.
                    </td>
                  </tr>
                ) : (
                  events.map((ev, i) => (
                    <tr key={ev.session_id + i} className="hover:bg-slate-800/40 transition">
                      <td className="px-4 py-2.5 text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5 text-slate-200 font-semibold">{ev.session_id}</td>
                      <td className="px-4 py-2.5 text-slate-400">{ev.endpoint || '/tollbooth/score'}</td>
                      <td className="px-4 py-2.5">{getDecisionBadge(ev.decision)}</td>
                      <td
                        className={`px-4 py-2.5 font-bold ${
                          ev.final_risk_score >= 0.7
                            ? 'text-rose-400'
                            : ev.final_risk_score >= 0.35
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {(ev.final_risk_score * 100).toFixed(1)}%
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                        {ev.agent_scores.mouse.toFixed(2)} / {ev.agent_scores.keyboard.toFixed(2)} /{' '}
                        {ev.agent_scores.consistency.toFixed(2)} / {ev.agent_scores.network.toFixed(2)} /{' '}
                        {ev.agent_scores.pattern.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 px-6 py-3.5 text-center text-xs text-slate-500 font-mono bg-slate-950">
        Tollbooth Security Defense • Continuous Multi-Agent Behavioral & Cross-Modal Detection Architecture
      </footer>
    </div>
  )
}
