import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomSelect } from '../components/ui/CustomSelect';
import { SalarySlipModal } from '../components/SalarySlipModal';
import { format, parseISO } from 'date-fns';

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

  const getProfileGradient = (name: string) => {
    const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + acc, 0);
    const gradients = [
      'from-blue-500 to-indigo-600',
      'from-emerald-400 to-teal-600',
      'from-violet-500 to-purple-600',
      'from-amber-400 to-orange-500',
      'from-rose-500 to-pink-600',
      'from-cyan-400 to-blue-600'
    ];
    return gradients[hash % gradients.length];
  };

  const getStaffRoleText = (name: string) => {
    if (name.includes('Arjun')) return 'Manager';
    if (name.includes('Sunita')) return 'Server';
    if (name.includes('Ramesh') || name.includes('Kumar')) return 'Head cook';
    if (name.includes('Imran')) return 'Barista';
    if (name.includes('Priya')) return 'Cashier';
    if (name.includes('Vijay')) return 'Cleaner';
    if (name.includes('Anjali')) return 'Server';
    return 'Staff Member';
  };

  const handleOpenSlip = (staffId: string) => {
    setSlipStaffId(staffId);
    setSlipMonthLabel(selectedMonthLabel);
    setIsSlipOpen(true);
  };

  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200 text-left">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('more')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shrink-0"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <h2 className="text-sm font-black text-app-text-primary tracking-tight select-none">Reports Generator</h2>
      </div>

      {/* Control Panel: Month Selector & Search */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-4">
        {/* Month Selector */}
        <div className="flex flex-col gap-1.5 min-w-[200px]">
          <label className="text-[9px] font-black text-app-text-secondary uppercase tracking-wider">Select Month</label>
          <CustomSelect
            value={selectedYearMonth}
            onChange={setSelectedYearMonth}
            options={monthsList}
            className="w-full"
          />
        </div>

        {/* Search Input */}
        <div className="flex flex-col gap-1.5 flex-grow max-w-md">
          <label className="text-[9px] font-black text-app-text-secondary uppercase tracking-wider">Search Employee</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-app-text-secondary font-bold select-none material-symbols-rounded">search</span>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-app-surface border border-app-border rounded-xl text-xs text-app-text-primary font-semibold focus:outline-none focus:border-primary transition-all"
            />
          </div>
        </div>
      </div>

      {/* Financial Summary Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {/* Payouts Card */}
        <div className="bg-blue-500/5 dark:bg-blue-500/10 rounded-2xl p-4 border border-blue-500/10 dark:border-blue-500/20 flex flex-col gap-1">
          <span className="material-symbols-rounded text-blue-500 select-none text-lg">payments</span>
          <span className="text-[8px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-wider">Total Payouts</span>
          <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalPaid.toLocaleString('en-IN')}</span>
        </div>

        {/* Net Due Card */}
        <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/10 dark:border-emerald-500/20 flex flex-col gap-1">
          <span className="material-symbols-rounded text-emerald-500 select-none text-lg">check_circle</span>
          <span className="text-[8px] uppercase font-black text-emerald-600 dark:text-emerald-400 tracking-wider">Total Earned</span>
          <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalEarned.toLocaleString('en-IN')}</span>
        </div>

        {/* Deductions Card */}
        <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl p-4 border border-rose-500/10 dark:border-rose-500/20 flex flex-col gap-1">
          <span className="material-symbols-rounded text-rose-500 select-none text-lg">do_not_disturb_on</span>
          <span className="text-[8px] uppercase font-black text-rose-600 dark:text-rose-400 tracking-wider">Total Deductions</span>
          <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalDeductions.toLocaleString('en-IN')}</span>
        </div>

        {/* Outstanding Advance Card */}
        <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-2xl p-4 border border-amber-500/10 dark:border-amber-500/20 flex flex-col gap-1">
          <span className="material-symbols-rounded text-amber-500 select-none text-lg">account_balance_wallet</span>
          <span className="text-[8px] uppercase font-black text-amber-600 dark:text-amber-400 tracking-wider">Outstanding Advance</span>
          <span className="text-base font-black text-app-text-primary mt-1">₹{totalStats.totalOutstandingAdvance.toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* Staff Slips Table Section */}
      <div className="bg-black/[0.012] dark:bg-white/[0.012] border border-app-border rounded-[22px] p-1.5 shadow-sm overflow-hidden">
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
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-[10px] flex items-center justify-center shadow-sm select-none`}>
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-app-text-primary text-xs">{staff.name}</div>
                            <div className="text-[9px] text-app-text-secondary mt-0.5">{getStaffRoleText(staff.name)}</div>
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
