import React, { useState } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OtpVerificationPage } from './pages/OtpVerificationPage';
import { LoginResponse, VerifyOtpResponse } from './lib/api';
import { CheckCircle2, Ticket, ShieldCheck, ArrowRight, Clock } from 'lucide-react';

type PageState = 'login' | 'register' | 'otp' | 'authenticated';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageState>('login');
  const [loginData, setLoginData] = useState<LoginResponse | null>(null);
  const [authSession, setAuthSession] = useState<VerifyOtpResponse | null>(null);
  const [prefilledUsername, setPrefilledUsername] = useState<string>('');

  const handleLoginSuccess = (data: LoginResponse) => {
    setLoginData(data);
    setCurrentPage('otp');
  };

  const handleVerificationSuccess = (auth: VerifyOtpResponse) => {
    setAuthSession(auth);
    setCurrentPage('authenticated');
  };

  const handleLogout = () => {
    setAuthSession(null);
    setLoginData(null);
    setCurrentPage('login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream text-dark font-sans selection:bg-secondary/20 selection:text-secondary-dark">
      <Header
        currentUser={authSession?.username || null}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {currentPage === 'register' && (
          <RegisterPage
            onNavigateToLogin={() => setCurrentPage('login')}
            onRegisteredSuccess={(username) => {
              setPrefilledUsername(username);
              setCurrentPage('login');
            }}
          />
        )}

        {currentPage === 'login' && (
          <LoginPage
            initialUsername={prefilledUsername}
            onNavigateToRegister={() => setCurrentPage('register')}
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {currentPage === 'otp' && loginData && (
          <OtpVerificationPage
            loginData={loginData}
            onNavigateBack={() => setCurrentPage('login')}
            onVerificationSuccess={handleVerificationSuccess}
          />
        )}

        {currentPage === 'authenticated' && authSession && (
          <div className="max-w-2xl mx-auto my-8 p-8 bg-white rounded-2xl border border-slate-200 shadow-xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h2 className="text-2xl font-bold text-primary tracking-tight">
              Aadhaar Verification Complete!
            </h2>
            <p className="text-sm text-dark-muted mt-2">
              Welcome, <strong className="text-dark font-semibold">{authSession.username}</strong>. Your session has been verified and authenticated.
            </p>

            {/* Session Token Card */}
            <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-left">
              <div className="flex items-center justify-between text-xs text-dark-muted mb-1 font-mono">
                <span>Active Session Token:</span>
                <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-sans font-medium text-[11px]">
                  Tollbooth Verified
                </span>
              </div>
              <div className="font-mono text-xs bg-white p-2.5 rounded border border-slate-200 text-slate-800 break-all select-all">
                {authSession.session_token}
              </div>
            </div>

            {/* Next Step Preview */}
            <div className="mt-6 p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-left flex items-start gap-3">
              <Clock className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
              <div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                  Upcoming Phase 3: Train Availability & Tatkal List
                </h3>
                <p className="text-xs text-amber-900/80 mt-1">
                  Once inventory is unlocked, you will be able to search trains, monitor the live Tatkal opening countdown, and proceed to booking with CAPTCHA.
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={handleLogout}
                className="px-5 py-2 text-xs font-semibold text-slate-600 hover:text-dark bg-slate-100 hover:bg-slate-200 rounded-lg transition"
              >
                Log Out
              </button>
              <button
                disabled
                className="px-6 py-2 text-xs font-semibold text-white bg-primary opacity-60 cursor-not-allowed rounded-lg flex items-center gap-2"
                title="Enabled in Phase 3"
              >
                <span>Browse Trains (Phase 3)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
