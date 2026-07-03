import React, { createContext, useContext, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type AlertType = 'info' | 'success' | 'warning' | 'danger';

interface AlertOptions {
  title?: string;
  type?: AlertType;
  confirmText?: string;
}

interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
}

interface AlertConfirmContextType {
  alert: (message: string, options?: AlertOptions) => Promise<void>;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const AlertConfirmContext = createContext<AlertConfirmContextType | null>(null);

export const AlertConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'alert' | 'confirm'>('alert');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<AlertType>('info');
  const [confirmText, setConfirmText] = useState('OK');
  const [cancelText, setCancelText] = useState('Cancel');

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const alert = (message: string, options?: AlertOptions): Promise<void> => {
    setMessage(message);
    setTitle(options?.title || 'Notification');
    setType(options?.type || 'info');
    setConfirmText(options?.confirmText || 'OK');
    setDialogType('alert');
    setIsOpen(true);

    return new Promise<void>((resolve) => {
      resolverRef.current = () => {
        resolve();
      };
    });
  };

  const confirm = (message: string, options?: ConfirmOptions): Promise<boolean> => {
    setMessage(message);
    setTitle(options?.title || 'Are you sure?');
    setType(options?.type || 'warning');
    setConfirmText(options?.confirmText || 'Confirm');
    setCancelText(options?.cancelText || 'Cancel');
    setDialogType('confirm');
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = (val) => {
        resolve(val);
      };
    });
  };

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      if (dialogType === 'alert') {
        (resolverRef.current as () => void)();
      } else {
        resolverRef.current(true);
      }
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      if (dialogType === 'confirm') {
        resolverRef.current(false);
      } else {
        (resolverRef.current as () => void)();
      }
      resolverRef.current = null;
    }
  };

  // Get icon based on alert type
  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>check_circle</span>
          </div>
        );
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>warning</span>
          </div>
        );
      case 'danger':
        return (
          <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>error</span>
          </div>
        );
      case 'info':
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-500 flex items-center justify-center shrink-0">
            <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>info</span>
          </div>
        );
    }
  };

  // Get confirm button styling based on type
  const getConfirmButtonClass = () => {
    const base = "px-4 py-2 text-white rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-sm active:scale-95";
    switch (type) {
      case 'danger':
        return `${base} bg-rose-500 hover:bg-rose-600 shadow-rose-500/10`;
      case 'warning':
        return `${base} bg-amber-500 hover:bg-amber-600 shadow-amber-500/10`;
      case 'success':
        return `${base} bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10`;
      case 'info':
      default:
        return `${base} bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10`;
    }
  };

  return (
    <AlertConfirmContext.Provider value={{ alert, confirm }}>
      {children}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]"
            />

            {/* Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-app-surface border border-app-border rounded-2xl shadow-app-soft overflow-hidden z-10 flex flex-col p-5 gap-4"
            >
              {/* Header with Icon & Title */}
              <div className="flex items-start gap-3.5">
                {getIcon()}
                <div className="flex flex-col gap-1 mt-0.5">
                  <h3 className="text-sm font-bold text-app-text-primary tracking-tight">
                    {title}
                  </h3>
                  <p className="text-xs text-app-text-secondary leading-relaxed">
                    {message}
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-2.5 mt-2">
                {dialogType === 'confirm' && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer active:scale-95"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={getConfirmButtonClass()}
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AlertConfirmContext.Provider>
  );
};

export const useAlertConfirm = () => {
  const context = useContext(AlertConfirmContext);
  if (!context) {
    throw new Error('useAlertConfirm must be used within an AlertConfirmProvider');
  }
  return context;
};
