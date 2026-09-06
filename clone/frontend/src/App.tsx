import React from 'react'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[#FFF8E1] text-[#212529] font-sans">
      <header className="bg-[#003A70] text-white py-4 px-6 shadow-md flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <span>🚂</span> RailBook
        </h1>
        <div className="text-xs text-amber-200">Tatkal Demo Clone</div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full p-6 flex items-center justify-center">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center max-w-md w-full">
          <h2 className="text-xl font-semibold text-[#003A70] mb-2">RailBook Skeleton Ready</h2>
          <p className="text-sm text-gray-600 mb-6">
            Tatkal booking flow with mock Aadhaar OTP verification.
          </p>
          <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
            Phase 1 Scaffolding
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 text-center py-4 text-xs text-gray-500 space-y-1">
        <div>Not affiliated with IRCTC or Indian Railways.</div>
        <div>Clone Demo Environment for Tollbooth Security Defense testing.</div>
      </footer>
    </div>
  )
}
