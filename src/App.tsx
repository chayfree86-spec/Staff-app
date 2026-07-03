import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { useStore } from './store/useStore';

function App() {
  const { isLoggedIn, login, restoreSession, triggerAutoAttendance, currentDate, settings, businessInfo } = useStore();
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>('password');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isLoggedIn) {
      triggerAutoAttendance();
      const interval = setInterval(() => {
        triggerAutoAttendance();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, currentDate, settings.autoAttendanceEnabled, settings.autoAttendanceTime, triggerAutoAttendance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifierInput.trim()) {
      setError('Enter mobile number or email.');
      return;
    }
    if (!passwordInput.trim()) {
      setError(loginMethod === 'pin' ? 'Enter PIN.' : 'Enter password.');
      return;
    }

    setIsSubmitting(true);
    const success = await login(identifierInput, passwordInput, loginMethod);
    setIsSubmitting(false);
    if (success) {
      setError('');
      setIdentifierInput('');
      setPasswordInput('');
    } else {
      setError('Invalid login details. Try again.');
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text-primary flex items-center justify-center p-6 bg-grid-dots select-none">
        <div className="w-full max-w-md bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[2rem] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
          <div className="bg-app-surface border border-app-border/40 rounded-[26px] p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-6">
            
            {/* Logo area */}
            <div className="flex flex-col items-center gap-3">
              <img
                src="/pwa-icon.png"
                alt={businessInfo.name || 'Staff App'}
                className="w-16 h-16 rounded-2xl object-cover shadow-lg border border-app-border/40 hover:scale-105 transition-transform duration-300"
              />
              <div className="text-center">
                <h1 className="text-lg font-black tracking-tight text-app-text-primary">
                  {businessInfo.name || 'Staff App'}
                </h1>
                <p className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.2em] mt-1">Business Manager</p>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold border border-rose-200 dark:border-rose-900/40 text-center">
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-2 p-1 bg-app-bg border border-app-border rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('password');
                    setPasswordInput('');
                  }}
                  className={`py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    loginMethod === 'password'
                      ? 'bg-app-surface text-primary shadow-sm'
                      : 'text-app-text-secondary'
                  }`}
                >
                  Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginMethod('pin');
                    setPasswordInput('');
                  }}
                  className={`py-2 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    loginMethod === 'pin'
                      ? 'bg-app-surface text-primary shadow-sm'
                      : 'text-app-text-secondary'
                  }`}
                >
                  PIN
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Mobile or Email</label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-xl">
                    account_circle
                  </span>
                  <input
                    type="text"
                    placeholder="Enter mobile or email..."
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">
                  {loginMethod === 'pin' ? 'PIN' : 'Password'}
                </label>
                <div className="relative">
                  <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-xl">
                    lock
                  </span>
                  <input
                    type={loginMethod === 'pin' ? 'tel' : 'password'}
                    inputMode={loginMethod === 'pin' ? 'numeric' : undefined}
                    placeholder={loginMethod === 'pin' ? 'Enter PIN...' : 'Enter password...'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(loginMethod === 'pin' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-bold tracking-widest"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-500 hover:opacity-95 disabled:opacity-60 text-white font-bold rounded-xl shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all cursor-pointer disabled:cursor-wait text-xs"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return <Layout />;
}

export default App;
