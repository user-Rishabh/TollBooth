import React, { useState, useEffect, useRef } from 'react';
import { api, LoginResponse, VerifyOtpResponse } from '../lib/api';
import { Smartphone, CheckCircle, RefreshCw, AlertCircle, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';

interface OtpVerificationPageProps {
  loginData: LoginResponse;
  onNavigateBack: () => void;
  onVerificationSuccess: (authData: VerifyOtpResponse) => void;
}

export const OtpVerificationPage: React.FC<OtpVerificationPageProps> = ({
  loginData,
  onNavigateBack,
  onVerificationSuccess,
}) => {
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [currentOtpCode, setCurrentOtpCode] = useState<string>(loginData.otp_code);
  const [countdown, setCountdown] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [resending, setResending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Behavioral telemetry capture for keystrokes
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const keystrokeTimestamps = useRef<number[]>([]);
  const pageRenderTime = useRef<number>(performance.now());

  // Countdown effect
  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    // Record client keystroke timing delta
    const now = performance.now();
    keystrokeTimestamps.current.push(now);

    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance to next box if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);

    // Focus last filled box or next empty box
    const focusIndex = Math.min(pasted.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleAutofillMockOtp = () => {
    const chars = currentOtpCode.split('').slice(0, 6);
    const filled = ['', '', '', '', '', ''];
    chars.forEach((c, idx) => {
      filled[idx] = c;
    });
    setOtpDigits(filled);
    inputRefs.current[5]?.focus();
    setError(null);
  };

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setError(null);

    try {
      const res = await api.sendOtp({ user_id: loginData.user_id });
      setCurrentOtpCode(res.otp_code);
      setCountdown(60);
      setCanResend(false);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP.');
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join('');

    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError(null);

    // Compute inter-keystroke intervals
    const intervals: number[] = [];
    for (let i = 1; i < keystrokeTimestamps.current.length; i++) {
      intervals.push(Math.round(keystrokeTimestamps.current[i] - keystrokeTimestamps.current[i - 1]));
    }

    const client_timing_metadata = {
      inter_keystroke_intervals_ms: intervals,
      page_load_to_first_action_ms: Math.round(
        (keystrokeTimestamps.current[0] || performance.now()) - pageRenderTime.current
      ),
      total_interaction_time_ms: Math.round(performance.now() - pageRenderTime.current),
    };

    try {
      const res = await api.verifyOtp({
        user_id: loginData.user_id,
        otp_code: fullOtp,
        client_timing_metadata,
      });
      onVerificationSuccess(res);
    } catch (err: any) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 p-6 bg-white rounded-xl border border-slate-200 shadow-xl text-center">
      <button
        onClick={onNavigateBack}
        className="flex items-center gap-1 text-xs text-dark-muted hover:text-primary mb-4 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Login</span>
      </button>

      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-secondary/15 text-secondary mb-3">
        <Smartphone className="w-6 h-6" />
      </div>

      <h2 className="text-2xl font-bold text-primary tracking-tight">Verify Mock Aadhaar OTP</h2>
      <p className="text-xs text-dark-muted mt-1">
        Enter the 6-digit code sent to linked mobile{' '}
        <span className="font-semibold text-dark">{loginData.masked_mobile}</span>
      </p>

      {/* Demo helper banner showing the mock OTP */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
            <Sparkles className="w-4 h-4 text-secondary" />
            <span>Mock Delivery (No real SMS):</span>
          </div>
          <button
            type="button"
            onClick={handleAutofillMockOtp}
            className="text-[11px] font-semibold text-secondary hover:underline"
          >
            Autofill Code
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xs text-amber-800">Your simulated OTP code is:</span>
          <span className="font-mono text-base font-extrabold tracking-widest text-primary bg-white px-2 py-0.5 rounded border border-amber-300 shadow-sm">
            {currentOtpCode}
          </span>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="mt-6">
        {/* 6-digit Boxed Input Container */}
        <div className="flex justify-center gap-2.5 sm:gap-3 mb-6">
          {otpDigits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => (inputRefs.current[idx] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              className="w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono border-2 rounded-lg border-slate-300 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition bg-slate-50 focus:bg-white text-dark shadow-sm"
            />
          ))}
        </div>

        {/* Resend & Timer */}
        <div className="flex items-center justify-between text-xs text-dark-muted mb-6 px-2">
          <span>
            {countdown > 0 ? (
              <span>Resend code in <strong className="text-dark font-mono">{countdown}s</strong></span>
            ) : (
              <span className="text-amber-700 font-medium">OTP may have expired</span>
            )}
          </span>

          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend || resending}
            className="flex items-center gap-1 font-semibold text-secondary hover:text-secondary-dark disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
            <span>{resending ? 'Sending...' : 'Resend OTP'}</span>
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || otpDigits.join('').length !== 6}
          className="w-full py-2.5 px-4 bg-secondary hover:bg-secondary-dark text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span>Verifying Session...</span>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Verify & Unlock Tatkal Portal</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-500">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Continuous behavioral verification active from login onward</span>
      </div>
    </div>
  );
};
