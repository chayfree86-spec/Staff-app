import React from 'react';
import { useStore } from '../store/useStore';
import { format, parseISO } from 'date-fns';

export const MoreScreen: React.FC = () => {
  const {
    setScreen,
    businessInfo,
    currentDate,
    settings,
    staffList,
    advanceList,
    deductionList,
  } = useStore();

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

  const staffWithOutstandingAdvance = staffList.filter(
    s => getOutstandingAdvance(s.id) > 0
  ).length;

  const currentYearMonth = currentDate.slice(0, 7); // YYYY-MM
  const totalDeductionsThisMonth = deductionList
    .filter(d => d.date.startsWith(currentYearMonth))
    .reduce((sum, item) => sum + item.amount, 0);

  const staffWithDeductions = new Set(
    deductionList
      .filter(d => d.date.startsWith(currentYearMonth))
      .map(d => d.staffId)
  ).size;

  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const businessInitials = businessInfo.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'FB';

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-200">
      
      {/* 1. Header Card (Double-Bezel Architecture) */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
        <div className="bg-app-surface border border-app-border/40 rounded-[18px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-black bg-primary/10 text-primary w-max select-none">
              Application Control Panel
            </div>
            <h3 className="text-xl font-black text-app-text-primary tracking-tight mt-2">More Features & Utilities</h3>
            <p className="text-xs text-app-text-secondary mt-1 max-w-xl">
              Access reports, advance ledgers, deductions log, business configuration and application settings.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">
              Live Database Active
            </span>
          </div>
        </div>
      </div>

      {/* 1.5 Business Profile Banner */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
        <div className="bg-app-surface border border-app-border/40 rounded-[18px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-accent/30 to-emerald-500 text-app-text-primary font-black flex items-center justify-center text-sm shadow-md border-0 shrink-0 select-none">
              {businessInitials}
            </div>
            <div className="overflow-hidden">
              <div className="rounded-full px-2.5 py-0.5 text-[8px] uppercase tracking-[0.15em] font-black bg-accent/10 text-accent w-max select-none">
                Business Details
              </div>
              <h4 className="font-black text-app-text-primary text-sm tracking-tight mt-1 truncate">
                {businessInfo.name}
              </h4>
              <p className="text-xs text-app-text-secondary truncate mt-0.5">
                {businessInfo.address || 'No address added'} • Mobile: {businessInfo.mobile || 'Not set'}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setScreen('business')}
            className="px-4 py-2 border border-app-border hover:border-primary/30 text-app-text-primary hover:text-primary bg-app-bg hover:bg-primary/[0.02] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shadow-sm"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>store</span>
            <span>Manage Profile</span>
          </button>
        </div>
      </div>

      {/* 2. Categorized Settings List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Column 1: Financial Ledgers & Logs */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.15em] select-none px-1">
            Financial Ledgers & Logs
          </h4>
          
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[18px] divide-y divide-app-border/40 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              
              {/* Row 1: Advances Ledger */}
              <div 
                onClick={() => setScreen('advance')}
                className="p-5 flex items-center justify-between gap-4 hover:bg-primary/[0.01] transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>payments</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-sm group-hover:text-primary transition-colors">
                      Staff Advances Ledger
                    </h4>
                    <p className="text-[11px] text-app-text-secondary mt-1 max-w-sm leading-relaxed">
                      Track and manage advance payments given to staff, outstanding balances, and detailed ledger history.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none">Outstanding</span>
                    <span className="text-base sm:text-lg font-black text-amber-500 mt-1 leading-none">
                      ₹{totalOutstandingAdvance.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-rounded select-none text-sm font-bold">chevron_right</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Deductions Log */}
              <div 
                onClick={() => setScreen('deduction')}
                className="p-5 flex items-center justify-between gap-4 hover:bg-primary/[0.01] transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>do_not_disturb_on</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-sm group-hover:text-primary transition-colors">
                      Staff Deductions Log
                    </h4>
                    <p className="text-[11px] text-app-text-secondary mt-1 max-w-sm leading-relaxed">
                      Record, track and manage monthly salary deductions, breakage costs, penalties, or fines.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none">This Month</span>
                    <span className="text-base sm:text-lg font-black text-rose-500 mt-1 leading-none">
                      ₹{totalDeductionsThisMonth.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/25 dark:text-rose-400 flex items-center justify-center group-hover:bg-rose-500 group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-rounded select-none text-sm font-bold">chevron_right</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Column 2: Reports & System Settings */}
        <div className="flex flex-col gap-3">
          <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.15em] select-none px-1">
            Reports & Preferences
          </h4>
          
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[24px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[18px] divide-y divide-app-border/40 overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]">
              
              {/* Row 1: Reports Generator */}
              <div 
                onClick={() => setScreen('reports')}
                className="p-5 flex items-center justify-between gap-4 hover:bg-primary/[0.01] transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>description</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-sm group-hover:text-primary transition-colors">
                      Reports & Payroll Generator
                    </h4>
                    <p className="text-[11px] text-app-text-secondary mt-1 max-w-sm leading-relaxed">
                      Compile complete monthly payroll reports, PDF summaries, and share salary details via WhatsApp.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-wider">Payroll Month</span>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-450 mt-0.5">
                      {currentMonthLabel.slice(0, 3)} {currentDate.slice(0, 4)}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-600 dark:bg-blue-500/25 dark:text-blue-400 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-rounded select-none text-sm font-bold">chevron_right</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Application Settings */}
              <div 
                onClick={() => setScreen('settings')}
                className="p-5 flex items-center justify-between gap-4 hover:bg-primary/[0.01] transition-colors cursor-pointer group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>settings</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-sm group-hover:text-primary transition-colors">
                      Application Preferences
                    </h4>
                    <p className="text-[11px] text-app-text-secondary mt-1 max-w-sm leading-relaxed">
                      Configure weekly holidays, salary calculation basis, paid leave compensation, and system preferences.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-wider">Holiday</span>
                    <span className="text-xs font-black text-violet-600 dark:text-violet-400 mt-0.5">
                      {settings.weeklyHoliday[0] || 'None'}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-violet-500/10 text-violet-600 dark:bg-violet-500/25 dark:text-violet-400 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-all duration-300">
                    <span className="material-symbols-rounded select-none text-sm font-bold">chevron_right</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

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
