import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6 px-4 text-center text-xs text-dark-muted shadow-inner">
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="flex items-center justify-center gap-2 text-amber-700 font-medium">
          <AlertTriangle className="w-4 h-4" />
          <span>Not affiliated with IRCTC or Indian Railways</span>
        </div>
        <div className="text-gray-500">
          Clone Demo Environment for Tollbooth Security Defense testing • All Aadhaar OTP authentications are simulated local mocks with no UIDAI integration.
        </div>
        <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-gray-400">
          <span>Target: RailBook v0.1</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Tollbooth Defense Active
          </span>
        </div>
      </div>
    </footer>
  );
};
