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
    setScreen,
    setActiveStaffProfileId,
    currentDate,
    currentUser,
    setIsAddStaffModalOpen,
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
      return acc;
    },
    { totalEarned: 0, totalPaid: 0, totalDue: 0 }
  );

  const totalBaseSalary = activeStaff.reduce((sum, s) => {
    if (s.salaryType === 'Monthly') {
      return sum + s.monthlySalary;
    } else {
      return sum + (s.monthlySalary * 30);
    }
  }, 0);

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
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200 max-w-2xl mx-auto w-full">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-black text-app-text-primary tracking-tight flex items-center gap-1.5">
          {greeting}, {firstName} <span>👋</span>
        </h2>
        <p className="text-xs font-semibold text-app-text-secondary mt-1">Here's what's happening today</p>
      </div>

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

      {/* Stats Grid 2x2 */}
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

      {/* Month Salary Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[1.5rem] p-5 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
        <span className="material-symbols-rounded select-none absolute -right-3 -bottom-3 text-white/10" style={{ fontSize: '110px' }}>currency_rupee</span>
        
        <div className="relative z-10 flex flex-col gap-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <span className="material-symbols-rounded text-base select-none">calendar_today</span>
              </div>
              <span className="text-xs font-black uppercase tracking-wider">{currentMonthLabel} Salary Details</span>
            </div>
          </div>

          {/* Grid details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] uppercase font-black text-white/70 tracking-wider">Total Base Salary</span>
              <span className="text-lg font-black leading-tight">₹{totalBaseSalary.toLocaleString('en-IN')}</span>
              <span className="text-[7.5px] text-white/50 font-bold">(Full Month Potential)</span>
            </div>
            
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] uppercase font-black text-emerald-300 tracking-wider">Earned So Far</span>
              <span className="text-lg font-black leading-tight text-emerald-250">₹{summaries.totalEarned.toLocaleString('en-IN')}</span>
              <span className="text-[7.5px] text-emerald-300/60 font-bold">(Attendance Based)</span>
            </div>
          </div>
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
      </div>    </div>
  );
};
