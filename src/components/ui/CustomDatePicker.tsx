import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { format, parseISO } from 'date-fns';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (dateStr: string) => void;
  className?: string;
  label?: string;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  className = '',
  label,
  onOpenChange,
  inline = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inline) {
      const timer = setTimeout(() => {
        calendarRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [isOpen, inline]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (onOpenChange) {
          onOpenChange(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onOpenChange]);

  const selectedDate = value ? parseISO(value) : new Date();

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      const offsetDate = new Date(day.getTime() - day.getTimezoneOffset() * 60000);
      const dateStr = offsetDate.toISOString().split('T')[0];
      onChange(dateStr);
      setIsOpen(false);
      if (onOpenChange) {
        onOpenChange(false);
      }
    }
  };

  const handlePrevDay = () => {
    const prevDay = new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000);
    const dateStr = prevDay.toISOString().split('T')[0];
    onChange(dateStr);
  };

  const handleNextDay = () => {
    const nextDay = new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = nextDay.toISOString().split('T')[0];
    onChange(dateStr);
  };

  return (
    <div ref={containerRef} className={`flex flex-col gap-2 ${className} w-full`}>
      <div className="flex items-center gap-2 w-full">
        {/* Left Arrow Button */}
        <button
          type="button"
          onClick={handlePrevDay}
          className="w-11 h-11 flex items-center justify-center bg-app-surface border border-app-border rounded-xl text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-rounded select-none text-[22px]">chevron_left</span>
        </button>

        {/* Main Date Picker Dropdown Button */}
        <div className="relative flex-1">
          <button
            type="button"
            onClick={() => {
              const next = !isOpen;
              setIsOpen(next);
              if (onOpenChange) {
                onOpenChange(next);
              }
            }}
            className="flex items-center justify-center gap-2.5 px-4 py-3 bg-app-surface border border-app-border rounded-xl focus:outline-none focus:border-primary transition-colors text-app-text-primary text-sm shadow-sm font-medium w-full cursor-pointer"
          >
            <span className="material-symbols-rounded text-primary">calendar_month</span>
            <span className="font-bold">{format(selectedDate, 'dd MMM yyyy')}</span>
          </button>
        </div>

        {/* Right Arrow Button */}
        <button
          type="button"
          onClick={handleNextDay}
          className="w-11 h-11 flex items-center justify-center bg-app-surface border border-app-border rounded-xl text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all cursor-pointer shrink-0"
        >
          <span className="material-symbols-rounded select-none text-[22px]">chevron_right</span>
        </button>
      </div>

      {isOpen && (
        <div 
          ref={calendarRef}
          className={`${
          inline 
            ? 'relative w-full shadow-sm' 
            : 'absolute left-0 mt-2 z-50 shadow-app-soft'
        } bg-app-surface border border-app-border rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-100 min-w-[300px] flex justify-center`}>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            required
          />
        </div>
      )}
    </div>
  );
};
