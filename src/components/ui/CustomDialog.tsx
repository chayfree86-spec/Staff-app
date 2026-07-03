import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidthClass?: string;
  bodyClass?: string;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  maxWidthClass = 'max-w-md',
  bodyClass = '',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (overlayRef.current === e.target) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-[2px]"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`relative w-full ${maxWidthClass} bg-app-surface border border-app-border rounded-2xl shadow-app-soft overflow-hidden z-10 flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-app-border">
              <h3 className="text-base font-bold text-app-text-primary tracking-tight">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full text-app-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:outline-none focus:ring-0 select-none cursor-pointer flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-rounded select-none" style={{ fontSize: '16px' }}>close</span>
              </button>
            </div>

            {/* Content */}
            <div className={`px-6 py-5 overflow-y-auto text-sm text-app-text-secondary leading-relaxed ${bodyClass || 'max-h-[70vh]'}`}>
              {children}
            </div>

            {/* Actions */}
            {actions && (
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-app-surface border-t border-app-border">
                {actions}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
