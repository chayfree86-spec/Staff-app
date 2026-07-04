import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { AttendanceScreen } from '../pages/AttendanceScreen';
import { DashboardScreen } from '../pages/DashboardScreen';
import { StaffScreen } from '../pages/StaffScreen';
import { StaffProfileScreen } from '../pages/StaffProfileScreen';
import { SalaryScreen } from '../pages/SalaryScreen';
import { MoreScreen } from '../pages/MoreScreen';
import { AdvanceScreen } from '../pages/AdvanceScreen';
import { DeductionScreen } from '../pages/DeductionScreen';
import { ReportsScreen } from '../pages/ReportsScreen';
import { BusinessScreen } from '../pages/BusinessScreen';
import { SettingsScreen } from '../pages/SettingsScreen';
import { CreateBusinessScreen } from '../pages/CreateBusinessScreen';
import { BusinessesScreen } from '../pages/BusinessesScreen';
import { AdvanceHistoryScreen } from '../pages/AdvanceHistoryScreen';
import { DeductionHistoryScreen } from '../pages/DeductionHistoryScreen';
import { CustomDialog } from './ui/CustomDialog';
import { format, parseISO } from 'date-fns';
import { InteractiveGridBackground } from './InteractiveGridBackground';

export const Layout: React.FC = () => {
  const {
    currentScreen,
    setScreen,
    businessInfo,
    currentDate,
    settings,
    staffList,
    attendance,
    advanceList,
    deductionList,
    payoutList,
    changePassword,
    logout
  } = useStore();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [oldPassInput, setOldPassInput] = useState('');
  const [newPassInput, setNewPassInput] = useState('');
  const [confirmPassInput, setConfirmPassInput] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassInput || !newPassInput || !confirmPassInput) {
      setChangePassError('Please fill in all fields.');
      return;
    }
    if (newPassInput.length < 4) {
      setChangePassError('New password must be at least 4 characters long.');
      return;
    }
    if (newPassInput !== confirmPassInput) {
      setChangePassError('Passwords do not match.');
      return;
    }

    try {
      await changePassword(oldPassInput, newPassInput);
    } catch (error) {
      setChangePassError(error instanceof Error ? error.message : 'Failed to change password.');
      return;
    }

    setChangePassError('');
    setChangePassSuccess('Password changed successfully.');
    setOldPassInput('');
    setNewPassInput('');
    setConfirmPassInput('');

    setTimeout(() => {
      setChangePassSuccess('');
      setIsChangePassOpen(false);
    }, 1500);
  };

  // Handle Theme application
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = (themeMode: 'light' | 'dark' | 'system') => {
      root.classList.remove('light', 'dark');
      if (themeMode === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(themeMode);
      }
    };

    applyTheme(settings.theme);

    // If theme is 'system', listen for changes
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [settings.theme]);

  // Render active screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'attendance':
        return <AttendanceScreen />;
      case 'dashboard':
        return <DashboardScreen />;
      case 'staff':
        return <StaffScreen />;
      case 'staff-profile':
        return <StaffProfileScreen />;
      case 'salary':
        return <SalaryScreen />;
      case 'more':
        return <MoreScreen />;
      case 'advance':
        return <AdvanceScreen />;
      case 'deduction':
        return <DeductionScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'business':
        return <BusinessScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'create-business':
        return <CreateBusinessScreen />;
      case 'businesses':
        return <BusinessesScreen />;
      case 'advance-history':
        return <AdvanceHistoryScreen />;
      case 'deduction-history':
        return <DeductionHistoryScreen />;
      default:
        return <AttendanceScreen />;
    }
  };

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'attendance':
        return 'Staff Attendance';
      case 'dashboard':
        return 'Dashboard';
      case 'staff':
        return 'Staff Directory';
      case 'staff-profile':
        return 'Staff Profile';
      case 'salary':
        return 'Salary payouts';
      case 'more':
        return 'More Features';
      case 'advance':
        return 'Advance Ledger';
      case 'deduction':
        return 'Deduction Ledger';
      case 'reports':
        return 'Reports Generator';
      case 'business':
        return 'Business Details';
      case 'settings':
        return 'Settings';
      case 'create-business':
        return 'New Business';
      case 'businesses':
        return 'Businesses & Users';
      case 'advance-history':
        return 'Advance History';
      case 'deduction-history':
        return 'Deduction History';
      default:
        return 'Staff Attendance';
    }
  };

  // Live Summary Stats for Header
  const activeStaff = staffList.filter(s => s.status === 'Active');
  const totalStaffCount = activeStaff.length;
  const currentYearMonth = currentDate.slice(0, 7); // YYYY-MM
  const currentMonthLabel = format(parseISO(currentDate), 'MMMM yyyy');

  const getSalaryDetails = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return { due: 0 };

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

    return { due };
  };

  const totalDueSalary = activeStaff.reduce(
    (sum, staff) => sum + getSalaryDetails(staff.id).due,
    0
  );

  const businessInitials = businessInfo.name
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CS';

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: 'home' },
    { id: 'staff', label: 'Staff', icon: 'group' },
    { id: 'attendance', label: 'Attendance', icon: 'event_available' },
    { id: 'salary', label: 'Salary', icon: 'payments' },
    { id: 'more', label: 'More', icon: 'grid_view' },
  ];

  const isTabActive = (tabId: string) => {
    if (tabId === 'dashboard') return currentScreen === 'dashboard';
    if (tabId === 'staff') return currentScreen === 'staff' || currentScreen === 'staff-profile';
    if (tabId === 'attendance') return currentScreen === 'attendance';
    if (tabId === 'salary') return currentScreen === 'salary';
    if (tabId === 'more') return ['more', 'advance', 'deduction', 'reports', 'business', 'settings', 'create-business', 'businesses', 'advance-history', 'deduction-history'].includes(currentScreen);
    return false;
  };

  return (
    <div className="min-h-[100dvh] bg-app-bg text-app-text-primary flex flex-col w-full bg-grid-dots relative overflow-hidden">
      <InteractiveGridBackground />
      
      {/* Top Header Sticky bar */}
      <header className="sticky top-0 bg-app-surface/80 backdrop-blur-md border-b border-app-border z-40 w-full shadow-sm">
        <div className="w-full px-6 py-3 flex items-center justify-between">
          {/* Logo + Business Name + Screen Subtitle */}
          <div className="flex items-center gap-3">
            {businessInfo.logo ? (
              <img
                src={businessInfo.logo}
                alt="Business Logo"
                className="w-10 h-10 rounded-full object-cover shadow-md border border-app-border"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-indigo-500/20">
                {businessInitials}
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-app-text-primary tracking-tight leading-none">
                {businessInfo.name}
              </h1>
              <p className="text-[10px] font-bold text-app-text-secondary uppercase tracking-[0.15em] mt-1.5 select-none">
                {getScreenTitle()}
              </p>
            </div>
          </div>

          {/* Right Side: Profile Menu */}
          <div className="relative select-none">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-xs shadow-md border-2 border-app-border hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              AD
            </button>

            {/* Profile Dropdown Popup */}
            {showProfileMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2.5 w-48 bg-app-surface border border-app-border rounded-2xl shadow-xl p-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="px-3 py-2 border-b border-app-border/40 mb-1">
                    <div className="text-xs font-black text-app-text-primary">Administrator</div>
                    <div className="text-[9px] font-bold text-app-text-secondary mt-0.5">Manager Account</div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setScreen('business');
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-bold text-app-text-primary flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-sm text-app-text-secondary">store</span>
                    <span>Manage Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setChangePassError('');
                      setChangePassSuccess('');
                      setIsChangePassOpen(true);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl text-xs font-bold text-app-text-primary flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-sm text-app-text-secondary">lock</span>
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs font-bold text-rose-600 flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-rounded text-sm">logout</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable Page Body */}
      <main className="flex-1 w-full p-6 overflow-y-auto relative z-10">
        {renderScreen()}
      </main>

      {/* PWA Fixed Bottom Menu Navigation - Attendance is always the raised center FAB */}
      <nav className="fixed bottom-0 left-0 right-0 bg-app-surface/95 backdrop-blur-md border-t border-app-border pb-safe pt-2.5 px-6 z-40 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] select-none">
        <div className="w-full flex items-end justify-between gap-1 max-w-4xl mx-auto">
          {navItems.map((item) => {
            const active = isTabActive(item.id);

            if (item.id === 'attendance') {
              return (
                <button
                  key={item.id}
                  onClick={() => setScreen(item.id as any)}
                  className="flex flex-col items-center gap-2.5 -mt-7 shrink-0 cursor-pointer active:scale-95 transition-transform duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#A855F7] to-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 border-[3px] border-app-surface">
                    <span className="material-symbols-rounded select-none text-2xl leading-none">
                      {item.icon}
                    </span>
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${active ? 'text-primary' : 'text-app-text-secondary'}`}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as any)}
                className={`flex flex-col items-center gap-1 py-1 flex-1 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96] cursor-pointer ${
                  active ? 'text-primary' : 'text-app-text-secondary hover:text-primary'
                }`}
              >
                <span className="material-symbols-rounded select-none text-xl leading-none">
                  {item.icon}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider leading-none">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Change Password Dialog */}
      {isChangePassOpen && (
        <CustomDialog
          isOpen={isChangePassOpen}
          onClose={() => setIsChangePassOpen(false)}
          title="Change Password"
          actions={
            <>
              <button
                onClick={() => setIsChangePassOpen(false)}
                className="px-4 py-2 bg-app-bg border border-app-border text-app-text-secondary hover:text-app-text-primary rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePasswordSubmit}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-primary/10"
              >
                Update Password
              </button>
            </>
          }
        >
          <form onSubmit={handleChangePasswordSubmit} className="flex flex-col gap-4">
            {changePassError && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/20 text-red-500 rounded-xl text-xs border border-red-200">
                {changePassError}
              </div>
            )}
            {changePassSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs border border-emerald-200">
                {changePassSuccess}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Current Password</label>
              <input
                type="password"
                placeholder="Enter current password"
                value={oldPassInput}
                onChange={(e) => setOldPassInput(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary focus:outline-none focus:border-primary transition-all font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">New Password</label>
              <input
                type="password"
                placeholder="At least 4 characters"
                value={newPassInput}
                onChange={(e) => setNewPassInput(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary focus:outline-none focus:border-primary transition-all font-semibold"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-app-text-secondary uppercase tracking-wider">Confirm New Password</label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassInput}
                onChange={(e) => setConfirmPassInput(e.target.value)}
                className="w-full px-4 py-3 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary focus:outline-none focus:border-primary transition-all font-semibold"
              />
            </div>
          </form>
        </CustomDialog>
      )}

    </div>
  );
};
