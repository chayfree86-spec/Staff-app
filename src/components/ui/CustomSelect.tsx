import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  label?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  className = '',
  label,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={containerRef} className={`relative flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <span className="text-xs font-semibold text-app-text-secondary uppercase tracking-wider">
          {label}
        </span>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 bg-app-surface border border-app-border rounded-xl text-left focus:outline-none focus:border-primary transition-colors text-app-text-primary text-sm shadow-sm font-bold"
      >
        <span className={selectedOption ? 'text-app-text-primary font-bold' : 'text-app-text-secondary'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="material-symbols-rounded text-app-text-secondary select-none" style={{ fontSize: '18px' }}>
          {isOpen ? 'keyboard_arrow_up' : 'keyboard_arrow_down'}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-app-surface border border-app-border rounded-xl shadow-app-soft z-50 max-h-60 overflow-y-auto py-0 transition-all animate-in fade-in slide-in-from-top-2 duration-100">
          {options.map((option, index) => {
            const isFirst = index === 0;
            const isLast = index === options.length - 1;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-3 text-left text-sm text-app-text-primary hover:bg-primary/5 transition-colors font-bold ${
                  option.value === value ? 'bg-primary/10 text-primary font-bold' : ''
                } ${isFirst ? 'rounded-t-[11px]' : ''} ${isLast ? 'rounded-b-[11px]' : ''}`}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <span className="material-symbols-rounded text-primary select-none" style={{ fontSize: '18px' }}>check</span>
                )}
              </button>
            );
          })}
          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-app-text-secondary text-center">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};
