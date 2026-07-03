import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useAlertConfirm } from '../components/ui/AlertConfirmProvider';
import { SalarySlipModal } from '../components/SalarySlipModal';

export const StaffProfileScreen: React.FC = () => {
  const { confirm, alert } = useAlertConfirm();
  const {
    activeStaffProfileId,
    staffList,
    attendance,
    advanceList,
    deductionList,
    payoutList,
    paySalary,
    addAdvance,
    updateAdvance,
    deleteAdvance,
    addDeduction,
    updateDeduction,
    deleteDeduction,
    updateStaff,
    deleteStaff,
    setScreen,
    currentDate,
    markAttendance,
  } = useStore();

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [isAdvanceOpen, setIsAdvanceOpen] = useState(false);
  const [isDeductionOpen, setIsDeductionOpen] = useState(false);
  const [isEditTxOpen, setIsEditTxOpen] = useState(false);
  const [isAdvHistoryOpen, setIsAdvHistoryOpen] = useState(false);

  // Salary Slip Modal states
  const [isSlipOpen, setIsSlipOpen] = useState(false);
  const [slipMonthLabel, setSlipMonthLabel] = useState('');

  const handleOpenSlip = (monthLabel: string) => {
    setSlipMonthLabel(monthLabel);
    setIsSlipOpen(true);
  };

  // Payout Modal states
  const [isPayoutOpen, setIsPayoutOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutDate, setPayoutDate] = useState('');
  const [payoutMode, setPayoutMode] = useState('Cash');
  const [payoutRemarks, setPayoutRemarks] = useState('');
  const [payoutMonth, setPayoutMonth] = useState('');
  const [advanceDeductType, setAdvanceDeductType] = useState<'none' | 'full' | 'custom'>('none');
  const [customAdvanceDeductAmount, setCustomAdvanceDeductAmount] = useState('');
  const [payoutError, setPayoutError] = useState('');

  const getStaffOutstandingAdvance = (staffId: string) => {
    const staffAdvances = advanceList.filter((a) => a.staffId === staffId);
    const totalGiven = staffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
    const totalReturned = staffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
    return Math.max(0, totalGiven - totalReturned);
  };

  const getStaffOutstandingHold = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff || staff.releasedSalaryHold) return 0;
    
    const holdDays = useStore.getState().settings.newStaffSalaryHoldDays || 0;
    if (holdDays <= 0) return 0;

    const joiningYearMonth = staff.joiningDate.slice(0, 7);
    
    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
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

    const hasPrevPayout = payoutList.some(p => p.staffId === staffId && p.month === prevMonthLabelStr);
    const defaultMonth = hasPrevPayout ? currentMonthLabelStr : prevMonthLabelStr;

    return {
      options: [
        { value: currentMonthLabelStr, label: currentMonthLabelStr },
        { value: prevMonthLabelStr, label: prevMonthLabelStr },
      ],
      defaultMonth
    };
  };

  // Calculates financial details for a staff member for a specific month cycle
  const getSalaryDetailsForMonth = (staffId: string, targetYearMonth: string, targetMonthLabel: string) => {
    const sObj = staffList.find(s => s.id === staffId);
    if (!sObj) return { earned: 0, advance: 0, deduction: 0, net: 0, paid: 0, due: 0, holdAmount: 0, releasedAmount: 0 };

    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr.startsWith(targetYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const perDayVal = sObj.perDaySalary;
    const totalDaysCredited = daysPresent + (daysHalf * 0.5) + daysHoliday;
    
    const earned = sObj.calculationBasis === 'Fixed Salary' && sObj.salaryType === 'Monthly'
      ? sObj.monthlySalary
      : Math.round(totalDaysCredited * perDayVal);

    const totalAdv = advanceList
      .filter(a => a.staffId === staffId && a.date.startsWith(targetYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);
      
    const deduction = deductionList
      .filter(d => d.staffId === staffId && d.date.startsWith(targetYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);

    const paid = payoutList
      .filter(p => p.staffId === staffId && p.month === targetMonthLabel)
      .reduce((sum, item) => sum + item.amount, 0);

    let holdAmount = 0;
    let releasedAmount = 0;

    const joiningMonth = sObj.joiningDate.slice(0, 7);
    const holdDays = useStore.getState().settings.newStaffSalaryHoldDays || 0;

    if (holdDays > 0) {
      if (joiningMonth === targetYearMonth) {
        holdAmount = Math.min(earned, Math.round(holdDays * perDayVal));
      }
      if (sObj.status === 'Inactive' && sObj.deactivationDate && sObj.deactivationDate.slice(0, 7) === targetYearMonth) {
        releasedAmount = Math.round(holdDays * perDayVal);
      }
    }

    const net = Math.max(0, earned - totalAdv - deduction - holdAmount + releasedAmount);
    const due = Math.max(0, net - paid);

    return { earned, advance: totalAdv, deduction, net, paid, due, holdAmount, releasedAmount };
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
    const details = getSalaryDetailsForMonth(selectedStaff.id, targetYM, monthLabel);
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
    if (staff) {
      updatePayoutAmountField(staff.id, val, 'none', '');
    }
  };

  const handleDeductTypeChange = (type: 'none' | 'full' | 'custom') => {
    setAdvanceDeductType(type);
    if (type !== 'custom') {
      setCustomAdvanceDeductAmount('');
    }
    if (staff) {
      updatePayoutAmountField(staff.id, payoutMonth, type, '');
    }
  };

  const handleCustomDeductChange = (amountStr: string) => {
    setCustomAdvanceDeductAmount(amountStr);
    if (staff) {
      updatePayoutAmountField(staff.id, payoutMonth, 'custom', amountStr);
    }
  };

  const handleOpenPayModal = () => {
    if (!staff) return;
    const { defaultMonth } = getPayoutMonths(staff.id);
    setPayoutMonth(defaultMonth);
    setPayoutDate(currentDate);
    setPayoutMode('Cash');
    setPayoutRemarks('');
    setAdvanceDeductType('none');
    setCustomAdvanceDeductAmount('');
    setPayoutError('');

    const targetYM = getYearMonthFromLabel(defaultMonth);
    const details = getSalaryDetailsForMonth(staff.id, targetYM, defaultMonth);
    setPayoutAmount(details.due.toString());
    setIsPayoutOpen(true);
  };

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staff) return;
    if (!payoutAmount.trim()) {
      setPayoutError('Please enter amount.');
      return;
    }
    const amount = Number(payoutAmount);
    if (isNaN(amount) || amount < 0) {
      setPayoutError('Please enter a valid amount.');
      return;
    }

    const outstandingAdvance = getStaffOutstandingAdvance(staff.id);
    let deductVal = 0;
    if (advanceDeductType === 'full') {
      const targetYM = getYearMonthFromLabel(payoutMonth);
      const details = getSalaryDetailsForMonth(staff.id, targetYM, payoutMonth);
      deductVal = Math.min(outstandingAdvance, details.due);
    } else if (advanceDeductType === 'custom') {
      deductVal = Math.min(Number(customAdvanceDeductAmount) || 0, outstandingAdvance);
    }

    if (deductVal > 0) {
      addAdvance(staff.id, -deductVal, currentDate, `Deducted from Salary Payout (${payoutMonth})`);
    }

    setPayoutError('');
    paySalary(staff.id, amount, payoutMonth, currentDate, payoutMode, payoutRemarks);
    setIsPayoutOpen(false);
    setPayoutAmount('');
    setPayoutDate('');
    setPayoutMode('Cash');
    setPayoutRemarks('');
    setPayoutMonth('');
    setAdvanceDeductType('none');
    setCustomAdvanceDeductAmount('');
  };

  // Form states - Edit Staff
  const [editName, setEditName] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [editFatherName, setEditFatherName] = useState('');
  const [editMobile2, setEditMobile2] = useState('');
  const [editJoiningDate, setEditJoiningDate] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editProfileImage, setEditProfileImage] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editSalaryType, setEditSalaryType] = useState('Monthly');
  const [editBasis, setEditBasis] = useState('Attendance Based');
  const [editError, setEditError] = useState('');

  // Form states - Transactions
  const [amount, setAmount] = useState('');
  const [remarks, setRemarks] = useState('');
  const [txDate, setTxDate] = useState(currentDate);
  const [isAdvanceCalOpen, setIsAdvanceCalOpen] = useState(false);
  const [isDeductionCalOpen, setIsDeductionCalOpen] = useState(false);
  const [txError, setTxError] = useState('');
  const [advanceType, setAdvanceType] = useState<'Give' | 'Return'>('Give');

  // Form states - Edit existing Transaction
  const [editTxType, setEditTxType] = useState<'Advance' | 'Deduction'>('Advance');
  const [editTxId, setEditTxId] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxRemarks, setEditTxRemarks] = useState('');
  const [editTxDate, setEditTxDate] = useState('');
  const [isEditTxCalOpen, setIsEditTxCalOpen] = useState(false);
  const [editAdvanceType, setEditAdvanceType] = useState<'Give' | 'Return'>('Give');

  if (!activeStaffProfileId) {
    return (
      <div className="p-8 text-center text-app-text-secondary bg-app-surface border border-app-border rounded-app-card max-w-md mx-auto mt-12 shadow-sm">
        <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700 select-none">
          account_circle
        </span>
        <p className="mt-3 text-sm">No active staff profile selected.</p>
        <button
          onClick={() => setScreen('staff')}
          className="mt-5 px-6 py-2.5 bg-primary text-white rounded-app-card text-xs font-bold shadow-md hover:bg-opacity-95 cursor-pointer"
        >
          Go Back to Staff
        </button>
      </div>
    );
  }

  const staff = staffList.find((s) => s.id === activeStaffProfileId);
  if (!staff) {
    return (
      <div className="p-8 text-center text-app-text-secondary bg-app-surface border border-app-border rounded-app-card max-w-md mx-auto mt-12 shadow-sm">
        <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700 select-none">
          error
        </span>
        <p className="mt-3 text-sm">Staff member not found.</p>
        <button
          onClick={() => setScreen('staff')}
          className="mt-5 px-6 py-2.5 bg-primary text-white rounded-app-card text-xs font-bold shadow-md hover:bg-opacity-95 cursor-pointer"
        >
          Go Back to Staff
        </button>
      </div>
    );
  }

  // Calculate stats for current month
  const selectedDate = parseISO(currentDate);
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth(); // 0-indexed
  
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  let presentDays = 0;
  let absentDays = 0;
  let halfDays = 0;
  let holidayDays = 0;

  daysInMonth.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const record = attendance[dateStr]?.[staff.id];
    if (record) {
      if (record.status === 'Present') presentDays++;
      if (record.status === 'Absent') absentDays++;
      if (record.status === 'Half Day') halfDays++;
      if (record.status === 'Holiday') holidayDays++;
    }
  });

  const totalDaysCredited = presentDays + (halfDays * 0.5) + holidayDays;
  const earnedSalary = Math.round(totalDaysCredited * staff.perDaySalary);

  // Advances & Deductions history
  const currentYearMonth = currentDate.slice(0, 7); // YYYY-MM
  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const staffAdvances = advanceList.filter((a) => a.staffId === staff.id && a.date.startsWith(currentYearMonth));
  const staffDeductions = deductionList.filter((d) => d.staffId === staff.id && d.date.startsWith(currentYearMonth));

  const totalAdvances = staffAdvances.reduce((sum, a) => sum + a.amount, 0);
  const totalAdjusted = staffDeductions.reduce((sum, d) => sum + d.amount, 0);
  
  const monthGiven = staffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
  const monthReturned = staffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);

  const allStaffAdvances = advanceList.filter((a) => a.staffId === staff.id).sort((a, b) => b.date.localeCompare(a.date));
  const allTimeGiven = allStaffAdvances.filter((a) => a.amount > 0).reduce((sum, a) => sum + a.amount, 0);
  const allTimeReturned = allStaffAdvances.filter((a) => a.amount < 0).reduce((sum, a) => sum + Math.abs(a.amount), 0);
  const allTimeNet = allTimeGiven - allTimeReturned;
  
  const paidAmount = payoutList
    .filter(p => p.staffId === staff.id && p.month === currentMonthLabel)
    .reduce((sum, item) => sum + item.amount, 0);

  const staffPayouts = payoutList
    .filter(p => p.staffId === staff.id && p.month === currentMonthLabel)
    .sort((a, b) => b.date.localeCompare(a.date));

  // 5. Hold/Release calculations
  let holdAmount = 0;
  let releasedAmount = 0;

  const joiningMonth = staff.joiningDate.slice(0, 7);
  const holdDays = useStore.getState().settings.newStaffSalaryHoldDays || 0;
  const perDayVal = staff.perDaySalary;

  if (holdDays > 0) {
    if (joiningMonth === currentYearMonth) {
      if (staff.releasedSalaryHold) {
        holdAmount = 0;
        releasedAmount = Math.round(holdDays * perDayVal);
      } else {
        holdAmount = Math.min(earnedSalary, Math.round(holdDays * perDayVal));
      }
    }

    if (staff.status === 'Inactive' && staff.deactivationDate && staff.deactivationDate.slice(0, 7) === currentYearMonth) {
      if (!staff.releasedSalaryHold) {
        releasedAmount = Math.round(holdDays * perDayVal);
      }
    }
  }

  const netPayable = Math.max(0, earnedSalary - totalAdvances - totalAdjusted - holdAmount + releasedAmount);
  const outstandingHold = getStaffOutstandingHold(staff.id);

  // Calendar helpers
  const daysInMonthCount = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday
  const firstDayIndex = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Align to M, T, W, T, F, S, S

  const calendarDays = [];
  // Pad the empty days in the beginning of the week
  for (let i = 0; i < firstDayIndex; i++) {
    calendarDays.push(null);
  }
  // Fill the days of the month
  for (let d = 1; d <= daysInMonthCount; d++) {
    calendarDays.push(d);
  }

  // Get status details for calendar cell style
  const getDayDetails = (dayNum: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const record = attendance[dStr]?.[staff.id];
    return record?.status || null;
  };

  const handleDayClick = (dayNum: number) => {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const currentStatus = attendance[dStr]?.[staff.id]?.status || 'Unmarked';
    
    // Cycle sequence: Unmarked -> Present -> Half Day -> Absent -> Holiday -> Unmarked
    const sequence: any[] = ['Unmarked', 'Present', 'Half Day', 'Absent', 'Holiday'];
    const currentIndex = sequence.includes(currentStatus) ? sequence.indexOf(currentStatus) : 0;
    const nextStatus = sequence[(currentIndex + 1) % sequence.length];
    
    markAttendance(dStr, staff.id, nextStatus);
  };

  const handleEditOpen = () => {
    setEditName(staff.name);
    setEditMobile(staff.mobile);
    setEditFatherName(staff.fatherName || '');
    setEditMobile2(staff.mobile2 || '');
    setEditJoiningDate(staff.joiningDate || new Date().toISOString().split('T')[0]);
    setEditAddress(staff.address || '');
    setEditProfileImage(staff.profileImage || '');
    setEditSalary(String(staff.monthlySalary));
    setEditSalaryType(staff.salaryType);
    setEditBasis(staff.calculationBasis);
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      await alert('Name cannot be empty.', { type: 'warning' });
      return;
    }
    if (!editSalary.trim() || isNaN(Number(editSalary)) || Number(editSalary) <= 0) {
      await alert('Please enter a valid salary amount.', { type: 'warning' });
      return;
    }
    if (editMobile.trim() && editMobile.trim().length !== 10) {
      await alert('Primary Mobile number must be exactly 10 digits.', { type: 'warning' });
      return;
    }
    if (editMobile2.trim() && editMobile2.trim().length !== 10) {
      await alert('Secondary Mobile number must be exactly 10 digits.', { type: 'warning' });
      return;
    }

    updateStaff(staff.id, {
      name: editName,
      mobile: editMobile,
      fatherName: editFatherName,
      mobile2: editMobile2,
      joiningDate: editJoiningDate,
      address: editAddress,
      profileImage: editProfileImage,
      monthlySalary: Number(editSalary),
      perDaySalary: editSalaryType === 'Monthly' ? Math.round(Number(editSalary) / 30) : Number(editSalary),
      salaryType: editSalaryType as 'Monthly' | 'Daily',
      calculationBasis: editBasis as 'Attendance Based' | 'Fixed Salary',
    });
    setIsEditModalOpen(false);
  };

  const handleAddAdvance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) {
      setTxError('Please enter amount.');
      return;
    }
    setTxError('');
    const finalAmount = advanceType === 'Give' ? Number(amount) : -Number(amount);
    const defaultRemarks = advanceType === 'Give' ? 'Advance given' : 'Advance returned';
    addAdvance(staff.id, finalAmount, txDate, remarks || defaultRemarks);
    setAmount('');
    setRemarks('');
    setIsAdvanceOpen(false);
  };

  const handleAddDeduction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount.trim()) {
      setTxError('Please enter amount.');
      return;
    }
    setTxError('');
    addDeduction(staff.id, Number(amount), txDate, remarks || 'Deduction added');
    setAmount('');
    setRemarks('');
    setIsDeductionOpen(false);
  };

  const handleToggleStatus = () => {
    const isDeactivating = staff.status === 'Active';
    updateStaff(staff.id, {
      status: isDeactivating ? 'Inactive' : 'Active',
      deactivationDate: isDeactivating ? currentDate : undefined,
    });
    setIsStatusConfirmOpen(false);
  };

  const handleOpenEditTx = (record: { id: string; amount: number; date: string; remarks: string }, type: 'Advance' | 'Deduction') => {
    setEditTxType(type);
    setEditTxId(record.id);
    if (type === 'Advance') {
      const isReturn = record.amount < 0;
      setEditAdvanceType(isReturn ? 'Return' : 'Give');
      setEditTxAmount(String(Math.abs(record.amount)));
    } else {
      setEditTxAmount(String(record.amount));
    }
    setEditTxRemarks(record.remarks);
    setEditTxDate(record.date);
    setTxError('');
    setIsEditTxOpen(true);
  };

  const handleUpdateTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTxAmount.trim()) {
      setTxError('Please enter amount.');
      return;
    }
    setTxError('');
    if (editTxType === 'Advance') {
      const finalAmount = editAdvanceType === 'Give' ? Number(editTxAmount) : -Number(editTxAmount);
      updateAdvance(editTxId, finalAmount, editTxDate, editTxRemarks);
    } else {
      updateDeduction(editTxId, Number(editTxAmount), editTxDate, editTxRemarks);
    }
    setIsEditTxOpen(false);
  };

  const handleDeleteTx = () => {
    if (editTxType === 'Advance') {
      deleteAdvance(editTxId);
    } else {
      deleteDeduction(editTxId);
    }
    setIsEditTxOpen(false);
  };

  const getStaffRole = (name: string) => {
    if (name.includes('Arjun')) return 'Manager';
    if (name.includes('Sunita')) return 'Server';
    if (name.includes('Ramesh') || name.includes('Kumar')) return 'Head cook';
    if (name.includes('Imran')) return 'Barista';
    if (name.includes('Priya')) return 'Cashier';
    if (name.includes('Vijay')) return 'Cleaner';
    if (name.includes('Anjali')) return 'Server';
    if (name.includes('Mohammed') || name.includes('Ali')) return 'Helper';
    return 'Staff Member';
  };

  const getAvatarBg = (name: string) => {
    const colors = [
      'bg-indigo-600/10 text-indigo-600 border-indigo-200',
      'bg-emerald-600/10 text-emerald-600 border-emerald-200',
      'bg-rose-600/10 text-rose-600 border-rose-200',
      'bg-blue-600/10 text-blue-600 border-blue-200',
      'bg-amber-600/10 text-amber-600 border-amber-200',
      'bg-violet-600/10 text-violet-600 border-violet-200',
    ];
    let sum = 0;
    for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return colors[sum % colors.length];
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

  const currentMonthName = format(selectedDate, 'MMMM yyyy');

  return (
    <div className="flex flex-col gap-6 pb-24 animate-in fade-in duration-200">
      
      {/* Back button and actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full select-none">
        <button
          onClick={() => setScreen('staff')}
          className="text-xs font-bold text-app-text-secondary hover:text-primary flex items-center gap-1 cursor-pointer"
        >
          <span className="material-symbols-rounded text-sm select-none">arrow_back</span>
          <span>Back to staff</span>
        </button>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Active/Deactive Toggle */}
          <div className="flex items-center gap-2 bg-app-surface border border-app-border rounded-xl px-3 py-1.5 shadow-sm">
            <span className="text-[10px] font-black text-app-text-secondary uppercase tracking-wider">Status:</span>
            <span className={`text-xs font-bold ${staff.status === 'Active' ? 'text-emerald-600' : 'text-rose-500'}`}>
              {staff.status === 'Active' ? 'Active' : 'Inactive'}
            </span>
            <button
              type="button"
              onClick={async () => {
                const isDeactivating = staff.status === 'Active';
                const message = isDeactivating
                  ? `Are you sure you want to deactivate ${staff.name}? Deactivating will automatically mark them as Absent for today.`
                  : `Are you sure you want to activate ${staff.name}?`;
                
                const confirmed = await confirm(message, {
                  title: isDeactivating ? 'Deactivate Staff' : 'Activate Staff',
                  type: isDeactivating ? 'danger' : 'success',
                  confirmText: isDeactivating ? 'Deactivate' : 'Activate',
                });

                if (confirmed) {
                  updateStaff(staff.id, {
                    status: isDeactivating ? 'Inactive' : 'Active',
                    deactivationDate: isDeactivating ? currentDate : undefined,
                  });
                  if (isDeactivating) {
                    markAttendance(currentDate, staff.id, 'Absent');
                  }
                }
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                staff.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  staff.status === 'Active' ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Update button */}
          <button
            onClick={handleEditOpen}
            className="px-3.5 py-1.5 bg-app-surface border border-app-border text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded select-none text-primary" style={{ fontSize: '15px' }}>edit</span>
            <span>Update</span>
          </button>

          {/* Delete button */}
          <button
            onClick={async () => {
              const confirmed = await confirm(`Are you sure you want to delete ${staff.name}? This will remove all their records permanently.`, {
                title: 'Delete Employee',
                type: 'danger',
                confirmText: 'Delete',
              });

              if (confirmed) {
                deleteStaff(staff.id);
                setScreen('staff');
              }
            }}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>delete</span>
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* 1. TOP PROFILE BANNER CARD */}
      <div className={`w-full bg-gradient-to-r ${getProfileGradient(staff.name)} rounded-app-card p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-md`}>
        
        {/* Left Side: Avatar with upload indicator, Text info */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <input
              type="file"
              accept="image/*"
              id="profile-image-upload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    updateStaff(staff.id, { profileImage: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            <label htmlFor="profile-image-upload" className="cursor-pointer">
              {staff.profileImage ? (
                <img
                  src={staff.profileImage}
                  alt={staff.name}
                  className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div className="w-14 h-14 rounded-full border-2 border-white bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center font-black text-xl text-white shadow-sm select-none">
                  {staff.avatar || staff.name.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* Camera badge with clean white border to prevent dark outline bleed */}
              <div className="absolute -bottom-0.5 -right-0.5 w-5.5 h-5.5 rounded-full bg-white text-primary border-2 border-white flex items-center justify-center shadow-sm select-none group-hover:scale-110 transition-transform">
                <span className="material-symbols-rounded font-bold" style={{ fontSize: '11px' }}>photo_camera</span>
              </div>
            </label>
          </div>
          
          <div>
            <div className="text-[10px] text-white/70 uppercase font-black tracking-wider">
              Staff profile
            </div>
            <h2 className="text-2xl font-black tracking-tight leading-tight mt-0.5">
              {staff.name}
            </h2>
            <p className="text-[11px] text-white/80 mt-1 leading-none font-medium">
              {getStaffRole(staff.name)} • {staff.mobile}
            </p>
            <p className="text-[10px] text-white/70 mt-1.5 leading-none">
              {staff.status === 'Active' ? 'Active employee' : 'Inactive employee'}
            </p>
          </div>
        </div>

        {/* Right Side: Remaining Due Salary */}
        <div className="bg-white/15 backdrop-blur-lg border border-white/25 rounded-2xl px-6 py-3.5 flex flex-col items-end justify-center gap-1 shadow-[0_8px_32px_rgba(0,0,0,0.12)] select-none shrink-0 self-end md:self-auto min-w-[140px]">
          <div className="text-[9px] text-white/85 uppercase font-black tracking-widest leading-none">
            Remaining Due
          </div>
          <div className="text-3xl md:text-4xl font-black tracking-tight leading-none text-white mt-1">
            ₹{Math.max(0, netPayable - paidAmount).toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* 2. TWO COLUMN DETAILS GRID */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column: Stats Cards and Custom Calendar Sheet */}
        <div className="w-full lg:w-[52%] flex flex-col gap-6">
          
          {/* Stats Cards Row (4 boxes) - Double Bezel Look */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-lg p-0.5 shadow-sm text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/10 p-3 rounded-[7px]">
                <div className="text-xl font-black text-present leading-none">{presentDays}</div>
                <div className="text-[7.5px] uppercase font-bold text-present mt-2 tracking-wider">Present</div>
              </div>
            </div>
            <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-lg p-0.5 shadow-sm text-center">
              <div className="bg-rose-500/10 border border-rose-500/10 p-3 rounded-[7px]">
                <div className="text-xl font-black text-absent leading-none">{absentDays}</div>
                <div className="text-[7.5px] uppercase font-bold text-absent mt-2 tracking-wider">Absent</div>
              </div>
            </div>
            <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-lg p-0.5 shadow-sm text-center">
              <div className="bg-amber-500/10 border border-amber-500/10 p-3 rounded-[7px]">
                <div className="text-xl font-black text-halfday leading-none">{halfDays}</div>
                <div className="text-[7.5px] uppercase font-bold text-halfday mt-2 tracking-wider">Half day</div>
              </div>
            </div>
            <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-lg p-0.5 shadow-sm text-center">
              <div className="bg-info/10 border border-info/10 p-3 rounded-[7px]">
                <div className="text-xl font-black text-info leading-none">{holidayDays}</div>
                <div className="text-[7.5px] uppercase font-bold text-info mt-2 tracking-wider">Holiday</div>
              </div>
            </div>
          </div>

          {/* Attendance Calendar Card - Double Bezel Architecture */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
            <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '16px' }}>calendar_month</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Attendance calendar</h3>
                  <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">{currentMonthName} working month</p>
                </div>
              </div>

              {/* Custom Month Grid */}
              <div className="flex flex-col gap-2 mt-2">
                {/* Day headers */}
                <div className="grid grid-cols-7 text-center font-bold text-[9px] text-app-text-secondary uppercase tracking-widest pb-2 border-b border-app-border/60">
                  <div>M</div>
                  <div>T</div>
                  <div>W</div>
                  <div>T</div>
                  <div>F</div>
                  <div>S</div>
                  <div>S</div>
                </div>

                {/* Grid cells */}
                <div className="grid grid-cols-7 gap-2 pt-2">
                  {calendarDays.map((dayNum, idx) => {
                    if (dayNum === null) {
                      return (
                        <div 
                          key={`empty-${idx}`} 
                          className="aspect-square bg-slate-50/20 dark:bg-slate-900/5 border border-dashed border-app-border/40 rounded-xl"
                        />
                      );
                    }

                    const status = getDayDetails(dayNum);
                    
                    return (
                      <div
                        key={`day-${dayNum}`}
                        onClick={() => handleDayClick(dayNum)}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center font-black text-sm sm:text-base border transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-110 cursor-pointer ${
                          status === 'Present' ? 'bg-present border-present text-white shadow-sm' :
                          status === 'Absent' ? 'bg-absent border-absent text-white shadow-sm' :
                          status === 'Half Day' ? 'bg-halfday border-halfday text-white shadow-sm' :
                          status === 'Holiday' ? 'bg-info border-info text-white shadow-sm' :
                          'border-app-border bg-app-bg text-app-text-secondary hover:border-primary/20'
                        }`}
                      >
                        {dayNum}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Financial Ledgers, Salary Summary and Employment Details */}
        <div className="w-full lg:w-[48%] flex flex-col gap-6">
          
          {/* Payment and Deduction Card - Double Bezel Architecture */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
            <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-app-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '16px' }}>receipt_long</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Payment and deduction</h3>
                    <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Current month entries</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAmount('');
                    setRemarks('');
                    setTxDate(currentDate);
                    setTxError('');
                    setIsDeductionOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-rose-500/10 active:scale-95"
                >
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>add</span>
                  <span>Deduction</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* Earned Salary Row */}
                <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-app-bg border border-app-border/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>payments</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-app-text-primary text-xs">Earned salary</h4>
                      <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">{currentMonthLabel} cycle • Credit</p>
                    </div>
                  </div>
                  <div className="font-bold text-emerald-600 text-xs">
                    ₹{earnedSalary.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Advance Adjusted Row */}
                {totalAdvances > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-app-bg border border-app-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>wallet</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-app-text-primary text-xs">Advance adjusted</h4>
                        <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">At salary run • Debit</p>
                      </div>
                    </div>
                    <div className="font-bold text-rose-600 text-xs">
                      ₹{totalAdvances.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                {/* Deductions Total Row */}
                {totalAdjusted > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-app-bg border border-app-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>remove_circle</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-app-text-primary text-xs">Deductions</h4>
                        <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">At salary run • Debit</p>
                      </div>
                    </div>
                    <div className="font-bold text-rose-600 text-xs">
                      ₹{totalAdjusted.toLocaleString('en-IN')}
                    </div>
                  </div>
                )}

                {/* Individual Deductions (e.g. Breakage, etc) */}
                {staffDeductions.map((d) => (
                  <div 
                    key={d.id} 
                    onClick={() => handleOpenEditTx(d, 'Deduction')}
                    className="flex items-center justify-between py-2 px-3 rounded-xl cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/30 border border-transparent hover:border-app-border/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>remove_circle</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-app-text-primary text-xs group-hover:text-primary transition-colors">{d.remarks || 'Deduction'}</h4>
                        <p className="text-[9px] font-bold text-app-text-secondary mt-0.5">{format(parseISO(d.date), 'dd MMM')} • Deduction</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-bold text-rose-600 text-xs">
                      <span>₹{d.amount.toLocaleString('en-IN')}</span>
                      {/* Inline Actions */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditTx(d, 'Deduction');
                          }}
                          className="w-5.5 h-5.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <span className="material-symbols-rounded select-none" style={{ fontSize: '11px' }}>edit</span>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = await confirm('Are you sure you want to delete this deduction?', {
                              title: 'Delete Deduction',
                              type: 'danger',
                              confirmText: 'Delete'
                            });
                            if (confirmed) {
                              deleteDeduction(d.id);
                            }
                          }}
                          className="w-5.5 h-5.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <span className="material-symbols-rounded select-none" style={{ fontSize: '11px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Individual Payouts / Payments */}
                {staffPayouts.map((p) => (
                  <div 
                    key={p.id} 
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-emerald-500/[0.02] border border-emerald-500/10 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>check_circle</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-app-text-primary text-xs">Salary Paid</h4>
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-extrabold text-[8px] uppercase tracking-wider">
                            {p.paymentMode || 'Cash'}
                          </span>
                        </div>
                        <p className="text-[9px] font-bold text-app-text-secondary mt-0.5">
                          {format(parseISO(p.date), 'dd MMM yyyy')} {p.remarks ? `• ${p.remarks}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="font-bold text-emerald-600 text-xs">
                      ₹{p.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Advance Detail Card - Double Bezel Architecture */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
            <div 
              onClick={() => setIsAdvHistoryOpen(true)}
              className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4 cursor-pointer hover:border-amber-500/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 group select-none"
            >
              <div className="flex items-center justify-between pb-3 border-b border-app-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '16px' }}>wallet</span>
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Advance detail</h3>
                    <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Given and adjusted ledger</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAmount('');
                    setRemarks('');
                    setTxDate(currentDate);
                    setTxError('');
                    setAdvanceType('Give');
                    setIsAdvanceOpen(true);
                  }}
                  className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold flex items-center gap-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
                >
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>add</span>
                  <span>Advance</span>
                </button>
              </div>

              {/* Advance Monthly Stats Row */}
              <div className="grid grid-cols-3 gap-2 bg-app-bg p-3 rounded-xl border border-app-border/40 text-center">
                <div>
                  <div className="text-[8px] text-app-text-secondary uppercase font-bold tracking-wider">Total Advance</div>
                  <div className="text-xs font-black text-amber-600 mt-1">₹{totalAdvances.toLocaleString('en-IN')}</div>
                </div>
                <div className="border-l border-app-border/40">
                  <div className="text-[8px] text-app-text-secondary uppercase font-bold tracking-wider">Total Given</div>
                  <div className="text-xs font-black text-amber-600 mt-1">₹{monthGiven.toLocaleString('en-IN')}</div>
                </div>
                <div className="border-l border-app-border/40">
                  <div className="text-[8px] text-app-text-secondary uppercase font-bold tracking-wider">Total Returned</div>
                  <div className="text-xs font-black text-emerald-600 mt-1">₹{monthReturned.toLocaleString('en-IN')}</div>
                </div>
              </div>

              <div className="text-center text-[10px] text-app-text-secondary font-bold group-hover:text-amber-500 transition-colors flex items-center justify-center gap-1 mt-1">
                <span>Click to view detailed history</span>
                <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>arrow_forward</span>
              </div>
            </div>
          </div>

          {/* Salary Summary Card - Double Bezel Architecture */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
            <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-3 border-b border-app-border/60">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '16px' }}>payments</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Salary summary</h3>
                  <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Current cycle calculation</p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Monthly salary</span>
                  <span className="font-bold text-app-text-primary">₹{staff.monthlySalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Per day salary</span>
                  <span className="font-bold text-app-text-primary">₹{staff.perDaySalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center bg-emerald-600 text-white px-3.5 py-2.5 rounded-xl shadow-sm">
                  <span className="font-bold">Earned</span>
                  <span className="font-black text-sm">₹{earnedSalary.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="font-semibold text-app-text-secondary">Advance</span>
                  <span className={`font-bold ${totalAdvances > 0 ? 'text-rose-600' : 'text-app-text-primary'}`}>₹{totalAdvances.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="font-semibold text-app-text-secondary">Deductions</span>
                  <span className="font-bold text-rose-600">₹{totalAdjusted.toLocaleString('en-IN')}</span>
                </div>

                {outstandingHold > 0 && (
                  <div className="flex justify-between items-center px-2 py-1 text-amber-600 dark:text-amber-400 font-bold bg-amber-500/5 rounded-xl border border-amber-500/10">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-rounded text-sm select-none">lock</span>
                      <span className="text-xs">Salary Hold: ₹{outstandingHold.toLocaleString('en-IN')}</span>
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
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-[9px] active:scale-95 transition-all cursor-pointer"
                    >
                      Release
                    </button>
                  </div>
                )}
                {releasedAmount > 0 && (
                  <div className="flex justify-between items-center px-2 py-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-rounded text-sm select-none">lock_open</span>
                      <span className="text-xs">Hold Released</span>
                    </div>
                    <span className="text-xs font-black">+₹{releasedAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center bg-primary text-white p-3.5 rounded-xl shadow-sm mt-1">
                  <span className="font-black text-sm">Net payable</span>
                  <span className="font-black text-base">₹{netPayable.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between items-center bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl shadow-sm border border-emerald-500/20">
                  <span className="font-bold">Already Paid</span>
                  <span className="font-black text-base">₹{paidAmount.toLocaleString('en-IN')}</span>
                </div>
                
                <div className="flex justify-between items-center bg-amber-500/15 text-amber-700 dark:text-amber-400 p-3.5 rounded-xl shadow-sm border border-amber-500/25">
                  <span className="font-bold">Remaining Due</span>
                  <span className="font-black text-base">₹{Math.max(0, netPayable - paidAmount).toLocaleString('en-IN')}</span>
                </div>

                {/* Actions Row */}
                <div className="flex gap-2 w-full mt-2">
                  {Math.max(0, netPayable - paidAmount) > 0 ? (
                    <button
                      onClick={handleOpenPayModal}
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
                    onClick={() => handleOpenSlip(currentMonthLabel)}
                    className="px-3.5 py-2.5 bg-app-bg border border-app-border hover:bg-slate-50 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer active:scale-95 shrink-0"
                    title="Salary Slip"
                  >
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>receipt_long</span>
                    <span>Slip</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Employment Detail Card - Double Bezel Architecture */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-sm">
            <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-3 border-b border-app-border/60">
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '16px' }}>badge</span>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-app-text-primary uppercase tracking-wider">Employment detail</h3>
                  <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Staff record</p>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Joining date</span>
                  {staff.joiningDate ? (
                    <span className="px-2.5 py-1 bg-primary/10 text-primary dark:bg-primary/20 rounded-lg font-black text-[11px] shadow-sm">
                      {format(parseISO(staff.joiningDate), 'dd MMM yyyy')}
                    </span>
                  ) : (
                    <span className="font-bold text-app-text-secondary">Not set</span>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Father's Name</span>
                  <span className="font-bold text-app-text-primary">{staff.fatherName || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Primary Mobile</span>
                  <span className="font-bold text-app-text-primary">{staff.mobile}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Secondary Mobile</span>
                  <span className="font-bold text-app-text-primary">{staff.mobile2 || '—'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Salary type</span>
                  <span className="font-bold text-app-text-primary">{staff.salaryType}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-app-text-secondary">Calculation basis</span>
                  <span className="font-bold text-app-text-primary">{staff.calculationBasis}</span>
                </div>
                <div className="flex flex-col gap-1 pt-1.5 border-t border-app-border/40">
                  <span className="font-semibold text-app-text-secondary">Address</span>
                  <span className="font-bold text-app-text-primary leading-normal break-words whitespace-pre-line">
                    {staff.address || '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* 3. MODALS */}
      {/* Edit Staff Modal */}
      <CustomDialog
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Staff Member details"
        actions={
          <>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-primary/10"
            >
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleEditSubmit} className="flex flex-col gap-4">
          {editError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {editError}
            </div>
          )}
          {/* Profile Photo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Profile Photo</label>
            <div className="flex items-center gap-3">
              {editProfileImage ? (
                <div className="relative w-12 h-12 rounded-full overflow-hidden border border-app-border">
                  <img src={editProfileImage} alt="Profile Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setEditProfileImage('')}
                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-all text-[10px] font-bold"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="w-12 h-12 rounded-full bg-app-bg border border-dashed border-app-border flex items-center justify-center cursor-pointer hover:border-primary hover:text-primary transition-all text-app-text-secondary">
                  <span className="material-symbols-rounded text-lg">add_a_photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditProfileImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                </label>
              )}
              <span className="text-[10px] text-app-text-secondary font-medium">Upload employee photo (JPEG, PNG)</span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Father's Name</label>
            <input
              type="text"
              placeholder="e.g. Ramesh Patel"
              value={editFatherName}
              onChange={(e) => setEditFatherName(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Primary Mobile</label>
              <input
                type="tel"
                value={editMobile}
                onChange={(e) => setEditMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Secondary Mobile</label>
              <input
                type="tel"
                placeholder="Optional 10-digit number"
                value={editMobile2}
                onChange={(e) => setEditMobile2(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Joining Date</label>
            <CustomDatePicker
              value={editJoiningDate}
              onChange={(val) => setEditJoiningDate(val)}
              className="w-full"
              inline
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Address</label>
            <textarea
              placeholder="Residential Address"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold placeholder:text-app-text-secondary focus:outline-none focus:border-primary resize-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CustomSelect
              label="Salary Type"
              value={editSalaryType}
              onChange={setEditSalaryType}
              options={[
                { value: 'Monthly', label: 'Monthly' },
                { value: 'Daily', label: 'Daily' },
              ]}
            />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Monthly / Daily Base</label>
              <input
                type="number"
                value={editSalary}
                onChange={(e) => setEditSalary(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners transition-all"
              />
            </div>
          </div>

          <CustomSelect
            label="Salary Calculation Basis"
            value={editBasis}
            onChange={setEditBasis}
            options={[
              { value: 'Attendance Based', label: 'Attendance Based' },
              { value: 'Fixed Salary', label: 'Fixed Salary' },
            ]}
          />
        </form>
      </CustomDialog>


      {/* Add Advance Modal */}
      <CustomDialog
        isOpen={isAdvanceOpen}
        onClose={() => setIsAdvanceOpen(false)}
        title="Advance Transaction"
        bodyClass={isAdvanceCalOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
        actions={
          <>
            <button
              onClick={() => setIsAdvanceOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAdvance}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                advanceType === 'Give' 
                  ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
              }`}
            >
              Confirm
            </button>
          </>
        }
      >
        <form onSubmit={handleAddAdvance} className="flex flex-col gap-4">
          {txError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {txError}
            </div>
          )}

          {/* Transaction Type Tab Selector */}
          <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
            <button
              type="button"
              onClick={() => {
                setAdvanceType('Give');
                if (!remarks || remarks === 'Advance returned') setRemarks('Advance given');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                advanceType === 'Give'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              Give
            </button>
            <button
              type="button"
              onClick={() => {
                setAdvanceType('Return');
                if (!remarks || remarks === 'Advance given') setRemarks('Advance returned');
              }}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                advanceType === 'Return'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-app-text-secondary hover:text-app-text-primary'
              }`}
            >
              Return
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
            <CustomDatePicker
              value={txDate}
              onChange={(val) => setTxDate(val)}
              onOpenChange={setIsAdvanceCalOpen}
              className="w-full"
              inline
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Amount</label>
            <input
              type="number"
              placeholder="₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
            <input
              type="text"
              placeholder={advanceType === 'Give' ? 'e.g. Rent advance' : 'e.g. Returned back to office'}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </CustomDialog>

      {/* Add Deduction Modal */}
      <CustomDialog
        isOpen={isDeductionOpen}
        onClose={() => setIsDeductionOpen(false)}
        title="Add Deduction / Fine"
        bodyClass={isDeductionCalOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
        actions={
          <>
            <button
              onClick={() => setIsDeductionOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleAddDeduction}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-rose-500/10"
            >
              Confirm
            </button>
          </>
        }
      >
        <form onSubmit={handleAddDeduction} className="flex flex-col gap-4">
          {txError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {txError}
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
            <CustomDatePicker
              value={txDate}
              onChange={(val) => setTxDate(val)}
              onOpenChange={setIsDeductionCalOpen}
              className="w-full"
              inline
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Amount</label>
            <input
              type="number"
              placeholder="₹"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
            <input
              type="text"
              placeholder="e.g. Uniform damage cost"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </CustomDialog>

      {/* Edit Transaction Modal */}
      <CustomDialog
        isOpen={isEditTxOpen}
        onClose={() => setIsEditTxOpen(false)}
        title={editTxType === 'Advance' ? 'Edit Advance Transaction' : 'Edit Deduction / Fine'}
        bodyClass={isEditTxCalOpen ? 'max-h-[320px]' : 'max-h-[70vh]'}
        actions={
          <>
            <button
              type="button"
              onClick={handleDeleteTx}
              className="px-4 py-2 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-all cursor-pointer hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center gap-1.5 mr-auto animate-none"
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>delete</span>
              <span>Delete</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEditTxOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpdateTx}
              className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                editTxType === 'Advance' 
                  ? (editAdvanceType === 'Give' 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10')
                  : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/10'
              }`}
            >
              Save Changes
            </button>
          </>
        }
      >
        <form onSubmit={handleUpdateTx} className="flex flex-col gap-4">
          {txError && (
            <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
              {txError}
            </div>
          )}

          {/* Transaction Type Tab Selector for Advance */}
          {editTxType === 'Advance' && (
            <div className="flex bg-app-bg p-1 rounded-xl border border-app-border">
              <button
                type="button"
                onClick={() => {
                  setEditAdvanceType('Give');
                  if (!editTxRemarks || editTxRemarks === 'Advance returned') setEditTxRemarks('Advance given');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  editAdvanceType === 'Give'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Give
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditAdvanceType('Return');
                  if (!editTxRemarks || editTxRemarks === 'Advance given') setEditTxRemarks('Advance returned');
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  editAdvanceType === 'Return'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-app-text-secondary hover:text-app-text-primary'
                }`}
              >
                Return
              </button>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Date</label>
            <CustomDatePicker
              value={editTxDate}
              onChange={(val) => setEditTxDate(val)}
              onOpenChange={setIsEditTxCalOpen}
              className="w-full"
              inline
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Amount</label>
            <input
              type="number"
              placeholder="₹"
              value={editTxAmount}
              onChange={(e) => setEditTxAmount(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-app-text-secondary uppercase">Remarks</label>
            <input
              type="text"
              placeholder={
                editTxType === 'Advance' 
                  ? (editAdvanceType === 'Give' ? 'e.g. Rent advance' : 'e.g. Returned back to office') 
                  : 'e.g. Uniform damage cost'
              }
              value={editTxRemarks}
              onChange={(e) => setEditTxRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary font-bold focus:outline-none focus:border-primary"
            />
          </div>
        </form>
      </CustomDialog>

      {/* Advance History Dialog */}
      <CustomDialog
        isOpen={isAdvHistoryOpen}
        onClose={() => setIsAdvHistoryOpen(false)}
        title={`Advance History - ${staff.name}`}
        bodyClass="max-h-[75vh]"
        actions={
          <>
            <button
              onClick={() => {
                setIsAdvHistoryOpen(false); // Close history first to prevent modal layering conflict
                setAmount('');
                setRemarks('');
                setTxDate(currentDate);
                setTxError('');
                setAdvanceType('Give');
                setIsAdvanceOpen(true);
              }}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95 mr-auto"
            >
              <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>add</span>
              <span>Advance</span>
            </button>
            <button
              onClick={() => setIsAdvHistoryOpen(false)}
              className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Close
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {/* All-time Stats Box */}
          <div className="grid grid-cols-3 gap-2 bg-app-bg p-3 rounded-xl border border-app-border/40 text-center select-none shrink-0">
            <div>
              <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">Total Outstanding</div>
              <div className="text-xs font-black text-rose-600 mt-1">₹{allTimeNet.toLocaleString('en-IN')}</div>
            </div>
            <div className="border-l border-app-border/40">
              <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">Total Given</div>
              <div className="text-xs font-black text-primary mt-1">₹{allTimeGiven.toLocaleString('en-IN')}</div>
            </div>
            <div className="border-l border-app-border/40">
              <div className="text-[9px] text-app-text-secondary uppercase font-bold tracking-wider">Total Returned</div>
              <div className="text-xs font-black text-emerald-600 mt-1">₹{allTimeReturned.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Scrollable list of all advances */}
          <div className="flex flex-col gap-1.5 max-h-[40vh] overflow-y-auto pr-1">
            {allStaffAdvances.length === 0 ? (
              <div className="text-center py-8 text-xs text-app-text-secondary font-medium">
                No advances recorded for this staff member.
              </div>
            ) : (
              allStaffAdvances.map((a) => {
                const isReturn = a.amount < 0;
                const displayAmount = Math.abs(a.amount);
                return (
                  <div 
                    key={a.id} 
                    className="flex items-center justify-between py-2 px-3 rounded-xl border border-app-border/10 bg-app-bg/30 hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-all duration-150 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isReturn 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : 'bg-primary/10 text-primary dark:bg-primary/20'
                      }`}>
                        <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>
                          {isReturn ? 'price_check' : 'wallet'}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold text-app-text-primary text-xs">
                          {isReturn ? 'Returned' : 'Given'}
                        </h4>
                        <p className="text-[10px] text-app-text-secondary group-hover:text-app-text-primary mt-0.5 transition-colors">
                          {format(parseISO(a.date), 'dd MMM yyyy')} • {a.remarks || (isReturn ? 'Advance returned' : 'Advance given')}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 font-bold text-xs ${isReturn ? 'text-emerald-600' : 'text-primary'}`}>
                      <span>{isReturn ? '-' : '+'}₹{displayAmount.toLocaleString('en-IN')}</span>
                      {/* Inline Actions */}
                      <div className="flex items-center gap-1.5 ml-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsAdvHistoryOpen(false);
                            handleOpenEditTx(a, 'Advance');
                          }}
                          className="w-5.5 h-5.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-app-text-secondary hover:text-app-text-primary flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <span className="material-symbols-rounded select-none" style={{ fontSize: '11px' }}>edit</span>
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const confirmed = await confirm('Are you sure you want to delete this advance entry?', {
                              title: 'Delete Advance Entry',
                              type: 'danger',
                              confirmText: 'Delete'
                            });
                            if (confirmed) {
                              deleteAdvance(a.id);
                            }
                          }}
                          className="w-5.5 h-5.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <span className="material-symbols-rounded select-none" style={{ fontSize: '11px' }}>delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CustomDialog>

      {/* Payout Dialog */}
      {isPayoutOpen && (
        <CustomDialog
          isOpen={isPayoutOpen}
          onClose={() => setIsPayoutOpen(false)}
          title={`Pay Salary`}
          actions={
            <>
              <button
                onClick={() => setIsPayoutOpen(false)}
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
            const targetYM = getYearMonthFromLabel(payoutMonth);
            const staffDetails = getSalaryDetailsForMonth(staff.id, targetYM, payoutMonth);
            const outstandingAdvance = getStaffOutstandingAdvance(staff.id);
            
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
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 border-0`}>
                    {staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-bold text-app-text-primary text-sm leading-none">
                      {staff.name}
                    </h4>
                    <p className="text-[10px] text-app-text-secondary font-semibold mt-1.5 leading-none">
                      Rate: ₹{staff.monthlySalary.toLocaleString('en-IN')}/{staff.salaryType === 'Monthly' ? 'mo' : 'day'}
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
                      options={getPayoutMonths(staff.id).options}
                      className="w-full"
                    />
                  </div>

                  {/* Payment Date */}
                  <div className="flex flex-col gap-1 bg-app-bg px-3.5 py-2.5 rounded-xl border border-app-border">
                    <label className="text-[9px] font-bold text-app-text-secondary uppercase tracking-widest leading-none">Payment Date (Today)</label>
                    <span className="text-xs font-black text-app-text-primary mt-1.5 leading-none">
                      {format(parseISO(currentDate), 'dd MMM yyyy')}
                    </span>
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
          staffId={staff.id}
          monthLabel={slipMonthLabel}
        />
      )}
    </div>
  );
};
