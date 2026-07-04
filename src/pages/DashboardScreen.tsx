import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { CustomDialog } from '../components/ui/CustomDialog';
import { CustomSelect } from '../components/ui/CustomSelect';
import { format, parseISO } from 'date-fns';
import { listBusinessesRequest } from '../api/client';

export const DashboardScreen: React.FC = () => {
  const {
    staffList,
    attendance,
    advanceList,
    deductionList,
    payoutList,
    setScreen,
    setActiveStaffProfileId,
    currentDate,
    currentUser,
    setIsAddStaffModalOpen,
    businessInfo,
  } = useStore();

  // 1. Today's attendance counts
  const activeStaff = staffList.filter((s) => s.status === 'Active');
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

  const pct = (count: number) => (totalStaffCount > 0 ? Math.round((count / totalStaffCount) * 100) : 0);

  // 2. This month's salary summary
  const currentYearMonth = currentDate.slice(0, 7); // YYYY-MM
  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const getSalaryDetails = (staffId: string) => {
    const staff = staffList.find((s) => s.id === staffId);
    if (!staff) return { earned: 0, paid: 0, due: 0 };

    let daysPresent = 0;
    let daysHalf = 0;
    let daysHoliday = 0;

    Object.entries(attendance).forEach(([dateStr, record]) => {
      if (dateStr > currentDate) return;
      if (dateStr.startsWith(currentYearMonth) && record[staffId]) {
        const status = record[staffId].status;
        if (status === 'Present') daysPresent++;
        if (status === 'Half Day') daysHalf++;
        if (status === 'Holiday') daysHoliday++;
      }
    });

    const totalDaysCredited = daysPresent + daysHalf * 0.5 + daysHoliday;
    const earned = Math.round(totalDaysCredited * staff.perDaySalary);

    const totalAdv = advanceList
      .filter((a) => a.staffId === staffId && a.date.startsWith(currentYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);

    const deduction = deductionList
      .filter((d) => d.staffId === staffId && d.date.startsWith(currentYearMonth))
      .reduce((sum, item) => sum + item.amount, 0);

    const paid = payoutList
      .filter((p) => p.staffId === staffId && p.month === currentMonthLabel)
      .reduce((sum, item) => sum + item.amount, 0);

    const net = Math.max(0, earned - totalAdv - deduction);
    const due = Math.max(0, net - paid);

    return { earned, paid, due };
  };

  const summaries = activeStaff.reduce(
    (acc, staff) => {
      const details = getSalaryDetails(staff.id);
      acc.totalEarned += details.earned;
      acc.totalPaid += details.paid;
      acc.totalDue += details.due;
      
      const totalAdv = advanceList
        .filter((a) => a.staffId === staff.id && a.date.startsWith(currentYearMonth))
        .reduce((sum, item) => sum + item.amount, 0);

      const totalDed = deductionList
        .filter((d) => d.staffId === staff.id && d.date.startsWith(currentYearMonth))
        .reduce((sum, item) => sum + item.amount, 0);

      acc.totalAdvance += totalAdv;
      acc.totalDeduction += totalDed;
      return acc;
    },
    { totalEarned: 0, totalPaid: 0, totalDue: 0, totalAdvance: 0, totalDeduction: 0 }
  );

  const totalBaseSalary = activeStaff.reduce((sum, s) => {
    if (s.salaryType === 'Monthly') {
      return sum + s.monthlySalary;
    } else {
      return sum + (s.monthlySalary * 30);
    }
  }, 0);

  const getStaffOutstandingAdvance = (staffId: string) => {
    return advanceList
      .filter((a) => a.staffId === staffId)
      .reduce((sum, item) => sum + item.amount, 0);
  };

  const staffWithOutstandingAdvances = activeStaff
    .map((s) => ({
      ...s,
      outstanding: getStaffOutstandingAdvance(s.id),
    }))
    .filter((s) => s.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 4);

  const recentPayoutsList = [...payoutList]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  const [businessesList, setBusinessesList] = useState<any[]>([]);
  useEffect(() => {
    listBusinessesRequest()
      .then(({ businesses }) => {
        setBusinessesList(businesses || []);
      })
      .catch(() => {});
  }, []);

  // 3. Recent attendance (today's marked entries, most recent first)
  const recentAttendance = Object.entries(dayRecords)
    .map(([staffId, record]) => ({ staff: staffList.find((s) => s.id === staffId), record }))
    .filter((entry): entry is { staff: NonNullable<typeof entry.staff>; record: typeof entry.record } => !!entry.staff)
    .sort((a, b) => b.record.timestamp.localeCompare(a.record.timestamp))
    .slice(0, 5);

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

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  })();
  const firstName = (currentUser?.name || '').trim().split(' ')[0] || 'there';

  const formattedDate = format(parseISO(currentDate), 'd MMM yyyy');

  const quickActions = [
    {
      icon: 'person_add',
      label: 'Add Staff',
      color: 'primary',
      onClick: () => {
        setScreen('staff');
        setIsAddStaffModalOpen(true);
      }
    },
    { icon: 'event_available', label: 'Mark Attendance', color: 'emerald', onClick: () => setScreen('attendance') },
    { icon: 'assignment', label: 'Attendance Report', color: 'blue', onClick: () => setScreen('reports') },
    { icon: 'account_balance_wallet', label: 'Salary Management', color: 'amber', onClick: () => setScreen('salary') },
    { icon: 'settings', label: 'Settings', color: 'violet', onClick: () => setScreen('settings') },
  ] as const;

  const actionColorClasses: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };



  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200 w-full max-w-2xl lg:max-w-none mx-auto lg:px-6 px-4">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-black text-app-text-primary tracking-tight flex items-center gap-1.5">
          {greeting}, {firstName} <span>👋</span>
        </h2>
        <p className="text-xs font-semibold text-app-text-secondary mt-1">Here's what's happening today</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start w-full">
        {/* Column 1: Today's Summary & Financial Details */}
        <div className="flex flex-col gap-5 w-full">
          {/* Today's Summary - purple hero card */}
          <div className="bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-600 rounded-[1.5rem] p-5 text-white shadow-lg shadow-indigo-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>calendar_today</span>
                </div>
                <h3 className="text-sm font-black tracking-tight">Today's Summary</h3>
              </div>
              <div className="flex items-center gap-1 bg-white/15 rounded-full px-3 py-1.5 text-[11px] font-bold">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>event</span>
                <span>{formattedDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-5">
              <div>
                <div className="text-[9px] uppercase font-bold text-white/70 tracking-wider">Total Staff</div>
                <div className="text-xl font-black mt-1 flex items-center gap-1">
                  {totalStaffCount}
                  <span className="material-symbols-rounded select-none text-white/60" style={{ fontSize: '14px' }}>group</span>
                </div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-white/70 tracking-wider">Present</div>
                <div className="text-xl font-black mt-1">{presentCount}</div>
                <div className="text-[9px] font-bold text-emerald-300 mt-0.5">{pct(presentCount)}%</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-white/70 tracking-wider">Absent</div>
                <div className="text-xl font-black mt-1">{absentCount}</div>
                <div className="text-[9px] font-bold text-rose-300 mt-0.5">{pct(absentCount)}%</div>
              </div>
              <div>
                <div className="text-[9px] uppercase font-bold text-white/70 tracking-wider">Half Day</div>
                <div className="text-xl font-black mt-1">{halfDayCount}</div>
                <div className="text-[9px] font-bold text-amber-300 mt-0.5">{pct(halfDayCount)}%</div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-5 gap-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.onClick}
                className="flex flex-col items-center gap-2 p-3 bg-app-surface border border-app-border rounded-2xl hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${actionColorClasses[action.color]}`}>
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>{action.icon}</span>
                </div>
                <span className="text-[8.5px] font-bold text-app-text-secondary text-center leading-tight">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Section Header */}
          <div className="flex items-center gap-2 px-1">
            <span className="material-symbols-rounded text-sm text-app-text-secondary select-none">calendar_today</span>
            <span className="text-[10px] font-black uppercase text-app-text-secondary tracking-widest">{currentMonthLabel} Salary Details</span>
          </div>

          {/* Base Salary & Earned So Far Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Base Salary Card */}
            <div className="flex items-center gap-3 p-4 bg-app-surface border border-app-border rounded-[1.5rem] shadow-sm relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>account_balance_wallet</span>
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] uppercase font-black text-app-text-secondary tracking-wider block">Total Base Salary</span>
                <span className="text-base font-black text-app-text-primary mt-0.5 block leading-tight">₹{totalBaseSalary.toLocaleString('en-IN')}</span>
                <span className="text-[8px] font-bold text-app-text-secondary/60 mt-0.5 block">(Full Month Potential)</span>
              </div>
            </div>

            {/* Earned So Far Card */}
            <div className="flex items-center gap-3 p-4 bg-app-surface border border-app-border rounded-[1.5rem] shadow-sm relative overflow-hidden group">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>trending_up</span>
              </div>
              <div className="overflow-hidden">
                <span className="text-[9px] uppercase font-black text-app-text-secondary tracking-wider block">Earned So Far</span>
                <span className="text-base font-black text-app-text-primary mt-0.5 block leading-tight">₹{summaries.totalEarned.toLocaleString('en-IN')}</span>
                <span className="text-[8px] font-bold text-emerald-500 mt-0.5 block">(Attendance Based)</span>
              </div>
            </div>
          </div>

          {/* Interactive Financial Filter Cards */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScreen('advance-history')}
              className="flex items-center justify-between p-4 bg-app-surface border border-app-border rounded-[1.5rem] shadow-sm hover:border-amber-500/30 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer text-left w-full group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>payments</span>
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] uppercase font-black text-app-text-secondary tracking-wider block">Total Advance</span>
                  <span className="text-base font-black text-app-text-primary mt-0.5 block leading-tight">₹{summaries.totalAdvance.toLocaleString('en-IN')}</span>
                  <span className="text-[8px] font-bold text-amber-500 mt-0.5 block">(Advance Given)</span>
                </div>
              </div>
              <span className="material-symbols-rounded text-app-text-secondary/40 group-hover:text-amber-500/70 transition-colors select-none shrink-0" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>

            <button
              onClick={() => setScreen('deduction-history')}
              className="flex items-center justify-between p-4 bg-app-surface border border-app-border rounded-[1.5rem] shadow-sm hover:border-rose-500/30 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer text-left w-full group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>content_cut</span>
                </div>
                <div className="overflow-hidden">
                  <span className="text-[9px] uppercase font-black text-app-text-secondary tracking-wider block">Total Deduction</span>
                  <span className="text-base font-black text-app-text-primary mt-0.5 block leading-tight">₹{summaries.totalDeduction.toLocaleString('en-IN')}</span>
                  <span className="text-[8px] font-bold text-rose-500 mt-0.5 block">(Deductions Logged)</span>
                </div>
              </div>
              <span className="material-symbols-rounded text-app-text-secondary/40 group-hover:text-rose-500/70 transition-colors select-none shrink-0" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </div>

        {/* Column 2: Stats & Today's Attendance */}
        <div className="flex flex-col gap-5 w-full">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-present/10 text-present flex items-center justify-center mb-2">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>check_circle</span>
              </div>
              <div className="text-xl font-black text-app-text-primary">{presentCount}</div>
              <div className="text-[10px] font-bold text-app-text-secondary mt-0.5">Present <span className="text-present">{pct(presentCount)}%</span></div>
            </div>
            <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-absent/10 text-absent flex items-center justify-center mb-2">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>cancel</span>
              </div>
              <div className="text-xl font-black text-app-text-primary">{absentCount}</div>
              <div className="text-[10px] font-bold text-app-text-secondary mt-0.5">Absent <span className="text-absent">{pct(absentCount)}%</span></div>
            </div>
            <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-halfday/10 text-halfday flex items-center justify-center mb-2">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>schedule</span>
              </div>
              <div className="text-xl font-black text-app-text-primary">{halfDayCount}</div>
              <div className="text-[10px] font-bold text-app-text-secondary mt-0.5">Half Day <span className="text-halfday">{pct(halfDayCount)}%</span></div>
            </div>
            <div className="bg-app-surface border border-app-border rounded-2xl p-4 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>group</span>
              </div>
              <div className="text-xl font-black text-app-text-primary">{totalStaffCount}</div>
              <div className="text-[10px] font-bold text-app-text-secondary mt-0.5">Total Staff</div>
            </div>
          </div>

          {/* Recent Attendance */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-app-text-primary tracking-tight">Recent Attendance</h3>
              <button
                onClick={() => setScreen('attendance')}
                className="text-xs font-bold text-primary hover:text-indigo-700 transition-colors flex items-center gap-0.5 cursor-pointer"
              >
                View All
                <span className="material-symbols-rounded select-none" style={{ fontSize: '14px' }}>chevron_right</span>
              </button>
            </div>

            <div className="bg-app-surface border border-app-border rounded-2xl divide-y divide-app-border/60 shadow-sm overflow-hidden">
              {recentAttendance.length === 0 && (
                <div className="p-6 text-center text-xs font-semibold text-app-text-secondary">
                  No attendance marked for today yet.
                </div>
              )}
              {recentAttendance.map(({ staff, record }) => {
                const initials = staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const statusClasses =
                  record.status === 'Present' ? 'bg-present/10 text-present' :
                  record.status === 'Absent' ? 'bg-absent/10 text-absent' :
                  record.status === 'Half Day' ? 'bg-halfday/10 text-halfday' :
                  record.status === 'Holiday' ? 'bg-info/10 text-info' :
                  'bg-slate-100 dark:bg-slate-800 text-app-text-secondary';
                return (
                  <div
                    key={staff.id}
                    onClick={() => {
                      setActiveStaffProfileId(staff.id);
                      setScreen('staff-profile');
                    }}
                    className="flex items-center justify-between gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-xs flex items-center justify-center shrink-0`}>
                        {initials}
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-app-text-primary text-xs truncate">{staff.name}</h4>
                        <p className="text-[10px] text-app-text-secondary font-semibold mt-0.5">
                          {format(parseISO(record.timestamp), 'hh:mm a')}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${statusClasses}`}>
                      {record.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Outstanding Advances & Recent Activity */}
        <div className="flex flex-col gap-5 w-full">
          {/* Outstanding Advances Panel */}
          <div className="bg-app-surface border border-app-border rounded-[1.5rem] p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>warning</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-app-text-primary tracking-tight">Outstanding Advances</h3>
                <span className="text-[9px] font-bold text-app-text-secondary uppercase tracking-widest">{staffWithOutstandingAdvances.length} staff pending</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {staffWithOutstandingAdvances.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-app-text-secondary">
                  No outstanding advances.
                </div>
              ) : (
                staffWithOutstandingAdvances.map((staff) => {
                  const initials = staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={staff.id}
                      onClick={() => {
                        setActiveStaffProfileId(staff.id);
                        setScreen('staff-profile');
                      }}
                      className="flex items-center justify-between gap-3 p-3 bg-app-bg border border-app-border/40 rounded-2xl hover:border-amber-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white font-black text-[10px] flex items-center justify-center shrink-0`}>
                          {initials}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-app-text-primary text-xs truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{staff.name}</h4>
                          <p className="text-[9px] text-app-text-secondary font-semibold mt-0.5">Click to view details</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-rose-500 bg-rose-500/10 px-2.5 py-1 rounded-full shrink-0">
                        ₹{staff.outstanding.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Recent Payouts Panel */}
          <div className="bg-app-surface border border-app-border rounded-[1.5rem] p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>receipt_long</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-app-text-primary tracking-tight">Recent Payouts</h3>
                <span className="text-[9px] font-bold text-app-text-secondary uppercase tracking-widest">Last 4 transactions</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {recentPayoutsList.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-app-text-secondary">
                  No payouts recorded yet.
                </div>
              ) : (
                recentPayoutsList.map((payout) => {
                  const staffName = staffList.find(s => s.id === payout.staffId)?.name || 'Former Staff';
                  const initials = staffName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                  const payoutDateFormatted = format(parseISO(payout.date), 'dd MMM');
                  return (
                    <div
                      key={payout.id}
                      onClick={() => {
                        if (payout.staffId) {
                          setActiveStaffProfileId(payout.staffId);
                          setScreen('staff-profile');
                        }
                      }}
                      className="flex items-center justify-between gap-3 p-3 bg-app-bg border border-app-border/40 rounded-2xl hover:border-emerald-500/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getProfileGradient(staffName)} text-white font-black text-[10px] flex items-center justify-center shrink-0`}>
                          {initials}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-app-text-primary text-xs truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{staffName}</h4>
                          <p className="text-[9px] text-app-text-secondary font-semibold mt-0.5">{payout.paymentMode || 'Cash'} • {payoutDateFormatted}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full shrink-0">
                        ₹{payout.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* My Businesses Panel */}
          <div className="bg-app-surface border border-app-border rounded-[1.5rem] p-5 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <span className="material-symbols-rounded select-none" style={{ fontSize: '18px' }}>corporate_fare</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-app-text-primary tracking-tight">My Businesses</h3>
                  <span className="text-[9px] font-bold text-app-text-secondary uppercase tracking-widest">{businessesList.length} registered</span>
                </div>
              </div>
              <button
                onClick={() => setScreen('businesses')}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                Manage
                <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>chevron_right</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {businessesList.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-app-text-secondary">
                  Loading businesses...
                </div>
              ) : (
                businessesList.map((biz) => {
                  const isCurrent = biz.name === businessInfo.name;
                  const initials = biz.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div
                      key={biz.id}
                      onClick={() => setScreen('businesses')}
                      className={`flex items-center justify-between gap-3 p-3 bg-app-bg border rounded-2xl transition-all cursor-pointer group ${
                        isCurrent 
                          ? 'border-indigo-500/30 ring-1 ring-indigo-500/10' 
                          : 'border-app-border/40 hover:border-indigo-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        {biz.logoUrl ? (
                          <img
                            src={biz.logoUrl}
                            alt={biz.name}
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getProfileGradient(biz.name)} text-white font-black text-[10px] flex items-center justify-center shrink-0`}>
                            {initials}
                          </div>
                        )}
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-app-text-primary text-xs truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{biz.name}</h4>
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/25 shrink-0" title="Current Active Business" />
                            )}
                          </div>
                          <p className="text-[9px] text-app-text-secondary font-semibold mt-0.5">{biz.mobile || 'No mobile'} • {biz.address || 'No address'}</p>
                        </div>
                      </div>
                      <span className="material-symbols-rounded text-app-text-secondary/40 group-hover:text-indigo-500/70 transition-colors select-none shrink-0" style={{ fontSize: '16px' }}>chevron_right</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
