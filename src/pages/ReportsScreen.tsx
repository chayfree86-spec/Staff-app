import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SalarySlipModal } from '../components/SalarySlipModal';
import { format, parseISO } from 'date-fns';
import { getProfileGradientStyle } from '../utils/gradient';

export const ReportsScreen: React.FC = () => {
  const {
    setScreen,
    currentDate,
    staffList,
    attendance,
    advanceList,
    deductionList,
    payoutList,
    settings,
  } = useStore();

  // 1. Generate last 12 months dynamically
  const getMonthsList = () => {
    const list = [];
    const curDate = parseISO(currentDate);
    for (let i = 0; i < 12; i++) {
      const d = new Date(curDate.getFullYear(), curDate.getMonth() - i, 1);
      const label = format(d, 'MMMM yyyy');
      const val = format(d, 'yyyy-MM');
      list.push({ value: val, label: label });
    }
    return list;
  };

  const monthsList = getMonthsList();
  
  // States
  const [selectedYearMonth, setSelectedYearMonth] = useState(monthsList[0].value);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Salary Slip Modal States
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [slipStaffId, setSlipStaffId] = useState('');
  const [slipMonthLabel, setSlipMonthLabel] = useState('');

  // Selected Month Label
  const selectedMonthLabel = monthsList.find(m => m.value === selectedYearMonth)?.label || '';

  // Helpers
  const getStaffOutstandingAdvance = (staffId: string) => {
    const staffAdvances = advanceList.filter((a) => a.staffId === staffId);
    const totalGiven = staffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
    const totalReturned = staffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
    return Math.max(0, totalGiven - totalReturned);
  };

  const getSalaryDetails = (staffId: string, targetYearMonth: string, targetMonthLabel: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return {
      earned: 0,
      advanceAdjusted: 0,
      deduction: 0,
      net: 0,
      paid: 0,
      due: 0,
      holdAmount: 0,
      releasedAmount: 0,
      daysPresent: 0,
      daysHalf: 0,
      daysHoliday: 0,
      daysAbsent: 0,
      totalDaysCredited: 0
    };

    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;
    let daysAbsent = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr > currentDate) return;
      if (dateStr.startsWith(targetYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Absent') daysAbsent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const perDayVal = staff.perDaySalary;
    const totalDaysCredited = daysPresent + (daysHalf * 0.5) + daysHoliday;
    
    const earned = staff.calculationBasis === 'Fixed Salary' && staff.salaryType === 'Monthly'
      ? staff.monthlySalary
      : Math.round(totalDaysCredited * perDayVal);

    const advanceAdjusted = Math.abs(
      advanceList
        .filter((a) => a.staffId === staffId && a.amount < 0 && a.date.startsWith(targetYearMonth))
        .reduce((sum, item) => sum + item.amount, 0)
    );

    const deduction = deductionList
      .filter((d) => d.staffId === staffId && d.date.startsWith(targetYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);

    const paid = payoutList
      .filter((p) => p.staffId === staffId && p.month === targetMonthLabel)
      .reduce((sum, item) => sum + item.amount, 0);

    let holdAmount = 0;
    let releasedAmount = 0;

    const joiningMonth = staff.joiningDate.slice(0, 7);
    const holdDays = settings.newStaffSalaryHoldDays || 0;

    if (holdDays > 0) {
      if (joiningMonth === targetYearMonth) {
        if (staff.releasedSalaryHold) {
          holdAmount = 0;
          releasedAmount = Math.round(holdDays * perDayVal);
        } else {
          holdAmount = Math.min(earned, Math.round(holdDays * perDayVal));
        }
      }
      if (staff.status === 'Inactive' && staff.deactivationDate && staff.deactivationDate.slice(0, 7) === targetYearMonth) {
        if (!staff.releasedSalaryHold) {
          releasedAmount = Math.round(holdDays * perDayVal);
        }
      }
    }

    const net = Math.max(0, earned - advanceAdjusted - deduction - holdAmount + releasedAmount);
    const due = Math.max(0, net - paid);

    return {
      earned,
      advanceAdjusted,
      deduction,
      net,
      paid,
      due,
      holdAmount,
      releasedAmount,
      daysPresent,
      daysHalf,
      daysHoliday,
      daysAbsent,
      totalDaysCredited
    };
  };

  // Filter staff based on search query
  const filteredStaff = staffList.filter((staff) =>
    staff.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Compute overall summary statistics for the selected month
  const totalStats = filteredStaff.reduce(
    (acc, s) => {
      const details = getSalaryDetails(s.id, selectedYearMonth, selectedMonthLabel);
      acc.totalEarned += details.net;
      acc.totalPaid += details.paid;
      acc.totalDeductions += details.deduction + details.advanceAdjusted;
      acc.totalOutstandingAdvance += getStaffOutstandingAdvance(s.id);
      return acc;
    },
    { totalEarned: 0, totalPaid: 0, totalDeductions: 0, totalOutstandingAdvance: 0 }
  );



  const getStaffRoleText = (staff: { salaryType: string; calculationBasis: string }) =>
    `${staff.salaryType} • ${staff.calculationBasis}`;

  const handleOpenSlip = (staffId: string) => {
    setSlipStaffId(staffId);
    setSlipMonthLabel(selectedMonthLabel);
    setIsSlipOpen(true);
  };
  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200 text-left w-full">
      {/* Header bar */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => setScreen('more')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shrink-0 mt-0.5"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <div className="flex flex-col gap-1 select-none text-left">
          <h2 className="text-xl font-extrabold text-app-text-primary tracking-tight">Reports Generator</h2>
          <p className="text-xs text-app-text-secondary font-medium">Generate payroll reports, PDF summaries, and share salary details.</p>
        </div>
      </div>
      {/* Header controls & Summaries - Two columns on desktop/tablet, stacked on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
        {/* Left Section: Controls (Month Selector & Search) */}
        <div className="lg:col-span-1 bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4 h-full justify-center">
            {/* Month Selector */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[9px] font-black text-app-text-secondary uppercase tracking-wider">Select Month</label>
              <CustomSelect
                value={selectedYearMonth}
                onChange={setSelectedYearMonth}
                options={monthsList}
                className="w-full"
              />
            </div>

            {/* Search Input */}
            <div className="flex flex-col gap-1.5 w-full">
              <label className="text-[9px] font-black text-app-text-secondary uppercase tracking-wider">Search Employee</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-app-text-secondary font-bold select-none material-symbols-rounded">search</span>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs text-app-text-primary font-semibold focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Financial Summary Dashboard */}
        <div className="lg:col-span-2 bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
          <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4 h-full justify-center">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {/* Payouts Card */}
              <div className="bg-blue-500/10 dark:bg-blue-500/15 rounded-2xl p-4 border border-blue-500/20 dark:border-blue-500/30 flex flex-col gap-1.5 shadow-sm">
                <span className="material-symbols-rounded text-blue-600 dark:text-blue-400 select-none text-lg">payments</span>
                <span className="text-[8px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-wider">Total Payouts</span>
                <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalPaid.toLocaleString('en-IN')}</span>
              </div>

              {/* Net Due Card */}
              <div className="bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl p-4 border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col gap-1.5 shadow-sm">
                <span className="material-symbols-rounded text-emerald-600 dark:text-emerald-400 select-none text-lg">check_circle</span>
                <span className="text-[8px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">Total Earned</span>
                <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalEarned.toLocaleString('en-IN')}</span>
              </div>

              {/* Deductions Card */}
              <div className="bg-rose-500/10 dark:bg-rose-500/15 rounded-2xl p-4 border border-rose-500/20 dark:border-rose-500/30 flex flex-col gap-1.5 shadow-sm">
                <span className="material-symbols-rounded text-rose-600 dark:text-rose-400 select-none text-lg">do_not_disturb_on</span>
                <span className="text-[8px] uppercase font-black text-rose-600 dark:text-rose-400 tracking-wider">Total Deductions</span>
                <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalDeductions.toLocaleString('en-IN')}</span>
              </div>

              {/* Outstanding Advance Card */}
              <div className="bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl p-4 border border-amber-500/20 dark:border-amber-500/30 flex flex-col gap-1.5 shadow-sm">
                <span className="material-symbols-rounded text-amber-600 dark:text-amber-400 select-none text-lg">account_balance_wallet</span>
                <span className="text-[8px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">Outstanding Advance</span>
                <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalOutstandingAdvance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reports detailed list section title */}
      <div className="px-1 mt-2 select-none">
        <h4 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.2em] leading-none">
          Detailed Payroll Report
        </h4>
      </div>

      {/* Mobile Card List */}
      <div className="flex flex-col gap-3.5 sm:hidden">
        {filteredStaff.length > 0 ? (
          filteredStaff.map((staff) => {
            const details = getSalaryDetails(staff.id, selectedYearMonth, selectedMonthLabel);
            const outstandingAdv = getStaffOutstandingAdvance(staff.id);
            const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div 
                key={staff.id}
                className="bg-black/[0.012] dark:bg-white/[0.012] border border-app-border rounded-2xl p-1 shadow-sm"
              >
                <div className="bg-app-surface border border-app-border/40 rounded-[calc(1rem-0.125rem)] p-4 flex flex-col gap-3.5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                  <div className="flex items-center gap-3">
                    <div
                      style={getProfileGradientStyle(staff.id, staffList)}
                      className="w-9 h-9 rounded-xl text-white font-black text-xs flex items-center justify-center shadow-sm select-none"
                    >
                      {initials}
                    </div>
                    <div>
                      <div className="font-bold text-app-text-primary text-xs">{staff.name}</div>
                      <div className="text-[9px] text-app-text-secondary mt-0.5">{getStaffRoleText(staff)}</div>
                    </div>
                  </div>

                  {/* Attendance pills */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider select-none bg-app-bg/50 p-2 rounded-xl border border-app-border/40">
                    <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">
                      {details.daysPresent}P
                    </span>
                    {details.daysHalf > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-md">
                        {details.daysHalf}HD
                      </span>
                    )}
                    {details.daysHoliday > 0 && (
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md">
                        {details.daysHoliday}H
                      </span>
                    )}
                    {details.daysAbsent > 0 && (
                      <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-md">
                        {details.daysAbsent}A
                      </span>
                    )}
                    <span className="text-app-text-secondary font-bold text-[8px] ml-auto">
                      ({details.totalDaysCredited} Paid Days)
                    </span>
                  </div>

                  {/* Financial metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center py-1">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none">Deduction</span>
                      <span className="text-xs font-black text-rose-600 mt-1">
                        ₹{details.deduction.toLocaleString('en-IN')}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none">Advance (OS)</span>
                      <span className="text-xs font-black text-rose-600 mt-1">
                        ₹{details.advanceAdjusted.toLocaleString('en-IN')}
                      </span>
                      {outstandingAdv > 0 && (
                        <span className="text-[6.5px] text-amber-600 dark:text-amber-400 font-black mt-0.5 uppercase tracking-wide">
                          (Bal: ₹{outstandingAdv})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <span className="text-[7.5px] font-black text-app-text-secondary uppercase tracking-[0.12em] leading-none">Net Salary</span>
                      <span className="text-xs font-black text-app-text-primary mt-1">
                        ₹{details.net.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Status row */}
                  <div className="flex justify-between items-center pt-3 border-t border-app-border/40 mt-1">
                    <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                      details.paid >= details.net
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20'
                        : details.paid > 0
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        : 'bg-red-500/10 text-red-500 border border-red-500/20'
                    }`}>
                      {details.paid >= details.net ? 'Fully Paid' : details.paid > 0 ? 'Partially Paid' : 'Unpaid'}
                    </span>
                    
                    <button
                      onClick={() => handleOpenSlip(staff.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:opacity-95 font-bold rounded-xl text-[10px] uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer shadow-sm shadow-indigo-500/15"
                    >
                      <span className="material-symbols-rounded select-none text-[12px] font-bold">receipt_long</span>
                      <span>View Slip</span>
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-app-surface border border-app-border rounded-2xl p-8 text-center text-xs text-app-text-secondary font-semibold">
            No employees found matching search query.
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-black/[0.012] dark:bg-white/[0.012] border border-app-border rounded-[22px] p-1.5 shadow-sm overflow-hidden">
        <div className="bg-app-surface border border-app-border/40 rounded-[18px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-app-bg border-b border-app-border/60 text-app-text-secondary font-black uppercase text-[9px] tracking-wider select-none">
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Attendance Status</th>
                  <th className="px-5 py-3.5 text-center">Deduction</th>
                  <th className="px-5 py-3.5 text-center">Advance (O/S)</th>
                  <th className="px-5 py-3.5 text-center">Net Salary</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app-border/40 font-semibold text-app-text-primary">
                {filteredStaff.length > 0 ? (
                  filteredStaff.map((staff) => {
                    const details = getSalaryDetails(staff.id, selectedYearMonth, selectedMonthLabel);
                    const outstandingAdv = getStaffOutstandingAdvance(staff.id);
                    const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

                    return (
                      <tr key={staff.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors">
                        {/* Staff profile */}
                        <td className="px-5 py-4 flex items-center gap-3">
                          <div
                            style={getProfileGradientStyle(staff.id, staffList)}
                            className="w-8 h-8 rounded-full text-white font-black text-[10px] flex items-center justify-center shadow-sm select-none"
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-app-text-primary text-xs">{staff.name}</div>
                            <div className="text-[9px] text-app-text-secondary mt-0.5">{getStaffRoleText(staff)}</div>
                          </div>
                        </td>

                        {/* Attendance details */}
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1 text-[8.5px] font-black uppercase tracking-wider text-center select-none">
                            <span className="px-1.5 py-0.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/10">
                              {details.daysPresent}P
                            </span>
                            {details.daysHalf > 0 && (
                              <span className="px-1.5 py-0.5 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-md border border-amber-500/10">
                                {details.daysHalf}HD
                              </span>
                            )}
                            {details.daysHoliday > 0 && (
                              <span className="px-1.5 py-0.5 bg-blue-500/5 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/10">
                                {details.daysHoliday}H
                              </span>
                            )}
                            {details.daysAbsent > 0 && (
                              <span className="px-1.5 py-0.5 bg-rose-500/5 text-rose-600 dark:text-rose-400 rounded-md border border-rose-500/10">
                                {details.daysAbsent}A
                              </span>
                            )}
                            <span className="text-app-text-secondary font-bold text-[8px] pl-1 select-none">
                              ({details.totalDaysCredited} Paid Days)
                            </span>
                          </div>
                        </td>

                        {/* Deduction */}
                        <td className="px-5 py-4 text-center font-bold text-rose-600">
                          ₹{details.deduction.toLocaleString('en-IN')}
                        </td>

                        {/* Advance adjusted and outstanding */}
                        <td className="px-5 py-4 text-center">
                          <div className="font-bold text-rose-600">
                            ₹{details.advanceAdjusted.toLocaleString('en-IN')}
                          </div>
                          {outstandingAdv > 0 && (
                            <div className="text-[8.5px] text-amber-600 dark:text-amber-400 font-extrabold mt-0.5 uppercase tracking-wider">
                              (Bal: ₹{outstandingAdv.toLocaleString('en-IN')})
                            </div>
                          )}
                        </td>

                        {/* Net Salary status */}
                        <td className="px-5 py-4 text-center">
                          <div className="font-bold text-app-text-primary">
                            ₹{details.net.toLocaleString('en-IN')}
                          </div>
                          <span className={`inline-block text-[8px] font-black uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded-md ${
                            details.paid >= details.net
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20'
                              : details.paid > 0
                              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {details.paid >= details.net ? 'Fully Paid' : details.paid > 0 ? 'Partially Paid' : 'Unpaid'}
                          </span>
                        </td>

                        {/* Action View Slip */}
                        <td className="px-5 py-4 text-center">
                          <button
                            onClick={() => handleOpenSlip(staff.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/15 border border-primary/20 text-primary hover:text-primary-dark font-black rounded-xl text-[10px] uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer"
                          >
                            <span className="material-symbols-rounded select-none text-[12px] font-bold">receipt_long</span>
                            <span>View Slip</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-app-text-secondary select-none">
                      No employees found matching search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Salary Slip Modal Mount */}
      {isSlipOpen && (
        <SalarySlipModal
          isOpen={isSlipOpen}
          onClose={() => setIsSlipOpen(false)}
          staffId={slipStaffId}
          monthLabel={slipMonthLabel}
        />
      )}
    </div>
  );
};
