import React, { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { useStore } from './store/useStore';

// Remembers the last identifier/secret/method used to sign in, so the login
// form is pre-filled (including PIN) the next time the app is opened.
const REMEMBER_LOGIN_KEY = 'staffapp_remember_login';

interface RememberedLogin {
  identifier: string;
  secret: string;
  method: 'password' | 'pin';
}

const loadRememberedLogin = (): RememberedLogin | null => {
  try {
    const raw = localStorage.getItem(REMEMBER_LOGIN_KEY);
    return raw ? (JSON.parse(raw) as RememberedLogin) : null;
  } catch {
    return null;
  }
};

function App() {
  const { isLoggedIn, isSessionRestoring, login, restoreSession, triggerAutoAttendance, currentDate, settings, businessInfo, currentUser } = useStore();
  const [identifierInput, setIdentifierInput] = useState(() => loadRememberedLogin()?.identifier ?? '');
  const [passwordInput, setPasswordInput] = useState(() => loadRememberedLogin()?.secret ?? '');
  const [loginMethod, setLoginMethod] = useState<'password' | 'pin'>(() => loadRememberedLogin()?.method ?? 'password');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handlePinChange = (value: string, index: number) => {
    const cleaned = value.replace(/\D/g, '');
    
    // Handle autofill/paste of multiple digits (e.g. "1234")
    if (cleaned.length > 1) {
      const pinArray = cleaned.slice(0, 4).split('');
      const finalVal = pinArray.join('');
      setPasswordInput(finalVal);
      
      const nextIndex = Math.min(pinArray.length - 1, 3);
      pinRefs.current[nextIndex]?.focus();
      return;
    }

    if (!cleaned) {
      const newPin = passwordInput.split('');
      newPin[index] = '';
      const finalVal = newPin.join('');
      setPasswordInput(finalVal);
      return;
    }

    const val = cleaned;
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

  // Load saved credentials on logout
  useEffect(() => {
    if (!isLoggedIn) {
      const saved = loadRememberedLogin();
      setIdentifierInput(saved?.identifier ?? '');
      setPasswordInput(saved?.secret ?? '');
      setLoginMethod(saved?.method ?? 'password');
    }
  }, [isLoggedIn]);
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
      try {
        localStorage.setItem(
          REMEMBER_LOGIN_KEY,
          JSON.stringify({ identifier: identifierInput, secret: passwordInput, method: loginMethod })
        );
      } catch {
        // ignore
      }
      setError('');
    } else {
      setError('Invalid login details. Try again.');
    }
  };

  if (isSessionRestoring) {
    return (
      <div className="min-h-screen w-screen bg-[#FAF9FF] flex items-center justify-center relative overflow-hidden select-none">
        {/* Inline style for wave animations */}
        <style>{`
          @keyframes wave-move-1 {
            0% { transform: translate3d(-20px, 0, 0); }
            50% { transform: translate3d(20px, 5px, 0); }
            100% { transform: translate3d(-20px, 0, 0); }
          }
          @keyframes wave-move-2 {
            0% { transform: translate3d(20px, 0, 0); }
            50% { transform: translate3d(-20px, -6px, 0); }
            100% { transform: translate3d(20px, 0, 0); }
          }
          @keyframes wave-move-3 {
            0% { transform: translate3d(0, -5px, 0); }
            50% { transform: translate3d(15px, 4px, 0); }
            100% { transform: translate3d(0, -5px, 0); }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(12px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>

        {/* Static dots layer */}
        <div className="absolute inset-0 bg-grid-dots opacity-15 pointer-events-none z-0" />

        {/* Soft purple glow */}
        <div 
          className="absolute top-1/4 left-1/4 w-[350px] h-[350px] rounded-full pointer-events-none z-0 filter blur-[80px]" 
          style={{ backgroundColor: 'rgba(124, 58, 237, 0.15)' }} 
        />

        {/* Wave Layers at the bottom */}
        <div className="absolute inset-x-0 bottom-0 w-[120%] left-[-10%] h-[280px] overflow-hidden pointer-events-none z-10 lg:hidden">
          {/* Wave 1 */}
          <svg 
            className="absolute bottom-0 w-full h-full" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#7C3AED',
              fillOpacity: 0.18,
              filter: 'blur(3px)',
              animation: 'wave-move-1 8s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,160 C320,300 480,80 800,240 C1120,400 1280,120 1440,200 L1440,320 L0,320 Z" />
          </svg>
          
          {/* Wave 2 */}
          <svg 
            className="absolute bottom-0 w-full h-full" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#8B5CF6',
              fillOpacity: 0.15,
              filter: 'blur(4px)',
              animation: 'wave-move-2 10s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,224 C320,120 640,300 960,180 C1280,60 1440,240 1440,240 L1440,320 L0,320 Z" />
          </svg>
          
          {/* Wave 3 */}
          <svg 
            className="absolute bottom-0 w-full h-full" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#A855F7',
              fillOpacity: 0.12,
              filter: 'blur(5px)',
              animation: 'wave-move-3 12s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,128 C480,240 960,40 1440,160 L1440,320 L0,320 Z" />
          </svg>
        </div>

        {/* Central Logo and Loader */}
        <div className="flex flex-col items-center justify-center z-20 animate-fade-in-up px-6">
          <img
            src="/logo-transparent.png"
            alt="EasyAttendance Logo"
            className="w-64 sm:w-80 h-auto object-contain filter drop-shadow-[0_10px_25px_rgba(124,58,237,0.12)]"
            style={{ imageRendering: '-webkit-optimize-contrast' }}
          />
          <div className="mt-8 flex flex-col items-center gap-2">
            <div className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-app-bg text-app-text-primary flex items-center justify-center p-6 bg-grid-dots select-none relative overflow-hidden">
        {/* Style block for animations */}
        <style>{`
          @keyframes wave-move-1 {
            0% { transform: translate3d(-20px, 0, 0); }
            50% { transform: translate3d(20px, 5px, 0); }
            100% { transform: translate3d(-20px, 0, 0); }
          }
          @keyframes wave-move-2 {
            0% { transform: translate3d(20px, 0, 0); }
            50% { transform: translate3d(-20px, -6px, 0); }
            100% { transform: translate3d(20px, 0, 0); }
          }
          @keyframes wave-move-3 {
            0% { transform: translate3d(0, -5px, 0); }
            50% { transform: translate3d(15px, 4px, 0); }
            100% { transform: translate3d(0, -5px, 0); }
          }
          @keyframes gradient-move {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient-move {
            background-size: 200% 200%;
            animation: gradient-move 3s ease infinite;
          }
        `}</style>

        {/* Top Wave Header */}
        <div className="absolute inset-x-0 top-0 w-[120%] left-[-10%] h-[180px] sm:h-[220px] overflow-hidden pointer-events-none z-0 lg:hidden">
          {/* Header Wave 1 */}
          <svg 
            className="absolute top-0 w-full h-full rotate-180" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#7C3AED',
              fillOpacity: 0.18,
              filter: 'blur(3px)',
              animation: 'wave-move-1 9s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,160 C320,300 480,80 800,240 C1120,400 1280,120 1440,200 L1440,320 L0,320 Z" />
          </svg>
          
          {/* Header Wave 2 */}
          <svg 
            className="absolute top-0 w-full h-full rotate-180" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#8B5CF6',
              fillOpacity: 0.15,
              filter: 'blur(4px)',
              animation: 'wave-move-2 11s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,224 C320,120 640,300 960,180 C1280,60 1440,240 1440,240 L1440,320 L0,320 Z" />
          </svg>

          {/* Header Wave 3 */}
          <svg 
            className="absolute top-0 w-full h-full rotate-180" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#A855F7',
              fillOpacity: 0.12,
              filter: 'blur(5px)',
              animation: 'wave-move-3 13s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,128 C480,240 960,40 1440,160 L1440,320 L0,320 Z" />
          </svg>
        </div>

        {/* Bottom Wave Footer */}
        <div className="absolute inset-x-0 bottom-0 w-[120%] left-[-10%] h-[180px] sm:h-[220px] overflow-hidden pointer-events-none z-0 lg:hidden">
          {/* Footer Wave 1 */}
          <svg 
            className="absolute bottom-0 w-full h-full" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#7C3AED',
              fillOpacity: 0.18,
              filter: 'blur(3px)',
              animation: 'wave-move-1 8s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,160 C320,300 480,80 800,240 C1120,400 1280,120 1440,200 L1440,320 L0,320 Z" />
          </svg>

          {/* Footer Wave 2 */}
          <svg 
            className="absolute bottom-0 w-full h-full" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#8B5CF6',
              fillOpacity: 0.15,
              filter: 'blur(3px)',
              animation: 'wave-move-2 10s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,224 C320,120 640,300 960,180 C1280,60 1440,240 1440,240 L1440,320 L0,320 Z" />
          </svg>

          {/* Footer Wave 3 */}
          <svg 
            className="absolute bottom-0 w-full h-full" 
            viewBox="0 0 1440 320" 
            preserveAspectRatio="none"
            style={{
              fill: '#A855F7',
              fillOpacity: 0.12,
              filter: 'blur(4px)',
              animation: 'wave-move-3 12s ease-in-out infinite',
              willChange: 'transform',
              transform: 'translateZ(0)',
            }}
          >
            <path d="M0,128 C480,240 960,40 1440,160 L1440,320 L0,320 Z" />
          </svg>
        </div>
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
                <h1 className="text-2xl font-black tracking-tight select-none">
                  <span className="text-app-text-primary">Easy</span>
                  <span className="text-indigo-600 dark:text-indigo-400">Attendance</span>
                </h1>
                <p className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-1.5 flex items-center justify-center gap-2.5 select-none">
                  <span className="w-5 h-[1.5px] bg-indigo-500/20 dark:bg-indigo-400/30 rounded-full shrink-0"></span>
                  <span>STAFF ATTENDANCE MADE EASY</span>
                  <span className="w-5 h-[1.5px] bg-indigo-500/20 dark:bg-indigo-400/30 rounded-full shrink-0"></span>
                </p>
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
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary select-none">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder="Enter mobile or email..."
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-indigo-600 dark:text-indigo-400 placeholder:text-app-text-secondary focus:outline-none focus:border-indigo-500 transition-all font-black"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">
                  {loginMethod === 'pin' ? 'PIN' : 'Password'}
                </label>
                {loginMethod === 'pin' ? (
                  <div className="flex justify-center gap-3 max-w-xs mx-auto w-full py-1">
                    {[0, 1, 2, 3].map((index) => {
                      const hasDigit = passwordInput.length > index;
                      return (
                        <div key={index} className="relative w-12 h-12 group/pin">
                          <input
                            ref={(el) => { pinRefs.current[index] = el; }}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={passwordInput[index] || ''}
                            onChange={(e) => handlePinChange(e.target.value, index)}
                            onKeyDown={(e) => handlePinKeyDown(e, index)}
                            onPaste={index === 0 ? handlePinPaste : undefined}
                            className="absolute inset-0 w-full h-full text-center text-transparent bg-transparent border-2 border-app-border rounded-xl focus:outline-none focus:border-indigo-500 transition-all focus:scale-105 z-10 caret-transparent selection:bg-transparent"
                            autoComplete="one-time-code"
                          />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-xl bg-app-bg border border-app-border group-focus-within/pin:border-indigo-500 transition-all">
                            {hasDigit ? (
                              <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400 animate-gradient-move shadow-[0_0_8px_rgba(139,92,246,0.3)] shrink-0" />
                            ) : (
                              <div className="w-1 h-1 rounded-full bg-app-border/70 group-hover/pin:bg-indigo-500/40 transition-colors shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-app-text-secondary select-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3c0-2.9-2.35-5.25-5.25-5.25zm3.75 8.25v-3a3.75 3.75 0 10-7.5 0v3h7.5z" clipRule="evenodd" />
                      </svg>
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
        <PWAInstallPrompt />
      </div>
    );
  }

  return (
    <>
      <Layout />
      <PWAInstallPrompt />
    </>
  );
}

export default App;
