import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomDatePicker } from '../components/ui/CustomDatePicker';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

export const AttendanceScreen: React.FC = () => {
  const {
    currentDate,
    setCurrentDate,
    staffList,
    attendance,
    markAttendance,
    markAllPresent,
    setScreen,
    setActiveStaffProfileId,
    settings,
  } = useStore();

  const [search, setSearch] = useState('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const selectedDateStr = currentDate;
  const dayRecords = attendance[selectedDateStr] || {};

  // A weekly-holiday date (e.g. every Sunday) can only be Holiday/Absent;
  // any other date can only be Present/Half Day/Absent.
  const isHolidayDate = settings.weeklyHoliday.includes(format(parseISO(selectedDateStr), 'EEEE'));

  // Filter staff by status (Active) and search query
  const activeStaff = staffList.filter(
    (s) => s.status === 'Active' && s.name.toLowerCase().includes(search.toLowerCase())
  );

  // Calculate monthly stats for each staff to display on card
  const getMonthlyStats = (staffId: string) => {
    const selectedDate = parseISO(selectedDateStr);
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let holiday = 0;

    const days = eachDayOfInterval({ start, end });
    days.forEach((day) => {
      const dStr = format(day, 'yyyy-MM-dd');
      const record = attendance[dStr]?.[staffId];
      if (record) {
        if (record.status === 'Present') present++;
        if (record.status === 'Absent') absent++;
        if (record.status === 'Half Day') halfDay++;
        if (record.status === 'Holiday') holiday++;
      }
    });

    return { present, absent, halfDay, holiday };
  };

  const handleStatusChange = (staffId: string, status: 'Present' | 'Absent' | 'Half Day' | 'Holiday') => {
    markAttendance(selectedDateStr, staffId, status);
    
    // Quick auto-save animation indicator
    setSaveStatus(staffId);
    setTimeout(() => {
      setSaveStatus(null);
    }, 800);
  };

  const handleMarkAllPresent = () => {
    markAllPresent(selectedDateStr);
    setSaveStatus('all');
    setTimeout(() => {
      setSaveStatus(null);
    }, 1000);
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

  // Day summary for active staff
  const summary = activeStaff.reduce(
    (acc, staff) => {
      const record = dayRecords[staff.id];
      if (record?.status === 'Present') acc.present++;
      else if (record?.status === 'Absent') acc.absent++;
      else if (record?.status === 'Half Day') acc.halfDay++;
      else if (record?.status === 'Holiday') acc.holiday++;
      else acc.unmarked++;
      return acc;
    },
    { present: 0, absent: 0, halfDay: 0, holiday: 0, unmarked: 0 }
  );

  return (
    <div className="flex flex-col gap-5 pb-24">
      {/* Sticky Header with Date & Search - Double Bezel Architecture (Halved radius: 2.5rem -> 1.25rem, inner core: 34px -> 17px) */}
      <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
        <div className="bg-app-surface border border-app-border/40 rounded-[17px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <CustomDatePicker
              value={currentDate}
              onChange={(val) => setCurrentDate(val)}
              className="w-full sm:w-auto shrink-0 font-bold"
            />
            
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Search Input (Takes up remaining space) */}
              <div className="relative flex-1 min-w-0">
                <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-app-text-secondary select-none text-xl">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search staff members..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-sm text-app-text-primary placeholder:text-app-text-secondary focus:outline-none focus:border-primary transition-all font-semibold"
                />
              </div>

              {/* Mark All Present Button - Button-in-Button Style (hidden on weekly holiday dates, since those can only be Holiday/Absent) */}
              {!isHolidayDate && (
                <button
                  onClick={handleMarkAllPresent}
                  className="group/btn pl-4.5 pr-3 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl text-sm font-extrabold flex items-center gap-2.5 hover:from-emerald-600 hover:to-green-700 shadow-md shadow-emerald-500/10 cursor-pointer shrink-0 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95"
                >
                  <span className="hidden xs:inline">Mark All Present</span>
                  <span className="xs:hidden">Mark All</span>
                  <div className="w-6.5 h-6.5 rounded-full bg-white/20 flex items-center justify-center group-hover/btn:scale-110 transition-transform animate-none">
                    <span className="material-symbols-rounded select-none" style={{ fontSize: '12px' }}>done_all</span>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Attendance Day Summary - Premium Double Bezel Style cards */}
          {isHolidayDate ? (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-app-border/60">
              <div className="bg-info/10 rounded-2xl p-3 text-center border border-info/20 dark:border-info/30">
                <div className="text-xl font-black text-info leading-tight">{summary.holiday}</div>
                <div className="text-[8.5px] uppercase font-bold text-info tracking-widest mt-0.5">Holiday</div>
              </div>
              <div className="bg-rose-500/10 rounded-2xl p-3 text-center border border-rose-500/20 dark:border-rose-500/30">
                <div className="text-xl font-black text-absent leading-tight">{summary.absent}</div>
                <div className="text-[8.5px] uppercase font-bold text-absent tracking-widest mt-0.5">Absent</div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-app-border/60">
              <div className="bg-emerald-500/10 rounded-2xl p-3 text-center border border-emerald-500/20 dark:border-emerald-500/30">
                <div className="text-xl font-black text-present leading-tight">{summary.present}</div>
                <div className="text-[8.5px] uppercase font-bold text-present tracking-widest mt-0.5">Present</div>
              </div>
              <div className="bg-rose-500/10 rounded-2xl p-3 text-center border border-rose-500/20 dark:border-rose-500/30">
                <div className="text-xl font-black text-absent leading-tight">{summary.absent}</div>
                <div className="text-[8.5px] uppercase font-bold text-absent tracking-widest mt-0.5">Absent</div>
              </div>
              <div className="bg-amber-500/10 rounded-2xl p-3 text-center border border-amber-500/20 dark:border-amber-500/30">
                <div className="text-xl font-black text-halfday leading-tight">{summary.halfDay}</div>
                <div className="text-[8.5px] uppercase font-bold text-halfday tracking-widest mt-0.5">Half Day</div>
              </div>
            </div>
          )}

          {saveStatus === 'all' && (
            <div className="text-center text-xs font-bold text-emerald-500 flex items-center justify-center gap-1.5 py-1">
              <span className="material-symbols-rounded text-base animate-pulse">check_circle</span>
              All attendance auto-saved successfully
            </div>
          )}
        </div>
      </div>

      {/* Staff Attendance List (Halved radius: 2.5rem -> 1.25rem, inner core: 36px -> 18px) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeStaff.map((staff) => {
          const currentStatus = dayRecords[staff.id]?.status;
          const stats = getMonthlyStats(staff.id);
          const isSaving = saveStatus === staff.id;
          const initials = staff.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

          return (
            <div
              key={staff.id}
              className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[1.25rem] p-1 shadow-sm relative overflow-hidden"
            >
              {/* Auto-save flashing indicator */}
              {isSaving && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse z-10" />
              )}

              <div className="bg-app-surface border border-app-border/40 rounded-[18px] p-4 flex flex-col gap-4 hover:border-primary/20 dark:hover:border-primary/40 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 cursor-pointer group">
                
                {/* Staff Details & Monthly Quick Stats */}
                <div
                  onClick={() => {
                    setActiveStaffProfileId(staff.id);
                    setScreen('staff-profile');
                  }}
                  className="flex justify-between items-center gap-3 cursor-pointer group/card"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar circle using the vibrant gradient or uploaded profile photo */}
                    {staff.profileImage ? (
                      <img
                        src={staff.profileImage}
                        alt={staff.name}
                        className="w-10 h-10 rounded-full object-cover shadow-sm shrink-0 border border-app-border/40"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getProfileGradient(staff.name)} text-white flex items-center justify-center font-black text-xs shadow-sm border-0`}>
                        {initials}
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-bold text-app-text-primary text-sm leading-tight tracking-tight group-hover/card:text-primary transition-colors">{staff.name}</h4>
                      <p className="text-[10px] text-app-text-secondary mt-1 font-semibold leading-none">{staff.mobile}</p>
                    </div>
                  </div>
                </div>

                {/* Status Selectors: holiday dates only allow Holiday/Absent;
                    normal dates only allow Present/Half Day/Absent. */}
                {isHolidayDate ? (
                  <div className="grid grid-cols-2 gap-2 mt-0.5">
                    <button
                      onClick={() => handleStatusChange(staff.id, 'Holiday')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                        currentStatus === 'Holiday'
                          ? 'bg-info text-white shadow-md shadow-info/20 border-0'
                          : 'bg-app-bg border border-app-border/40 text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Holiday ({stats.holiday})
                    </button>
                    <button
                      onClick={() => handleStatusChange(staff.id, 'Absent')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                        currentStatus === 'Absent'
                          ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20 border-0'
                          : 'bg-app-bg border border-app-border/40 text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Absent ({stats.absent})
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-0.5">
                    <button
                      onClick={() => handleStatusChange(staff.id, 'Present')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                        currentStatus === 'Present'
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/20 border-0'
                          : 'bg-app-bg border border-app-border/40 text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Present ({stats.present})
                    </button>
                    <button
                      onClick={() => handleStatusChange(staff.id, 'Absent')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                        currentStatus === 'Absent'
                          ? 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-md shadow-rose-500/20 border-0'
                          : 'bg-app-bg border border-app-border/40 text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Absent ({stats.absent})
                    </button>
                    <button
                      onClick={() => handleStatusChange(staff.id, 'Half Day')}
                      className={`py-2 rounded-xl text-xs font-bold transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] cursor-pointer ${
                        currentStatus === 'Half Day'
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/20 border-0'
                          : 'bg-app-bg border border-app-border/40 text-app-text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      Half Day ({stats.halfDay})
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {activeStaff.length === 0 && (
          <div className="col-span-full bg-app-surface border border-app-border rounded-app-card p-12 text-center text-app-text-secondary">
            <span className="material-symbols-rounded text-4xl text-slate-300 dark:text-slate-700">
              person_off
            </span>
            <p className="mt-2 text-sm font-semibold">No active staff found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
