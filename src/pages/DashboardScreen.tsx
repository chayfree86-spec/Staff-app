import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { format, parseISO } from 'date-fns';

export const DashboardScreen: React.FC = () => {
  const {
    staffList,
    attendance,
    advanceList,
    deductionList,
    payoutList,
    addStaff,
    addAdvance,
    setScreen,
    setActiveStaffProfileId,
    currentDate,
  } = useStore();

  // Modal states
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // Form states - Add Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffMobile, setNewStaffMobile] = useState('');
  const [newStaffSalary, setNewStaffSalary] = useState('');
  const [newStaffSalaryType, setNewStaffSalaryType] = useState('Monthly');
  const [newStaffBasis, setNewStaffBasis] = useState('Attendance Based');

  // Form states - Add Advance
  const [advStaffId, setAdvStaffId] = useState('');
  const [advAmount, setAdvAmount] = useState('');
  const [advRemarks, setAdvRemarks] = useState('');

  // Form errors
  const [staffError, setStaffError] = useState('');
  const [advError, setAdvError] = useState('');

  // 1. Calculations
  const activeStaff = staffList.filter(s => s.status === 'Active');
  const totalStaffCount = activeStaff.length;

  const dayRecords = attendance[currentDate] || {};
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;

  activeStaff.forEach((staff) => {
    const status = dayRecords[staff.id]?.status;
    if (status === 'Present') presentCount++;
    else if (status === 'Absent') absentCount++;
    else if (status === 'Half Day') halfDayCount++;
  });

  const unmarkedCount = totalStaffCount - (presentCount + absentCount + halfDayCount);

  // Live Month Sum Calculations
  const currentYearMonth = currentDate.slice(0, 7); // YYYY-MM
  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const getSalaryDetails = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return { earned: 0, advance: 0, deduction: 0, net: 0, paid: 0, due: 0 };

    // 1. Earned Salary (Days * perDay)
    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr.startsWith(currentYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const perDayVal = staff.perDaySalary;
    const totalDaysCredited = daysPresent + (daysHalf * 0.5) + daysHoliday;
    const earned = Math.round(totalDaysCredited * perDayVal);

    const totalAdv = advanceList
      .filter(a => a.staffId === staffId && a.date.startsWith(currentYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);
      
    const deduction = deductionList
      .filter(d => d.staffId === staffId && d.date.startsWith(currentYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);

    const paid = payoutList
      .filter(p => p.staffId === staffId && p.month === currentMonthLabel)
      .reduce((sum, item) => sum + item.amount, 0);

    const net = Math.max(0, earned - totalAdv - deduction);
    const due = Math.max(0, net - paid);

    return {
      earned,
      advance: totalAdv,
      deduction,
      net,
      paid,
      due,
    };
  };

  const summaries = activeStaff.reduce(
    (acc, staff) => {
      const details = getSalaryDetails(staff.id);
      acc.totalEarned += details.earned;
      acc.totalPaid += details.paid;
      acc.totalDue += details.due;
      acc.totalAdvance += details.advance;
      acc.totalDeduction += details.deduction;
      return acc;
    },
    { totalEarned: 0, totalPaid: 0, totalDue: 0, totalAdvance: 0, totalDeduction: 0 }
  );

  const totalBaseSalary = activeStaff.reduce((sum, s) => sum + s.monthlySalary, 0);
  const lossOfPay = Math.max(0, totalBaseSalary - summaries.totalEarned);

  const advanceRecordsCount = advanceList.filter(a => a.date.startsWith(currentYearMonth)).length;
  const deductionRecordsCount = deductionList.filter(d => d.date.startsWith(currentYearMonth)).length;
  
  const daysInMonthCount = new Date(new Date(currentDate).getFullYear(), new Date(currentDate).getMonth() + 1, 0).getDate();
  const salaryCycleLabel = `1 to ${daysInMonthCount} ${format(parseISO(currentDate), 'MMMM')}`;

  // Design Mock Helper for roles
  const getStaffRole = (name: string) => {
    if (name.includes('Arjun')) return 'Manager';
    if (name.includes('Sunita')) return 'Server';
    if (name.includes('Ramesh') || name.includes('Kumar')) return 'Head Cook';
    if (name.includes('Imran')) return 'Barista';
    if (name.includes('Priya')) return 'Cashier';
    if (name.includes('Deepak')) return 'Delivery Boy';
    return 'Staff Member';
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

  // 2. Add actions
  const handleAddStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffMobile.trim() || !newStaffSalary.trim()) {
      setStaffError('Please fill in all fields.');
      return;
    }
    if (newStaffMobile.length < 10) {
      setStaffError('Mobile number must be at least 10 digits.');
      return;
    }
    setStaffError('');
    addStaff({
      name: newStaffName,
      mobile: newStaffMobile,
      monthlySalary: Number(newStaffSalary),
      salaryType: newStaffSalaryType as 'Monthly' | 'Daily',
      calculationBasis: newStaffBasis as 'Attendance Based' | 'Fixed Salary',
      joiningDate: new Date().toISOString().split('T')[0],
      status: 'Active',
    });
    // Reset form
    setNewStaffName('');
    setNewStaffMobile('');
    setNewStaffSalary('');
    setIsStaffModalOpen(false);
  };

  const handleAddAdvanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!advStaffId || !advAmount.trim()) {
      setAdvError('Please select staff and enter amount.');
      return;
    }
    setAdvError('');
    addAdvance(
      advStaffId,
      Number(advAmount),
      new Date().toISOString().split('T')[0],
      advRemarks || 'Advance Payment'
    );
    // Reset form
    setAdvStaffId('');
    setAdvAmount('');
    setAdvRemarks('');
    setIsAdvanceModalOpen(false);
  };

  const formattedDate = format(parseISO(currentDate), 'EEE, d MMMM yyyy');

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-24 animate-in fade-in duration-200 items-start w-full">
      
      {/* Left Column: Hero, Quick Actions, Today Status */}
      <div className="w-full lg:w-2/3 flex flex-col gap-6">
        
        {/* Main Hero Card - Double Bezel Architecture */}
        <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)] w-full">
          <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center">
            
            {/* Hero left content */}
            <div className="flex-1 flex flex-col justify-between gap-5">
              <div>
                <div className="rounded-full px-3 py-1 text-[9px] uppercase tracking-[0.2em] font-black bg-primary/10 text-primary w-max select-none">
                  {formattedDate}
                </div>
                <h2 className="text-2xl font-black text-app-text-primary tracking-tight mt-3 leading-tight">
                  Staff attendance and salary control
                </h2>
                <p className="text-[11px] font-semibold text-app-text-secondary mt-2 max-w-md leading-relaxed">
                  Review today attendance, salary earned, and pending advances from one working screen.
                </p>
              </div>
              
              {/* Quick stats row */}
              <div className="grid grid-cols-4 gap-2 pt-4 border-t border-app-border/60">
                <div>
                  <div className="text-base font-black text-app-text-primary">{totalStaffCount}</div>
                  <div className="text-[8px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Total staff</div>
                </div>
                <div>
                  <div className="text-base font-black text-present">{presentCount}</div>
                  <div className="text-[8px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Present</div>
                </div>
                <div>
                  <div className="text-base font-black text-absent">{absentCount}</div>
                  <div className="text-[8px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Absent</div>
                </div>
                <div>
                  <div className="text-base font-black text-halfday">{halfDayCount}</div>
                  <div className="text-[8px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">Half day</div>
                </div>
              </div>
            </div>
            
            {/* Hero right floating gradient card */}
            <div className="w-full md:w-60 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-5 text-white flex flex-col justify-between gap-6 shadow-lg shadow-indigo-500/10">
              <div>
                <div className="text-[9px] text-white/70 uppercase font-black tracking-wider">Net payable</div>
                <div className="text-3xl font-black mt-1">₹{summaries.totalDue.toLocaleString('en-IN')}</div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md px-3.5 py-2 rounded-xl text-[10px] font-bold text-center">
                {unmarkedCount > 0 ? `${unmarkedCount} staff still open for today` : 'All staff marked for today'}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Grid - Premium Double Bezel Style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Action 1 */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <button
              onClick={() => setScreen('attendance')}
              className="w-full flex items-center gap-4 p-4 bg-app-surface border border-app-border/40 rounded-[15px] hover:border-primary/20 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] text-left cursor-pointer group shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            >
              <div className="w-11 h-11 flex items-center justify-center bg-primary/10 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 shadow-sm">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>done_all</span>
              </div>
              <div>
                <h4 className="font-bold text-app-text-primary text-xs leading-none group-hover:text-primary transition-colors">Take attendance</h4>
                <p className="text-[10px] text-app-text-secondary mt-2 leading-normal">
                  Update present, absent, and half day status.
                </p>
              </div>
            </button>
          </div>

          {/* Action 2 */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <button
              onClick={() => setScreen('staff')}
              className="w-full flex items-center gap-4 p-4 bg-app-surface border border-app-border/40 rounded-[15px] hover:border-emerald-500/20 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] text-left cursor-pointer group shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            >
              <div className="w-11 h-11 flex items-center justify-center bg-emerald-500/10 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 shadow-sm">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>group</span>
              </div>
              <div>
                <h4 className="font-bold text-app-text-primary text-xs leading-none group-hover:text-emerald-600 transition-colors">Manage staff</h4>
                <p className="text-[10px] text-app-text-secondary mt-2 leading-normal">
                  View salary, phone, and staff profiles.
                </p>
              </div>
            </button>
          </div>

          {/* Action 3 */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <button
              onClick={() => setIsAdvanceModalOpen(true)}
              className="w-full flex items-center gap-4 p-4 bg-app-surface border border-app-border/40 rounded-[15px] hover:border-amber-500/20 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] text-left cursor-pointer group shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            >
              <div className="w-11 h-11 flex items-center justify-center bg-amber-500/10 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] shrink-0 shadow-sm">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>payments</span>
              </div>
              <div>
                <h4 className="font-bold text-app-text-primary text-xs leading-none group-hover:text-amber-500 transition-colors">Record advance</h4>
                <p className="text-[10px] text-app-text-secondary mt-2 leading-normal">
                  Track given and adjusted cash entries.
                </p>
              </div>
            </button>
          </div>
        </div>

        {/* Today Status Section */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.15em] select-none">
              Today status
            </h3>
            <button 
              onClick={() => setScreen('attendance')}
              className="text-xs font-bold text-primary hover:text-indigo-700 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              View all
            </button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {activeStaff.slice(0, 4).map((staff) => {
              const status = dayRecords[staff.id]?.status;
              const initials = staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
              return (
                <div
                  key={staff.id}
                  className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]"
                >
                  <div
                    onClick={() => {
                      setActiveStaffProfileId(staff.id);
                      setScreen('staff-profile');
                    }}
                    className="w-full h-full bg-app-surface border border-app-border/40 rounded-[15px] p-4 flex items-center justify-between sm:flex-col sm:items-start sm:gap-4 hover:border-primary/20 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer group shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0 border-0`}>
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-app-text-primary text-xs leading-none group-hover:text-primary transition-colors">{staff.name}</h4>
                        <p className="text-[9px] font-semibold text-app-text-secondary mt-1.5 leading-none">{getStaffRole(staff.name)}</p>
                      </div>
                    </div>
                    
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold ${
                      status === 'Present' ? 'bg-present/10 text-present border border-present/10' :
                      status === 'Absent' ? 'bg-absent/10 text-absent border border-absent/10' :
                      status === 'Half Day' ? 'bg-halfday/10 text-halfday border border-halfday/10' :
                      status === 'Holiday' ? 'bg-info/10 text-info border border-info/10' :
                      'bg-slate-50 border border-slate-200 dark:bg-slate-900/60 dark:border-slate-800 text-app-text-secondary'
                    }`}>
                      {status || 'Unmarked'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right Column: Salary Run & Next Checks */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6">
        
        {/* Salary Run Card - Double Bezel Architecture (Halved radius: 2rem -> 1rem, inner core: 26px -> 13px) */}
        <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1rem] p-1.5 shadow-sm">
          <div className="bg-app-surface border border-app-border/40 rounded-[13px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-app-text-primary tracking-tight">Salary run</h3>
                <p className="text-[9px] text-app-text-secondary font-bold uppercase tracking-wider mt-0.5">{salaryCycleLabel}</p>
              </div>
              
              <button
                onClick={() => setScreen('salary')}
                className="group/btn bg-gradient-to-r from-indigo-600 to-purple-500 text-white hover:opacity-95 pl-4.5 pr-2 py-2 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] cursor-pointer"
              >
                <span>Open</span>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform">
                  <span className="material-symbols-rounded text-xs select-none">arrow_outward</span>
                </div>
              </button>
            </div>
            
            <div className="flex flex-col gap-3 mt-1">
              {/* Total Base Salary Row */}
              <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>list_alt</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app-text-primary leading-tight">Total base salary</div>
                    <div className="text-[9px] text-app-text-secondary mt-0.5 uppercase tracking-wider">All staff monthly total</div>
                  </div>
                </div>
                <div className="text-sm font-black text-app-text-primary">₹{totalBaseSalary.toLocaleString('en-IN')}</div>
              </div>

              {/* Attendance Loss of Pay Row */}
              {lossOfPay > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>trending_down</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-app-text-primary leading-tight">Attendance loss</div>
                      <div className="text-[9px] text-app-text-secondary mt-0.5 uppercase tracking-wider">Unmarked & unpaid days</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-rose-600">-₹{lossOfPay.toLocaleString('en-IN')}</div>
                </div>
              )}

              {/* Earned Salary Row */}
              <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>payments</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-app-text-primary leading-tight">Earned salary</div>
                    <div className="text-[9px] text-app-text-secondary mt-0.5 uppercase tracking-wider">Current earned</div>
                  </div>
                </div>
                <div className="text-sm font-black text-emerald-600">₹{summaries.totalEarned.toLocaleString('en-IN')}</div>
              </div>

              {/* Advance Due Row */}
              {summaries.totalAdvance > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>account_balance_wallet</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-app-text-primary leading-tight">Advance adjusted</div>
                      <div className="text-[9px] text-app-text-secondary mt-0.5 uppercase tracking-wider">Deducted from earned</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-rose-600">-₹{summaries.totalAdvance.toLocaleString('en-IN')}</div>
                </div>
              )}

              {/* Deductions Row */}
              {summaries.totalDeduction > 0 && (
                <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                      <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>do_not_disturb_on</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-app-text-primary leading-tight">Deductions</div>
                      <div className="text-[9px] text-app-text-secondary mt-0.5 uppercase tracking-wider">Other fine & adjustments</div>
                    </div>
                  </div>
                  <div className="text-sm font-black text-rose-600">-₹{summaries.totalDeduction.toLocaleString('en-IN')}</div>
                </div>
              )}

              {/* Final Net Payable Card */}
              <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>done</span>
                  </div>
                  <div>
                    <div className="text-xs font-black leading-tight">Net payable (Due)</div>
                    <div className="text-[9px] text-white/80 mt-0.5 uppercase tracking-wider">Current payable</div>
                  </div>
                </div>
                <div className="text-base font-black">₹{summaries.totalDue.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Checks Card - Double Bezel Architecture (Halved radius: 2rem -> 1rem, inner core: 26px -> 13px) */}
        <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1rem] p-1.5 shadow-sm">
          <div className="bg-app-surface border border-app-border/40 rounded-[13px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
            <h3 className="text-sm font-bold text-app-text-primary tracking-tight">Next checks</h3>
            
            <div className="flex flex-col gap-3">
              {/* Advance entries check */}
              <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl text-xs">
                <span className="font-semibold text-app-text-secondary">Advance entries</span>
                <span className="font-bold text-app-text-primary">{advanceRecordsCount} records</span>
              </div>

              {/* Salary cycle check */}
              <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl text-xs">
                <span className="font-semibold text-app-text-secondary">Salary cycle</span>
                <span className="font-bold text-app-text-primary">{salaryCycleLabel}</span>
              </div>

              {/* Pending deductions check */}
              <div className="flex items-center justify-between p-3.5 bg-app-bg border border-app-border rounded-xl text-xs">
                <span className="font-semibold text-app-text-secondary">Pending deductions</span>
                <span className="font-bold text-app-text-primary">{deductionRecordsCount} entries</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 4. MODALS */}
      {/* Add Staff Modal */}
      {isStaffModalOpen && (
        <CustomDialog
          isOpen={isStaffModalOpen}
          onClose={() => setIsStaffModalOpen(false)}
          title="Add New Staff Member"
          actions={
            <>
              <button
                onClick={() => setIsStaffModalOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaffSubmit}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm"
              >
                Add Staff
              </button>
            </>
          }
        >
          <form onSubmit={handleAddStaffSubmit} className="flex flex-col gap-4">
            {staffError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {staffError}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Name</label>
              <input
                type="text"
                placeholder="e.g. Rahul Sharma"
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Mobile Number</label>
              <input
                type="tel"
                placeholder="10-digit mobile number"
                value={newStaffMobile}
                onChange={(e) => setNewStaffMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <CustomSelect
                label="Salary Type"
                value={newStaffSalaryType}
                onChange={setNewStaffSalaryType}
                options={[
                  { value: 'Monthly', label: 'Monthly' },
                  { value: 'Daily', label: 'Daily' },
                ]}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Salary Amount</label>
                <input
                  type="number"
                  placeholder="₹"
                  value={newStaffSalary}
                  onChange={(e) => setNewStaffSalary(e.target.value)}
                  className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary no-spinners transition-all font-semibold"
                />
              </div>
            </div>

            <CustomSelect
              label="Salary Calculation Basis"
              value={newStaffBasis}
              onChange={setNewStaffBasis}
              options={[
                { value: 'Attendance Based', label: 'Attendance Based' },
                { value: 'Fixed Salary', label: 'Fixed Salary' },
              ]}
            />
          </form>
        </CustomDialog>
      )}

      {/* Add Advance Modal */}
      {isAdvanceModalOpen && (
        <CustomDialog
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          title="Record Staff Advance"
          actions={
            <>
              <button
                onClick={() => setIsAdvanceModalOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAdvanceSubmit}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer shadow-sm"
              >
                Give Advance
              </button>
            </>
          }
        >
          <form onSubmit={handleAddAdvanceSubmit} className="flex flex-col gap-4">
            {advError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-app-card text-xs border border-red-200">
                {advError}
              </div>
            )}
            
            <CustomSelect
              label="Select Staff"
              value={advStaffId}
              onChange={setAdvStaffId}
              options={activeStaff.map(s => ({ value: s.id, label: s.name }))}
              placeholder="Choose staff member"
            />

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Advance Amount</label>
              <input
                type="number"
                placeholder="₹"
                value={advAmount}
                onChange={(e) => setAdvAmount(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary no-spinners transition-all font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Remarks (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Festival advance"
                value={advRemarks}
                onChange={(e) => setAdvRemarks(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-semibold"
              />
            </div>
          </form>
        </CustomDialog>
      )}
    </div>
  );
};
