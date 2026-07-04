import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { InteractiveGridBackground } from './components/InteractiveGridBackground';
import { useStore } from './store/useStore';

function App() {
  const { isLoggedIn, isSessionRestoring, login, restoreSession, triggerAutoAttendance, currentDate, settings, businessInfo } = useStore();
  const [identifierInput, setIdentifierInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (value: string, index: number) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newPin = passwordInput.split('');
      newPin[index] = '';
      const finalVal = newPin.join('');
      setPasswordInput(finalVal);
      return;
    }

    const val = cleaned[cleaned.length - 1];
    const newPin = passwordInput.split('');
    for (let k = 0; k < index; k++) {
      if (!newPin[k]) newPin[k] = '';
    }
    newPin[index] = val;
    const finalVal = newPin.join('');
    setPasswordInput(finalVal);

    if (index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      const currentVal = passwordInput[index] || '';
      if (!currentVal && index > 0) {
        const newPin = passwordInput.split('');
        newPin[index - 1] = '';
        setPasswordInput(newPin.join(''));
        pinRefs.current[index - 1]?.focus();
        e.preventDefault();
      } else {
        const newPin = passwordInput.split('');
        newPin[index] = '';
        setPasswordInput(newPin.join(''));
      }
    }
  };

  const handlePinPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted) {
      setPasswordInput(pasted);
      const targetIndex = Math.min(pasted.length, 3);
      pinRefs.current[targetIndex]?.focus();
    }
  };
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
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, triggerAutoAttendance]);
  // Auto-detect login method based on input value (digits/mobile -> PIN, email/text -> Password)
  useEffect(() => {
    const trimmed = identifierInput.trim();
    if (!trimmed) {
      setLoginMethod('password');
      return;
    }
    
    let detectedMethod: 'password' | 'pin' = 'password';
    if (trimmed.includes('@')) {
      detectedMethod = 'password';
    } else {
      const isNumeric = /^[+\d\s-]+$/.test(trimmed) || /^\d/.test(trimmed);
      detectedMethod = isNumeric ? 'pin' : 'password';
    }

    setLoginMethod((prev) => {
      if (prev !== detectedMethod) {
        setPasswordInput(''); // Reset password input when switching method
      }
      return detectedMethod;
    });
  }, [identifierInput]);

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
    if (loginMethod === 'pin' && passwordInput.length !== 4) {
      setError('Enter a 4-digit PIN.');
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

  if (isSessionRestoring) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text-primary flex items-center justify-center p-6 relative overflow-hidden select-none">
        <InteractiveGridBackground />
        <div className="flex flex-col items-center gap-4.5 z-10">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 animate-spin flex items-center justify-center shadow-lg shadow-indigo-500/10 border border-white/10">
            <span className="material-symbols-rounded text-white select-none animate-pulse-slow" style={{ fontSize: '22px' }}>sync</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.25em] text-app-text-secondary select-none animate-pulse">Loading Session...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text-primary flex items-center justify-center p-6 relative overflow-hidden select-none">
        <InteractiveGridBackground />
        <div className="w-full max-w-md bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[2rem] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] z-10 relative">
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
                {loginMethod === 'pin' ? (
                  <div className="flex justify-center gap-3 max-w-xs mx-auto w-full py-1">
                    {[0, 1, 2, 3].map((index) => (
                      <input
                        key={index}
                        ref={(el) => { pinRefs.current[index] = el; }}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={passwordInput[index] || ''}
                        onChange={(e) => handlePinChange(e.target.value, index)}
                        onKeyDown={(e) => handlePinKeyDown(e, index)}
                        onPaste={index === 0 ? handlePinPaste : undefined}
                        className="w-12 h-12 text-center text-xl font-black bg-app-bg border border-app-border rounded-xl focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-app-text-primary"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <span className="material-symbols-rounded absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-xl">
                      lock
                    </span>
                    <input
                      type="password"
                      placeholder="Enter password..."
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-bold tracking-widest"
                    />
                  </div>
                )}
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
