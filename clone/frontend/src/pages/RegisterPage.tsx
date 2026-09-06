import React, { useState } from 'react';
import { api, RegisterPayload } from '../lib/api';
import { UserPlus, Lock, Smartphone, User, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface RegisterPageProps {
  onNavigateToLogin: () => void;
  onRegisteredSuccess: (username: string) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateToLogin, onRegisteredSuccess }) => {
  const [formData, setFormData] = useState<RegisterPayload>({
    username: '',
    password: '',
    aadhaar_linked_mobile: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.username.trim() || !formData.password || !formData.aadhaar_linked_mobile.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.aadhaar_linked_mobile.trim().length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.register(formData);
      setSuccessMsg(`Account created for ${res.username}! Redirecting to login...`);
      setTimeout(() => {
        onRegisteredSuccess(res.username);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-xl border border-slate-200 shadow-xl">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-3">
          <UserPlus className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-primary tracking-tight">Register for RailBook</h2>
        <p className="text-xs text-dark-muted mt-1">
          Link your mobile number for Mock Aadhaar Tatkal Verification
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-dark mb-1">
            IRCTC / RailBook Username <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. traveler_rajesh"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-dark mb-1 flex items-center justify-between">
            <span>Aadhaar-Linked Mobile <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Mock Simulation
            </span>
          </label>
          <div className="relative">
            <Smartphone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="tel"
              required
              maxLength={10}
              value={formData.aadhaar_linked_mobile}
              onChange={(e) => setFormData({ ...formData, aadhaar_linked_mobile: e.target.value.replace(/\D/g, '') })}
              placeholder="10-digit mobile (e.g. 9876543210)"
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition"
            />
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            Simulated OTP will be generated for this mobile number on login.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 py-2.5 px-4 bg-primary hover:bg-primary-light text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Creating account...</span>
          ) : (
            <>
              <span>Complete Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <p className="text-xs text-gray-600">
          Already registered on RailBook?{' '}
          <button
            type="button"
            onClick={onNavigateToLogin}
            className="text-secondary hover:text-secondary-dark font-semibold underline ml-1"
          >
            Sign in with Aadhaar OTP
          </button>
        </p>
      </div>
    </div>
  );
};
