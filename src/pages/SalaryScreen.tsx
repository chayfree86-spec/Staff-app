import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { format, parseISO } from 'date-fns';
import { useAlertConfirm } from '../components/ui/AlertConfirmProvider';
import { SalarySlipModal } from '../components/SalarySlipModal';

export const SalaryScreen: React.FC = () => {
  const { confirm } = useAlertConfirm();
  const {
    staffList,
    attendance,
    advanceList,
    deductionList,
    payoutList,
    paySalary,
    addAdvance,
    updateStaff,
    setScreen,
    setActiveStaffProfileId,
    currentDate,
    settings,
  } = useStore();

  const [selectedCycle, setSelectedCycle] = useState('Current Month');
  
  // Payout Modal states
  const [payoutStaffId, setPayoutStaffId] = useState<string | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [payoutMode, setPayoutMode] = useState('Cash');
  const [payoutRemarks, setPayoutRemarks] = useState('');
  const [payoutMonth, setPayoutMonth] = useState('');
  const [advanceDeductType, setAdvanceDeductType] = useState<'none' | 'full' | 'custom'>('none');
  const [customAdvanceDeductAmount, setCustomAdvanceDeductAmount] = useState('');
  const [payoutError, setPayoutError] = useState('');

  // Salary Slip Modal states
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [slipStaffId, setSlipStaffId] = useState('');
  const [slipMonthLabel, setSlipMonthLabel] = useState('');

  const handleOpenSlip = (staffId: string, monthLabel: string) => {
    setSlipStaffId(staffId);
    setSlipMonthLabel(monthLabel);
    setIsSlipOpen(true);
  };

  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const getStaffOutstandingAdvance = (staffId: string) => {
    const staffAdvances = advanceList.filter((a) => a.staffId === staffId);
    const totalGiven = staffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
    const totalReturned = staffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
    return Math.max(0, totalGiven - totalReturned);
  };

  const getStaffOutstandingHold = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff || staff.releasedSalaryHold) return 0;
    
    const holdDays = settings.newStaffSalaryHoldDays || 0;
    if (holdDays <= 0) return 0;

    const joiningYearMonth = staff.joiningDate.slice(0, 7);
    
    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr > currentDate) return;
      if (dateStr.startsWith(joiningYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const perDayVal = staff.perDaySalary;
    const totalDaysCredited = daysPresent + (daysHalf * 0.5) + daysHoliday;
    
    const earned = staff.calculationBasis === 'Fixed Salary' && staff.salaryType === 'Monthly'
      ? staff.monthlySalary
      : Math.round(totalDaysCredited * perDayVal);

    return Math.min(earned, Math.round(holdDays * perDayVal));
  };

  const getYearMonthFromLabel = (label: string) => {
    try {
      const curDateObj = parseISO(currentDate);
      const currentMonthLabelStr = format(curDateObj, 'MMMM yyyy');
      if (label === currentMonthLabelStr) {
        return currentDate.slice(0, 7);
      }
      const prevDateObj = new Date(curDateObj.getFullYear(), curDateObj.getMonth() - 1, 1);
      return format(prevDateObj, 'yyyy-MM');
    } catch (e) {
      return currentDate.slice(0, 7);
    }
  };

  const getPayoutMonths = (staffId: string) => {
    const curDateObj = parseISO(currentDate);
    const currentMonthLabelStr = format(curDateObj, 'MMMM yyyy');
    const prevDateObj = new Date(curDateObj.getFullYear(), curDateObj.getMonth() - 1, 1);
    const prevMonthLabelStr = format(prevDateObj, 'MMMM yyyy');

    const defaultMonth = currentMonthLabelStr;

    return {
      options: [
        { value: currentMonthLabelStr, label: currentMonthLabelStr },
        { value: prevMonthLabelStr, label: prevMonthLabelStr },
      ],
      defaultMonth
    };
  };

  const updatePayoutAmountField = (
    staffId: string, 
    monthLabel: string, 
    deductType: 'none' | 'full' | 'custom', 
    customDeduct: string
  ) => {
    const selectedStaff = staffList.find(s => s.id === staffId);
    if (!selectedStaff) return;
    
    const targetYM = getYearMonthFromLabel(monthLabel);
    const details = getSalaryDetails(selectedStaff.id, targetYM, monthLabel);
    const outstandingAdvance = getStaffOutstandingAdvance(staffId);
    
    let deductVal = 0;
    if (deductType === 'full') {
      deductVal = Math.min(outstandingAdvance, details.due);
    } else if (deductType === 'custom') {
      deductVal = Math.min(Number(customDeduct) || 0, outstandingAdvance);
    }
    
    const finalDue = Math.max(0, details.due - deductVal);
    setPayoutAmount(finalDue.toString());
  };

  const handleMonthChange = (val: string) => {
    setPayoutMonth(val);
    setAdvanceDeductType('none');
    setCustomAdvanceDeductAmount('');
    if (payoutStaffId) {
      updatePayoutAmountField(payoutStaffId, val, 'none', '');
    }
  };

  const handleDeductTypeChange = (type: 'none' | 'full' | 'custom') => {
    setAdvanceDeductType(type);
    if (type !== 'custom') {
      setCustomAdvanceDeductAmount('');
    }
    if (payoutStaffId) {
      updatePayoutAmountField(payoutStaffId, payoutMonth, type, '');
    }
  };

  const handleCustomDeductChange = (amountStr: string) => {
    setCustomAdvanceDeductAmount(amountStr);
    if (payoutStaffId) {
      updatePayoutAmountField(payoutStaffId, payoutMonth, 'custom', amountStr);
    }
  };

  // Determine current selected year-month target cycle
  const selectedYearMonth = selectedCycle === 'Current Month'
    ? currentDate.slice(0, 7)
    : format(new Date(parseISO(currentDate).getFullYear(), parseISO(currentDate).getMonth() - 1, 1), 'yyyy-MM');

  const selectedMonthLabel = selectedCycle === 'Current Month'
    ? currentMonthLabel
    : format(new Date(parseISO(currentDate).getFullYear(), parseISO(currentDate).getMonth() - 1, 1), 'MMMM yyyy');

  // Filter staff to include active staff and inactive staff deactivated in the selected cycle month
  const visibleStaff = staffList.filter(s => {
    if (s.status === 'Active') return true;
    
    // Include inactive staff if they were deactivated in the selected month
    if (s.status === 'Inactive' && s.deactivationDate) {
      return s.deactivationDate.startsWith(selectedYearMonth);
    }
    return false;
  });

  // Calculates financial details for a staff member for a specific month cycle
  const getSalaryDetails = (staffId: string, targetYearMonth: string, targetMonthLabel: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return { earned: 0, advance: 0, deduction: 0, net: 0, paid: 0, due: 0, holdAmount: 0, releasedAmount: 0 };

    // 1. Earned Salary (Days * perDay)
    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr > currentDate) return;
      if (dateStr.startsWith(targetYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const perDayVal = staff.perDaySalary;
    const totalDaysCredited = daysPresent + (daysHalf * 0.5) + daysHoliday;
    
    // Earned salary based on calculation basis
    const earned = staff.calculationBasis === 'Fixed Salary' && staff.salaryType === 'Monthly'
      ? staff.monthlySalary
      : Math.round(totalDaysCredited * perDayVal);

    // 2. Outstanding Advance
    const totalAdv = advanceList
      .filter(a => a.staffId === staffId && a.date.startsWith(targetYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);
      
    // 3. Deductions
    const deduction = deductionList
      .filter(d => d.staffId === staffId && d.date.startsWith(targetYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);

    // 4. Payouts
    const paid = payoutList
      .filter(p => p.staffId === staffId && p.month === targetMonthLabel)
      .reduce((sum, item) => sum + item.amount, 0);

    // 5. Hold/Release calculations
    let holdAmount = 0;
    let releasedAmount = 0;

    const joiningMonth = staff.joiningDate.slice(0, 7);
    const holdDays = settings.newStaffSalaryHoldDays || 0;

    if (holdDays > 0) {
      // If it is the staff member's 1st month (joining month), we hold the configured salary amount
      if (joiningMonth === targetYearMonth) {
        if (staff.releasedSalaryHold) {
          holdAmount = 0;
          releasedAmount = Math.round(holdDays * perDayVal);
        } else {
          holdAmount = Math.min(earned, Math.round(holdDays * perDayVal));
        }
      }

      // If the staff member is inactive and their deactivation month matches targetYearMonth, we release the hold
      if (staff.status === 'Inactive' && staff.deactivationDate && staff.deactivationDate.slice(0, 7) === targetYearMonth) {
        if (!staff.releasedSalaryHold) {
          releasedAmount = Math.round(holdDays * perDayVal);
        }
      }
    }

    const net = Math.max(0, earned - totalAdv - deduction - holdAmount + releasedAmount);
    const due = Math.max(0, net - paid);

    return { earned, advance: totalAdv, deduction, net, paid, due, holdAmount, releasedAmount };
  };

  const summaries = visibleStaff.reduce(
    (acc, staff) => {
      const details = getSalaryDetails(staff.id, selectedYearMonth, selectedMonthLabel);
      acc.totalEarned += details.earned;
      acc.totalPaid += details.paid;
      acc.totalDue += details.due;
      return acc;
    },
    { totalEarned: 0, totalPaid: 0, totalDue: 0 }
  );

  const handleOpenPayModal = (staffId: string, dueAmount: number) => {
    setPayoutStaffId(staffId);
    
    const { defaultMonth } = getPayoutMonths(staffId);
    setPayoutMonth(defaultMonth);
    setPayoutDate(currentDate);
    setPayoutMode('Cash');
    setPayoutRemarks('');
    setAdvanceDeductType('none');
    setCustomAdvanceDeductAmount('');
    setPayoutError('');

    const targetYM = getYearMonthFromLabel(defaultMonth);
    const selectedStaff = staffList.find(s => s.id === staffId);
    if (selectedStaff) {
      const details = getSalaryDetails(selectedStaff.id, targetYM, defaultMonth);
      setPayoutAmount(details.due.toString());
    } else {
      setPayoutAmount(dueAmount.toString());
    }
  };

  const getProfileGradient = (name: string) => {
    const gradients = [
      'from-indigo-600 to-purple-600',
      'from-emerald-600 to-teal-600',
      'from-rose-600 to-orange-500',
      'from-blue-600 to-indigo-600',
      'from-amber-500 to-rose-600',
      'from-violet-600 to-fuchsia-600',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return gradients[sum % gradients.length];
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutStaffId || !payoutAmount.trim()) {
      setPayoutError('Please enter amount.');
      return;
    }
    const amount = Number(payoutAmount);
    if (isNaN(amount) || amount < 0) {
      setPayoutError('Please enter a valid amount.');
      return;
    }

    const outstandingAdvance = getStaffOutstandingAdvance(payoutStaffId);
    let deductVal = 0;
    if (advanceDeductType === 'full') {
      const selectedStaff = staffList.find(s => s.id === payoutStaffId);
      if (selectedStaff) {
        const targetYM = getYearMonthFromLabel(payoutMonth);
        const details = getSalaryDetails(selectedStaff.id, targetYM, payoutMonth);
        deductVal = Math.min(outstandingAdvance, details.due);
      }
    } else if (advanceDeductType === 'custom') {
      deductVal = Math.min(Number(customAdvanceDeductAmount) || 0, outstandingAdvance);
    }

    if (deductVal > 0) {
      addAdvance(payoutStaffId, -deductVal, currentDate, `Deducted from Salary Payout (${payoutMonth})`);
    }

    setPayoutError('');
    paySalary(payoutStaffId, amount, payoutMonth, payoutDate, payoutMode, payoutRemarks);
    setPayoutStaffId(null);
    setPayoutAmount('');
    setPayoutDate('');
    setPayoutMode('Cash');
    setPayoutRemarks('');
    setPayoutMonth('');
    setAdvanceDeductType('none');
    setCustomAdvanceDeductAmount('');
  };

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-200">
      
      {/* Header controls & Summaries - Double Bezel Architecture */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
        <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
          <CustomSelect
            value={selectedCycle}
            onChange={setSelectedCycle}
            options={[
              { value: 'Current Month', label: currentMonthLabel },
              { value: 'Last Month', label: 'Last Month' },
            ]}
            className="w-full"
          />

          {/* Financial Summary Dashboard */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-app-border/60">
            {/* Earned card */}
            <div className="bg-blue-500/10 dark:bg-blue-500/15 rounded-2xl p-4 text-center border border-blue-500/20 dark:border-blue-500/30 flex flex-col items-center justify-center gap-1.5 shadow-sm">
              <span className="material-symbols-rounded select-none text-blue-700 dark:text-blue-400" style={{ fontSize: '20px' }}>account_balance_wallet</span>
              <div className="text-lg font-black leading-tight mt-0.5" style={{ color: 'var(--summary-earned)' }}>
                ₹{summaries.totalEarned.toLocaleString('en-IN')}
              </div>
              <div className="text-[8px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-widest">Earned</div>
            </div>
            
            {/* Paid card */}
            <div className="bg-emerald-500/10 dark:bg-emerald-500/15 rounded-2xl p-4 text-center border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col items-center justify-center gap-1.5 shadow-sm">
              <span className="material-symbols-rounded select-none text-emerald-700 dark:text-emerald-400" style={{ fontSize: '20px' }}>check_circle</span>
              <div className="text-lg font-black leading-tight mt-0.5" style={{ color: 'var(--summary-paid)' }}>
                ₹{summaries.totalPaid.toLocaleString('en-IN')}
              </div>
              <div className="text-[8px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-widest">Paid</div>
            </div>
            
            {/* Due card */}
            <div className="bg-amber-500/10 dark:bg-amber-500/15 rounded-2xl p-4 text-center border border-amber-500/20 dark:border-amber-500/30 flex flex-col items-center justify-center gap-1.5 shadow-sm">
              <span className="material-symbols-rounded select-none text-amber-700 dark:text-amber-400" style={{ fontSize: '20px' }}>pending</span>
              <div className="text-lg font-black leading-tight mt-0.5" style={{ color: 'var(--summary-due)' }}>
                ₹{summaries.totalDue.toLocaleString('en-IN')}
              </div>
              <div className="text-[8px] uppercase font-bold text-amber-600 dark:text-amber-400 tracking-widest">Due</div>
            </div>
          </div>
        </div>
      </div>

      {/* Staff Salary Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleStaff.map((staff) => {
          const details = getSalaryDetails(staff.id, selectedYearMonth, selectedMonthLabel);
          const outstandingHold = getStaffOutstandingHold(staff.id);
          const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
          return (
            <div
              key={staff.id}
              onClick={() => {
                setActiveStaffProfileId(staff.id);
                setScreen('staff-profile');
              }}
              className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1 shadow-sm"
            >
              <div className="bg-app-surface border border-app-border/40 rounded-[18px] p-5 flex flex-col gap-4 hover:border-primary/20 dark:hover:border-primary/40 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 cursor-pointer group">
                
                {/* Staff details row */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 select-none border-0`}>
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-app-text-primary text-sm leading-tight group-hover:text-primary transition-colors">
                          {staff.name}
                        </h4>
                        {staff.status === 'Inactive' && (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-extrabold text-[8px] uppercase tracking-wider">
                            Left
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-app-text-secondary font-semibold mt-1">
                        Rate: ₹{staff.monthlySalary.toLocaleString('en-IN')}/{staff.salaryType === 'Monthly' ? 'mo' : 'day'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Due badge */}
                  {details.due > 0 ? (
                    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase select-none">
                      Due: ₹{details.due.toLocaleString('en-IN')}
                    </div>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase select-none">
                      Fully Paid
                    </div>
                  )}
                </div>

                {/* Financial metrics breakdown */}
                <div className="grid grid-cols-4 gap-1 bg-app-bg/50 border border-app-border/40 p-2.5 rounded-xl text-center text-xs divide-x divide-app-border/30">
                  <div className="flex flex-col items-center justify-center">
                    <span className="material-symbols-rounded select-none text-[15px] text-app-text-secondary/60">account_balance_wallet</span>
                    <div className="text-[7.5px] font-bold text-app-text-secondary uppercase tracking-wider mt-0.5">Earned</div>
                    <div className="font-bold text-app-text-primary mt-0.5">₹{details.earned.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="pl-1 flex flex-col items-center justify-center">
                    <span className="material-symbols-rounded select-none text-[15px] text-app-text-secondary/60">price_change</span>
                    <div className="text-[7.5px] font-bold text-app-text-secondary uppercase tracking-wider mt-0.5">Advance</div>
                    <div className="font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">₹{details.advance.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="pl-1 flex flex-col items-center justify-center">
                    <span className="material-symbols-rounded select-none text-[15px] text-app-text-secondary/60">do_not_disturb_on</span>
                    <div className="text-[7.5px] font-bold text-app-text-secondary uppercase tracking-wider mt-0.5">Deduction</div>
                    <div className="font-extrabold text-red-500 mt-0.5">₹{details.deduction.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="pl-1 flex flex-col items-center justify-center">
                    <span className="material-symbols-rounded select-none text-[15px] text-app-text-secondary/60">payments</span>
                    <div className="text-[7.5px] font-black uppercase tracking-wider mt-0.5 text-primary">Net Pay</div>
                    <div className="font-black mt-0.5 text-primary">₹{details.net.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Salary Hold / Release Information Badges */}
                {outstandingHold > 0 ? (
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider text-center bg-amber-500/5 py-1.5 px-3 rounded-xl border border-amber-500/10 flex items-center justify-between gap-1.5 select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-rounded text-[11px]">lock</span>
                      <span>₹{outstandingHold.toLocaleString('en-IN')} Held (1st Month Hold)</span>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        const confirmed = await confirm(`Are you sure you want to release the salary hold for ${staff.name}?`, {
                          title: 'Release Salary Hold',
                          type: 'success',
                          confirmText: 'Release'
                        });
                        if (confirmed) {
                          updateStaff(staff.id, { releasedSalaryHold: true });
                        }
                      }}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-lg text-[8px] active:scale-95 transition-all cursor-pointer"
                    >
                      Release
                    </button>
                  </div>
                ) : (
                  details.releasedAmount > 0 && (
                    <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider text-center bg-emerald-500/5 py-1.5 rounded-xl border border-emerald-500/10 flex items-center justify-center gap-1.5">
                      <span className="material-symbols-rounded text-[11px]">lock_open</span>
                      <span>₹{details.releasedAmount.toLocaleString('en-IN')} Released (Settlement Release)</span>
                    </div>
                  )
                )}

                {/* Actions Row */}
                <div className="flex gap-2 w-full mt-1">
                  {details.due > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenPayModal(staff.id, details.due);
                      }}
                      className="group/btn flex-grow py-2.5 bg-white dark:bg-slate-900/50 border border-primary text-primary hover:bg-primary/5 text-xs font-black rounded-xl shadow-sm hover:shadow transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Pay Salary</span>
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover/btn:translate-x-0.5 transition-transform">
                        <span className="material-symbols-rounded select-none text-primary" style={{ fontSize: '11px', color: 'var(--color-primary)' }}>send_to_mobile</span>
                      </div>
                    </button>
                  ) : (
                    <div className="flex-grow py-2.5 border border-dashed border-app-border rounded-xl text-[10px] font-bold text-emerald-600 dark:text-emerald-500 text-center select-none bg-emerald-500/5 flex items-center justify-center">
                      Settled for this cycle
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSlip(staff.id, selectedMonthLabel);
                    }}
                    className="px-3.5 py-2.5 bg-app-bg border border-app-border hover:bg-slate-50 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Salary Slip"
                  >
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>receipt_long</span>
                    <span>Slip</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {visibleStaff.length === 0 && (
          <div className="col-span-full bg-app-surface border border-app-border rounded-2xl p-12 text-center text-app-text-secondary">
            <span className="material-symbols-rounded text-slate-300 dark:text-slate-700" style={{ fontSize: '48px' }}>
              payments
            </span>
            <p className="mt-3 text-sm font-semibold">No staff members found.</p>
          </div>
        )}
      </div>

      {/* Payout Dialog */}
      {payoutStaffId && (
        <CustomDialog
          isOpen={payoutStaffId !== null}
          onClose={() => setPayoutStaffId(null)}
          title={`Pay Salary`}
          actions={
            <>
              <button
                onClick={() => setPayoutStaffId(null)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePayoutSubmit}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-primary/10"
              >
                Confirm Payment
              </button>
            </>
          }
        >
          {(() => {
            const selectedStaff = staffList.find(s => s.id === payoutStaffId);
            const targetYM = getYearMonthFromLabel(payoutMonth);
            const staffDetails = selectedStaff ? getSalaryDetails(selectedStaff.id, targetYM, payoutMonth) : null;
            if (!selectedStaff || !staffDetails) return null;
            
            const outstandingAdvance = getStaffOutstandingAdvance(selectedStaff.id);
            
            let deductVal = 0;
            if (advanceDeductType === 'full') {
              deductVal = Math.min(outstandingAdvance, staffDetails.due);
            } else if (advanceDeductType === 'custom') {
              deductVal = Math.min(Number(customAdvanceDeductAmount) || 0, outstandingAdvance);
            }
            const payableAmount = Math.max(0, staffDetails.due - deductVal);
            
            return (
              <div className="flex flex-col gap-4 text-left">
                {/* Staff Info Card */}
                <div className="flex items-center gap-3 bg-app-bg p-3.5 rounded-xl border border-app-border">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(selectedStaff.name)} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 border-0`}>
                    {selectedStaff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-sm leading-none">
                      {selectedStaff.name}
                    </h4>
                    <p className="text-[10px] text-app-text-secondary font-semibold mt-1.5 leading-none">
                      Rate: ₹{selectedStaff.monthlySalary.toLocaleString('en-IN')}/{selectedStaff.salaryType === 'Monthly' ? 'mo' : 'day'}
                    </p>
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div className="grid grid-cols-3 gap-2 bg-app-bg/50 border border-app-border/40 p-3 rounded-xl text-center text-xs divide-x divide-app-border/30">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-wider">Earned</span>
                    <div className="font-bold text-app-text-primary mt-1">₹{staffDetails.earned.toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[8px] font-bold text-app-text-secondary uppercase tracking-wider">Deductions</span>
                    <div className="font-bold text-red-500 mt-1">₹{(staffDetails.advance + staffDetails.deduction + deductVal).toLocaleString('en-IN')}</div>
                  </div>
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-[8px] font-black uppercase tracking-wider text-primary">Pending Due</span>
                    <div className="font-black mt-1 text-primary">₹{payableAmount.toLocaleString('en-IN')}</div>
                  </div>
                </div>

                {/* Salary Hold / Release Information Badges */}
                {staffDetails.holdAmount > 0 && (
                  <div className="text-[9px] text-amber-600 dark:text-amber-400 font-extrabold uppercase tracking-wider text-center bg-amber-500/5 py-1.5 rounded-xl border border-amber-500/10 flex items-center justify-center gap-1.5">
                    <span className="material-symbols-rounded text-[11px]">lock</span>
                    <span>₹{staffDetails.holdAmount.toLocaleString('en-IN')} Held (1st Month Salary Hold)</span>
                  </div>
                )}
                {staffDetails.releasedAmount > 0 && (
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold uppercase tracking-wider text-center bg-emerald-500/5 py-1.5 rounded-xl border border-emerald-500/10 flex items-center justify-center gap-1.5">
                    <span className="material-symbols-rounded text-[11px]">lock_open</span>
                    <span>₹{staffDetails.releasedAmount.toLocaleString('en-IN')} Released (Settlement Release)</span>
                  </div>
                )}

                {/* Advance Adjustment Section */}
                {outstandingAdvance > 0 && (
                  <div className="flex flex-col gap-2 bg-amber-500/[0.02] border border-amber-500/20 p-3.5 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                        Outstanding Advance
                      </span>
                      <span className="text-xs font-black text-amber-700 dark:text-amber-400">
                        ₹{outstandingAdvance.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1">
                      <label className="text-[9px] font-bold text-app-text-secondary uppercase tracking-wider">
                        Deduct Advance from Payout?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeductTypeChange('none')}
                          className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                            advanceDeductType === 'none'
                              ? 'bg-primary/10 border-primary text-primary shadow-sm font-black'
                              : 'bg-app-bg border-app-border text-app-text-secondary hover:text-app-text-primary font-bold'
                          }`}
                        >
                          No (₹0)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeductTypeChange('full')}
                          className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                            advanceDeductType === 'full'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-450 shadow-sm font-black'
                              : 'bg-app-bg border-app-border text-app-text-secondary hover:text-app-text-primary font-bold'
                          }`}
                        >
                          Full (₹{Math.min(outstandingAdvance, staffDetails.due).toLocaleString('en-IN')})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeductTypeChange('custom')}
                          className={`py-2 text-[10px] font-black rounded-lg border transition-all ${
                            advanceDeductType === 'custom'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-700 dark:text-amber-450 shadow-sm font-black'
                              : 'bg-app-bg border-app-border text-app-text-secondary hover:text-app-text-primary font-bold'
                          }`}
                        >
                          Custom
                        </button>
                      </div>

                      {/* Custom Deduct Input */}
                      {advanceDeductType === 'custom' && (
                        <div className="relative mt-1.5">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-app-text-secondary font-bold select-none">₹</span>
                          <input
                            type="number"
                            placeholder="Enter amount to deduct"
                            value={customAdvanceDeductAmount}
                            onChange={(e) => handleCustomDeductChange(e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary focus:outline-none focus:border-amber-500 transition-all no-spinners font-semibold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Form Fields */}
                <form onSubmit={handlePayoutSubmit} className="flex flex-col gap-4">
                  {payoutError && (
                    <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs border border-red-200">
                      {payoutError}
                    </div>
                  )}

                  {/* Salary Month */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Salary Month</label>
                    <CustomSelect
                      value={payoutMonth}
                      onChange={handleMonthChange}
                      options={getPayoutMonths(selectedStaff.id).options}
                      className="w-full"
                    />
                  </div>

                  {/* Payment Date */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Payment Date</label>
                    <CustomDatePicker
                      value={payoutDate}
                      onChange={setPayoutDate}
                      className="w-full"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Payment Mode</label>
                    <CustomSelect
                      value={payoutMode}
                      onChange={setPayoutMode}
                      options={[
                        { value: 'Cash', label: 'Cash' },
                        { value: 'Bank Transfer', label: 'Bank Transfer' },
                        { value: 'UPI / Online Payout', label: 'UPI / Online' },
                      ]}
                      className="w-full"
                    />
                  </div>

                  {/* Payout Amount */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Payout Amount</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-app-text-secondary font-bold select-none">₹</span>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners transition-all"
                      />
                    </div>
                  </div>

                  {/* Remarks / Trans ID */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Remarks / Transaction Details</label>
                    <input
                      type="text"
                      placeholder="e.g. UTR number, GPay Ref, or cash notes..."
                      value={payoutRemarks}
                      onChange={(e) => setPayoutRemarks(e.target.value)}
                      className="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary focus:outline-none focus:border-primary transition-all font-semibold"
                    />
                  </div>
                </form>
              </div>
            );
          })()}
        </CustomDialog>
      )}

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
