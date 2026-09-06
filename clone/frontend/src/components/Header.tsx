import React from 'react';
import { Train, ShieldAlert, LogOut, User } from 'lucide-react';

interface HeaderProps {
  currentUser?: string | null;
  onLogout?: () => void;
  activeTab?: string;
}

export const Header: React.FC<HeaderProps> = ({ currentUser, onLogout, activeTab = 'Book Ticket' }) => {
  const tabs = [
    { label: 'Book Ticket', active: true },
    { label: 'Tatkal Special', active: false, visualOnly: true },
    { label: 'PNR Status', active: false, visualOnly: true },
    { label: 'Train Schedule', active: false, visualOnly: true },
    { label: 'Cancel Ticket', active: false, visualOnly: true },
  ];

  return (
    <header className="bg-primary text-white shadow-md border-b-4 border-secondary">
      {/* Top Banner with Disclaimers */}
      <div className="bg-[#00284e] py-1 px-4 text-xs flex justify-between items-center text-slate-300">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-secondary" />
          <span>Security Sandbox Demo • Mock Aadhaar Authentication Active</span>
        </div>
        <div className="text-[11px] text-amber-300 font-mono">
          Clone Target: Tollbooth Defense Testbed
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-white shadow-inner">
            <Train className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white font-sans">RailBook</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary/30 text-amber-200 border border-secondary/40">
                Mock Tatkal
              </span>
            </div>
            <p className="text-[11px] text-slate-300 font-normal">Next-Generation Fast Booking Portal</p>
          </div>
        </div>

        {/* User Status / Actions */}
        <div className="flex items-center gap-4 text-sm">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs text-white">
                <User className="w-3.5 h-3.5 text-amber-300" />
                <span className="font-semibold">{currentUser}</span>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded transition"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-300">Aadhaar OTP Identity Layer</div>
          )}
        </div>
      </div>

      {/* Sub-navigation Tabs (Visual Realism) */}
      <div className="bg-primary-dark/80 px-4 sm:px-6 lg:px-8 border-t border-white/10 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              className={`px-3 py-2 text-xs font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                tab.active
                  ? 'border-secondary text-secondary font-bold bg-white/5'
                  : 'border-transparent text-slate-300 hover:text-white hover:bg-white/5 opacity-85'
              }`}
              title={tab.visualOnly ? 'Visual only - MVP Scope is Login -> OTP -> Search -> Book' : undefined}
            >
              <span>{tab.label}</span>
              {tab.visualOnly && (
                <span className="text-[9px] text-slate-400 bg-black/30 px-1 rounded">visual</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
};
