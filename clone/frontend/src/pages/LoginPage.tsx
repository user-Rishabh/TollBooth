import React, { useState } from 'react';
import { api, LoginResponse } from '../lib/api';
import { Lock, User, KeyRound, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface LoginPageProps {
  initialUsername?: string;
  onNavigateToRegister: () => void;
  onLoginSuccess: (loginData: LoginResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  initialUsername = '',
  onNavigateToRegister,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState(initialUsername || 'tatkal_runner_1');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seedAccounts = [
    { label: 'Test Bot 1', user: 'tatkal_runner_1', pass: 'Password123!' },
    { label: 'Test Bot 2', user: 'tatkal_runner_2', pass: 'Password123!' },
    { label: 'Test Bot 3', user: 'tatkal_runner_3', pass: 'Password123!' },
  ];

  const handleQuickFill = (accUser: string, accPass: string) => {
    setUsername(accUser);
    setPassword(accPass);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.login({ username: username.trim(), password });
      onLoginSuccess(res);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-xl border border-slate-200 shadow-xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-primary tracking-tight">RailBook Login</h2>
        <p className="text-xs text-dark-muted mt-1">
          Sign in to access IRCTC Tatkal Seat Inventory
        </p>
      </div>

      {/* Quick Autofill for Demo Accounts */}
      <div className="mb-5 p-3 bg-amber-50/70 border border-amber-200/80 rounded-lg">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 mb-2">
          <Zap className="w-3.5 h-3.5 text-secondary" />
          <span>Quick Demo Test Accounts (Fixed OTP 123456):</span>
        </div>
        <div className="flex gap-2">
          {seedAccounts.map((acc) => (
            <button
              key={acc.user}
              type="button"
              onClick={() => handleQuickFill(acc.user, acc.pass)}
              className="flex-1 py-1 px-2 text-[11px] font-medium bg-white hover:bg-amber-100/60 border border-amber-200 text-amber-950 rounded transition shadow-sm text-center"
            >
              {acc.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-dark mb-1">
            Username / User ID
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div className="p-2.5 bg-blue-50/80 border border-blue-100 rounded-lg flex items-start gap-2 text-[11px] text-blue-900">
          <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span>
            <strong>Two-Step Tatkal Verification:</strong> Submitting will trigger a mock Aadhaar OTP to your linked mobile before booking access is granted.
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-primary hover:bg-primary-light text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Authenticating...</span>
          ) : (
            <>
              <span>Proceed to Aadhaar OTP</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-gray-600">
          New to RailBook?{' '}
          <button
            type="button"
            onClick={onNavigateToRegister}
            className="text-secondary hover:text-secondary-dark font-semibold underline ml-1"
          >
            Register with Aadhaar-linked mobile
          </button>
        </p>
      </div>
    </div>
  );
};
