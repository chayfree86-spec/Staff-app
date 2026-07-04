import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone;
    
    if (isStandalone) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const detectIOS = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(detectIOS);

    // Handle Android/Chrome beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay so the page loads first
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show it after a delay if not standalone
    if (detectIOS) {
      // Check if user dismissed it in this session to avoid annoying them
      const iOSDismissed = sessionStorage.getItem('pwa-ios-dismissed');
      if (!iOSDismissed) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Hide our custom UI
    setShowPrompt(false);
    
    // Show the native browser prompt
    deferredPrompt.prompt();
    
    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Clean up
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      sessionStorage.setItem('pwa-ios-dismissed', 'true');
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed inset-x-0 bottom-20 sm:bottom-6 mx-auto w-[90%] max-w-md z-[100] px-1">
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-app-surface border border-app-border/80 dark:border-slate-850/80 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex gap-4 items-start select-none backdrop-blur-md bg-app-surface/95"
          >
            {/* Logo */}
            <img
              src="/pwa-icon.png"
              alt="App Logo"
              className="w-12 h-12 rounded-xl object-cover border border-app-border/40 shrink-0 shadow-sm"
            />

            {/* Content */}
            <div className="flex-1 text-left">
              <h4 className="text-xs font-black text-app-text-primary tracking-tight uppercase">
                Install Staff App
              </h4>
              <p className="text-[10px] text-app-text-secondary mt-1 leading-normal font-semibold">
                {isIOS 
                  ? "Install Staff App on your home screen for quick access and a premium native-like experience."
                  : "Add Staff App to your Home Screen to manage attendance and payouts easily."
                }
              </p>

              {/* iOS specific installation guide */}
              {isIOS ? (
                <div className="mt-3 bg-app-bg/50 border border-app-border/40 rounded-lg p-2.5 text-[9px] text-app-text-primary leading-normal flex flex-col gap-1.5 font-bold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center font-black">1</span>
                    <span>Tap the **Share** button <span className="inline-flex align-middle text-sm select-none material-symbols-rounded" style={{ fontSize: '13px' }}>share</span> in browser toolbar.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded bg-primary/10 text-primary flex items-center justify-center font-black">2</span>
                    <span>Scroll down and select **Add to Home Screen** <span className="inline-flex align-middle text-sm select-none material-symbols-rounded" style={{ fontSize: '13px' }}>add_box</span>.</span>
                  </div>
                </div>
              ) : null}

              {/* Action buttons */}
              <div className="flex gap-2.5 mt-3 justify-end">
                <button
                  onClick={handleDismiss}
                  className="px-3 py-1.5 border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-lg text-[10px] font-bold transition-all cursor-pointer active:scale-95"
                >
                  {isIOS ? "Dismiss" : "Later"}
                </button>
                {!isIOS && (
                  <button
                    onClick={handleInstallClick}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer shadow-sm shadow-primary/15 hover:shadow-primary/25 active:scale-95 flex items-center gap-1"
                  >
                    <span className="material-symbols-rounded text-[11px]">download</span>
                    <span>Install Now</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
