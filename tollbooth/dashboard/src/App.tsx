import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">🚦</span>
          <h1 className="text-lg font-bold tracking-tight text-white">Tollbooth Guardian Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs text-slate-400 font-mono">WS DISCONNECTED (SKELETON)</span>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex items-center justify-center">
        <div className="border border-slate-800 bg-slate-900/80 rounded-xl p-8 text-center max-w-md w-full shadow-2xl">
          <h2 className="text-lg font-semibold text-amber-400 mb-2">Defense Dashboard Initialized</h2>
          <p className="text-sm text-slate-400 mb-6">
            Live WebSocket feed ready for scoring telemetry and decision stream.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 font-mono">
            <span>5-Agent Modality Ensemble</span>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800/80 px-6 py-3 text-center text-xs text-slate-500 font-mono">
        Tollbooth Security Defense • Continuous Behavioral & Cross-Modal Detection
      </footer>
    </div>
  )
}
