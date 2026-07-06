import React from 'react';
import { useStore } from '../store/useStore';
import { format, parseISO } from 'date-fns';
import { getSalaryCycleForDate } from '../utils/salary';

export const MoreScreen: React.FC = () => {
  const {
    setScreen,
    businessInfo,
    currentDate,
    settings,
    staffList,
    advanceList,
    deductionList,
    currentUser,
  } = useStore();

  // Business/user management is only for the primary admin (first user).
  const isPrimaryAdmin = currentUser?.id === '1';

  const activeStaff = staffList.filter(s => s.status === 'Active');

  // Calculates financial details for all staff
  const getOutstandingAdvance = (targetStaffId: string) => {
    const totalAdv = advanceList
      .filter(a => a.staffId === targetStaffId)
      .reduce((sum, item) => sum + item.amount, 0);
    const totalDed = deductionList
      .filter(d => d.staffId === targetStaffId)
      .reduce((sum, item) => sum + item.amount, 0);
    return Math.max(0, totalAdv - totalDed);
  };

  const totalOutstandingAdvance = staffList.reduce(
    (sum, s) => sum + getOutstandingAdvance(s.id),
    0
  );

  const currentCycle = getSalaryCycleForDate(currentDate, settings.salaryCycleStart);
  const totalDeductionsThisMonth = deductionList
    .filter(d => d.date >= currentCycle.start && d.date <= currentCycle.end)
    .reduce((sum, item) => sum + item.amount, 0);

  const currentMonthLabel = format(parseISO(currentCycle.label + '-01'), 'MMMM yyyy');

  const businessInitials = businessInfo.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'SA';

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-200">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1 select-none text-left">
        <h2 className="text-xl font-extrabold text-app-text-primary tracking-tight">
          More Features
        </h2>
        <p className="text-xs text-app-text-secondary font-medium">
          Access advanced ledgers, deduction logs, and system settings.
        </p>
      </div>

      {/* Premium Combined Business Header Card */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[2rem] p-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.02)]">
        <div className="relative overflow-hidden bg-app-surface border border-app-border/40 rounded-[26px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Subtle gradient accent background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] pointer-events-none" />

          <div className="flex items-center gap-4 z-10">
            {businessInfo.logo ? (
              <img
                src={businessInfo.logo}
                alt="Business Logo"
                className="w-14 h-14 rounded-2xl object-cover shadow-lg border border-app-border shrink-0 select-none hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-black flex items-center justify-center text-lg shadow-lg shadow-indigo-500/20 border-0 shrink-0 select-none">
                {businessInitials}
              </div>
            )}
            <div className="overflow-hidden">
              <div className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.18em] font-black bg-primary/15 text-primary w-max select-none">
                {isPrimaryAdmin ? 'Primary Administrator' : 'Administrator'}
              </div>
              <h3 className="font-black text-app-text-primary text-base tracking-tight mt-1.5 truncate">
                {businessInfo.name}
              </h3>
              <p className="text-xs text-app-text-secondary truncate mt-1">
                {businessInfo.address || 'Lalganj, Azamgarh'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setScreen('business')}
            className="w-full md:w-auto px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-500 hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-indigo-500/10 z-10 shrink-0"
          >
            <span className="material-symbols-rounded select-none text-[15px]">store</span>
            <span>Configure Business</span>
          </button>

        </div>
      </div>

      {/* Utilities Section Title */}
      <div className="px-1 select-none">
        <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.2em] leading-none">
          Tools & Configuration
        </h4>
      </div>

      {/* Grid Layout of modern PWA Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Advances Ledger */}
        <div 
          onClick={() => setScreen('advance')}
          className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-5 flex flex-col justify-between h-full min-h-[140px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <div className="flex items-start justify-between gap-4">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>payments</span>
              </div>
              <div className="text-right">
                <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none block">Outstanding</span>
                <span className="text-lg font-black text-amber-500 mt-1 leading-none block">
                  ₹{totalOutstandingAdvance.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-app-text-primary text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                Staff Advances Ledger
                <span className="material-symbols-rounded select-none text-xs text-app-text-secondary group-hover:text-primary transition-all group-hover:translate-x-0.5">arrow_forward</span>
              </h4>
              <p className="text-[10px] text-app-text-secondary mt-1.5 leading-relaxed">
                Track payments given to staff, outstanding balances, and repayment history.
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: Deductions Log */}
        <div 
          onClick={() => setScreen('deduction')}
          className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-5 flex flex-col justify-between h-full min-h-[140px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <div className="flex items-start justify-between gap-4">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>do_not_disturb_on</span>
              </div>
              <div className="text-right">
                <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none block">This Month</span>
                <span className="text-lg font-black text-rose-500 mt-1 leading-none block">
                  ₹{totalDeductionsThisMonth.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-app-text-primary text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                Staff Deductions Log
                <span className="material-symbols-rounded select-none text-xs text-app-text-secondary group-hover:text-primary transition-all group-hover:translate-x-0.5">arrow_forward</span>
              </h4>
              <p className="text-[10px] text-app-text-secondary mt-1.5 leading-relaxed">
                Record salary deductions, breakage costs, penalties, or fines.
              </p>
            </div>
          </div>
        </div>

        {/* Card 3: Reports & Payroll Generator */}
        <div 
          onClick={() => setScreen('reports')}
          className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-5 flex flex-col justify-between h-full min-h-[140px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <div className="flex items-start justify-between gap-4">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>description</span>
              </div>
              <div className="text-right">
                <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none block">Payroll Month</span>
                <span className="text-xs font-black text-blue-600 mt-1.5 leading-none block">
                  {currentMonthLabel.slice(0, 3)} {currentDate.slice(0, 4)}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-app-text-primary text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                Reports & Payroll Generator
                <span className="material-symbols-rounded select-none text-xs text-app-text-secondary group-hover:text-primary transition-all group-hover:translate-x-0.5">arrow_forward</span>
              </h4>
              <p className="text-[10px] text-app-text-secondary mt-1.5 leading-relaxed">
                Compile payroll reports, PDF summaries, and share salary details via WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Card 4: Application Preferences */}
        <div 
          onClick={() => setScreen('settings')}
          className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group"
        >
          <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-5 flex flex-col justify-between h-full min-h-[140px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
            <div className="flex items-start justify-between gap-4">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>settings</span>
              </div>
              <div className="text-right">
                <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none block">Holiday</span>
                <span className="text-xs font-black text-violet-600 mt-1.5 leading-none block">
                  {settings.weeklyHoliday[0] || 'None'}
                </span>
              </div>
            </div>
            <div className="mt-4">
              <h4 className="font-bold text-app-text-primary text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                Application Preferences
                <span className="material-symbols-rounded select-none text-xs text-app-text-secondary group-hover:text-primary transition-all group-hover:translate-x-0.5">arrow_forward</span>
              </h4>
              <p className="text-[10px] text-app-text-secondary mt-1.5 leading-relaxed">
                Configure weekly holidays, paid leaves, and general settings.
              </p>
            </div>
          </div>
        </div>

        {/* Card 5: Businesses & Users (Admin Only) */}
        {isPrimaryAdmin && (
          <div 
            onClick={() => setScreen('businesses')}
            className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-2xl p-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group col-span-1 md:col-span-2 lg:col-span-4"
          >
            <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-5 flex flex-col justify-between h-full min-h-[140px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              <div className="flex items-start justify-between gap-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>add_business</span>
                </div>
              </div>
              <div className="mt-4">
                <h4 className="font-bold text-app-text-primary text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                  Businesses & Admin Logins
                  <span className="material-symbols-rounded select-none text-xs text-app-text-secondary group-hover:text-primary transition-all group-hover:translate-x-0.5">arrow_forward</span>
                </h4>
                <p className="text-[10px] text-app-text-secondary mt-1.5 leading-relaxed">
                  View and manage all businesses, administrator accounts, database entries, and system-wide login credentials.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* 3. Quick Stats Footer Card */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] mt-2">
        <div className="bg-app-surface border border-app-border/40 rounded-[18px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-widest">Active Staff</span>
            <span className="text-sm font-black text-app-text-primary">{activeStaff.length} Members</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-widest">Salary Basis</span>
            <span className="text-sm font-black text-app-text-primary">{settings.salaryCalculationBasis}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-widest">Holiday Compensation</span>
            <span className="text-sm font-black text-app-text-primary">{settings.weeklyHolidayPaid} Holiday</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-widest">Reporting Date</span>
            <span className="text-sm font-black text-app-text-primary">{currentMonthLabel}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
