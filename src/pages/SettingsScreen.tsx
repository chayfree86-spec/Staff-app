import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { CustomSelect } from '../components/ui/CustomSelect';

export const SettingsScreen: React.FC = () => {
  const { settings, updateSettings, setScreen } = useStore();
  const [saveStatus, setSaveStatus] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleHolidayToggle = (day: string) => {
    let updatedHolidays = [...settings.weeklyHoliday];
    if (updatedHolidays.includes(day)) {
      updatedHolidays = updatedHolidays.filter(d => d !== day);
    } else {
      updatedHolidays.push(day);
    }
    updateSettings({ weeklyHoliday: updatedHolidays });
    triggerSaveAlert();
  };

  const triggerSaveAlert = () => {
    setSaveStatus(true);
    setTimeout(() => {
      setSaveStatus(false);
    }, 1000);
  };

  const handleSelectChange = (key: keyof typeof settings, value: any) => {
    updateSettings({ [key]: value });
    triggerSaveAlert();
  };

  return (
    <div className="flex flex-col gap-5 pb-24 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setScreen('more')}
          className="w-10 h-10 rounded-full bg-app-surface border border-app-border text-app-text-secondary flex items-center justify-center hover:border-primary/30 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-95 cursor-pointer shrink-0"
        >
          <span className="material-symbols-rounded select-none" style={{ fontSize: '20px' }}>arrow_back</span>
        </button>
        <h2 className="text-sm font-black text-app-text-primary tracking-tight select-none">Settings</h2>
      </div>

      {/* Auto-save success indicator */}
      {saveStatus && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-500 rounded-xl text-xs font-black uppercase tracking-wider border border-emerald-200 flex items-center gap-2">
          <span className="material-symbols-rounded select-none" style={{ fontSize: '15px' }}>check_circle</span>
          Settings updated and auto-saved
        </div>
      )}

      {/* Settings Grid/List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        
        {/* Left Column: Theme & Holiday */}
        <div className="flex flex-col gap-5">
          {/* 1. Theme Configuration */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[15px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                Appearance Theme
              </h3>
              
              <div className="grid grid-cols-3 gap-2 p-1 bg-app-bg border border-app-border rounded-xl">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      updateSettings({ theme: t });
                      triggerSaveAlert();
                    }}
                    className={`py-2 rounded-lg text-xs font-black capitalize transition-all cursor-pointer ${
                      settings.theme === t
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-app-text-secondary hover:text-app-text-primary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Holiday Settings */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[15px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4.5">
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                  Weekly Holiday
                </h3>
                <span className="text-[10px] text-app-text-secondary leading-normal">
                  Select one or multiple days to mark as weekly holiday
                </span>
              </div>

              {/* Holiday day toggle buttons */}
              <div className="flex flex-wrap gap-2 mt-0.5">
                {daysOfWeek.map((day) => {
                  const isSelected = settings.weeklyHoliday.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleHolidayToggle(day)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'bg-app-bg border-app-border text-app-text-secondary hover:text-app-text-primary'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  );
                })}
              </div>

              <CustomSelect
                label="Weekly Holiday Count in Salary"
                value={settings.weeklyHolidayPaid}
                onChange={(val) => handleSelectChange('weeklyHolidayPaid', val)}
                options={[
                  { value: 'Paid', label: 'Paid (Holiday is compensated)' },
                  { value: 'Unpaid', label: 'Unpaid (No work, no pay)' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Salary Cycle & Calculations */}
        <div className="flex flex-col gap-5">
          {/* 3. Salary Cycles & Basis */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[15px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4.5">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                Salary cycle & calculations
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Month Calculation"
                  value={settings.monthCalculation}
                  onChange={(val) => handleSelectChange('monthCalculation', val)}
                  options={[
                    { value: 'Actual Calendar Month', label: 'Calendar Month' },
                    { value: 'Fixed 30 Days', label: 'Fixed 30 Days' },
                  ]}
                />
                <CustomSelect
                  label="Salary Calculation Basis"
                  value={settings.salaryCalculationBasis}
                  onChange={(val) => handleSelectChange('salaryCalculationBasis', val)}
                  options={[
                    { value: 'Attendance Based', label: 'Attendance Based' },
                    { value: 'Fixed Salary', label: 'Fixed Salary' },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CustomSelect
                  label="Cycle Starts On"
                  value={settings.salaryCycleStart.toString()}
                  onChange={(val) => handleSelectChange('salaryCycleStart', Number(val))}
                  options={Array.from({ length: 28 }, (_, i) => ({
                    value: (i + 1).toString(),
                    label: `Day ${i + 1}`,
                  }))}
                />
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.1em]">
                    New Staff Payout Hold (Days)
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      min={0}
                      max={90}
                      placeholder="e.g. 10"
                      value={settings.newStaffSalaryHoldDays || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value));
                        handleSelectChange('newStaffSalaryHoldDays', val);
                      }}
                      className="w-full px-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs text-app-text-primary font-bold focus:outline-none focus:border-primary no-spinners transition-all"
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-app-text-secondary uppercase tracking-wider">
                      {settings.newStaffSalaryHoldDays === 0 ? 'No Hold' : 'Days'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Auto-Attendance Settings */}
          <div className="bg-black/[0.015] dark:bg-white/[0.015] border border-app-border rounded-[20px] p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.015)]">
            <div className="bg-app-surface border border-app-border/40 rounded-[15px] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-4.5">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.15em]">
                Auto-Attendance Configuration
              </h3>
              
              <div className="flex justify-between items-center bg-app-bg px-4 py-3 rounded-xl border border-app-border">
                <div className="flex flex-col gap-0.5 text-left">
                  <span className="text-xs font-bold text-app-text-primary">Enable Auto-Attendance</span>
                  <span className="text-[9px] text-app-text-secondary leading-none">Auto-mark attendance for active staff daily</span>
                </div>
                
                {/* Premium Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    updateSettings({ autoAttendanceEnabled: !settings.autoAttendanceEnabled });
                    triggerSaveAlert();
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.autoAttendanceEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.autoAttendanceEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {settings.autoAttendanceEnabled && (
                <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200 text-left">
                  <label className="text-[10px] font-black text-app-text-secondary uppercase tracking-[0.1em]">
                    Designated Trigger Time
                  </label>
                  <div className="relative mt-0.5">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-app-text-secondary font-bold select-none material-symbols-rounded">schedule</span>
                    <input
                      type="time"
                      value={settings.autoAttendanceTime}
                      onChange={(e) => {
                        handleSelectChange('autoAttendanceTime', e.target.value);
                      }}
                      className="w-full pl-9 pr-4 py-2.5 bg-app-bg border border-app-border rounded-xl text-xs text-app-text-primary font-bold focus:outline-none focus:border-primary transition-all"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
