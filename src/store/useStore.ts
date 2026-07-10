import { create } from 'zustand';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import {
  changePasswordRequest,
  createPayoutRequest,
  createStaffRequest,
  createTransactionRequest,
  deleteStaffRequest,
  deleteTransactionRequest,
  loginRequest,
  logoutRequest,
  markAttendanceBulkRequest,
  markAttendanceRequest,
  meRequest,
  updateBusinessRequest,
  updateSettingsRequest,
  updateStaffRequest,
  updateTransactionRequest,
  switchBusinessRequest,
  type ApiBootstrapData,
  type ApiUser,
} from '../api/client';

export interface Staff {
  id: string;
  name: string;
  mobile: string;
  avatar: string;
  monthlySalary: number;
  perDaySalary: number;
  salaryType: 'Monthly' | 'Daily';
  calculationBasis: 'Attendance Based' | 'Fixed Salary';
  joiningDate: string;
  status: 'Active' | 'Inactive';
  deactivationDate?: string;
  fatherName?: string;
  mobile2?: string;
  address?: string;
  profileImage?: string;
  releasedSalaryHold?: boolean;
}

export interface AttendanceRecord {
  status: 'Present' | 'Absent' | 'Half Day' | 'Holiday' | 'Unmarked';
  timestamp: string;
}

export interface AdvanceRecord {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  remarks: string;
}

export interface DeductionRecord {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  remarks: string;
}

export interface PayoutRecord {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  month: string;
  paymentMode?: string;
  remarks?: string;
}

export interface BusinessInfo {
  id: string;
  name: string;
  logo: string;
  mobile: string;
  address: string;
}

export interface Settings {
  weeklyHoliday: string[]; // e.g. ["Sunday"]
  weeklyHolidayPaid: 'Paid' | 'Unpaid';
  salaryCycleStart: number;
  salaryCycleEnd: number;
  newStaffSalaryHoldDays: number;
  monthCalculation: 'Actual Calendar Month' | 'Fixed 30 Days';
  salaryCalculationBasis: 'Attendance Based' | 'Fixed Salary';
  theme: 'light' | 'dark' | 'system';
  autoAttendanceEnabled: boolean;
  autoAttendanceTime: string; // HH:MM
}

interface AppState {
  currentScreen: 'attendance' | 'dashboard' | 'staff' | 'salary' | 'more' | 'staff-profile' | 'advance' | 'deduction' | 'reports' | 'business' | 'settings' | 'create-business' | 'businesses' | 'advance-history' | 'deduction-history';
  previousScreen: AppState['currentScreen'] | null;
  activeStaffProfileId: string | null;
  currentDate: string; // YYYY-MM-DD
  searchQuery: string;
  isAddStaffModalOpen: boolean;
  staffList: Staff[];
  attendance: Record<string, Record<string, AttendanceRecord>>; // date -> staffId -> record
  advanceList: AdvanceRecord[];
  deductionList: DeductionRecord[];
  payoutList: PayoutRecord[];
  businessInfo: BusinessInfo;
  settings: Settings;

  isLoggedIn: boolean;
  isSessionRestoring: boolean;
  currentUser: ApiUser | null;
  login: (identifier: string, secret: string, method: 'password' | 'pin') => Promise<boolean>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;

  // Actions
  setScreen: (screen: AppState['currentScreen']) => void;
  // Applies a screen change that originated from the browser/PWA back button
  // (a popstate event) — must NOT push a new history entry, or back would
  // immediately re-push the screen it just navigated away from.
  syncScreenFromHistory: (screen: AppState['currentScreen']) => void;
  setActiveStaffProfileId: (id: string | null) => void;
  setCurrentDate: (date: string) => void;
  setSearchQuery: (query: string) => void;
  setIsAddStaffModalOpen: (open: boolean) => void;
  addStaff: (staff: Omit<Staff, 'id' | 'avatar' | 'perDaySalary'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  markAttendance: (date: string, staffId: string, status: AttendanceRecord['status']) => void;
  // Auto-marks a configured weekly-holiday date as Holiday for every active
  // staff member who is still unmarked on it. A holiday is deterministic (it
  // comes from the weekly-holiday setting), so it fills in on its own instead
  // of needing to be marked by hand.
  autoMarkHolidayForDate: (date: string) => void;
  addAdvance: (staffId: string, amount: number, date: string, remarks: string) => void;
  updateAdvance: (id: string, amount: number, date: string, remarks: string) => void;
  deleteAdvance: (id: string) => void;
  addDeduction: (staffId: string, amount: number, date: string, remarks: string) => void;
  updateDeduction: (id: string, amount: number, date: string, remarks: string) => void;
  deleteDeduction: (id: string) => void;
  paySalary: (staffId: string, amount: number, month: string, date?: string, paymentMode?: string, remarks?: string) => void;
  updateBusinessInfo: (info: Partial<BusinessInfo>) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  triggerAutoAttendance: () => void;
  switchBusiness: (businessId: string) => Promise<void>;
}

// The DB assigns simple numeric ids (1, 2, 3, ...). New records get a
// temporary local id for the optimistic update, replaced by the real id
// as soon as the server responds.
const createTempId = () => `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Today's date (YYYY-MM-DD) in India Standard Time (Asia/Kolkata) — the same
// timezone the backend runs in (see api/_bootstrap.php). Computed in IST
// explicitly, not from the device's local clock or UTC, so "today" always
// matches the server and stays correct even if the device timezone is wrong.
// This boundary is exactly what decides "today" vs a future date, so holiday
// auto-marking must never treat a day the business considers future as today.
const todayIST = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

// Images saved while the DB column was VARCHAR(500) were truncated and can
// never render; drop them so the initials avatar shows instead.
const isBrokenImage = (img?: string) =>
  !!img && img.startsWith('data:') && img.length <= 500;

const applyBootstrapData = (data: ApiBootstrapData) => ({
  businessInfo: isBrokenImage(data.businessInfo.logo)
    ? { ...data.businessInfo, logo: '' }
    : data.businessInfo,
  settings: data.settings,
  staffList: [...data.staffList]
    .map((staff) => isBrokenImage(staff.profileImage) ? { ...staff, profileImage: undefined } : staff)
    .sort((a, b) => a.name.localeCompare(b.name)),
  attendance: data.attendance,
  advanceList: data.advanceList,
  deductionList: data.deductionList,
  payoutList: data.payoutList,
});

// Persist a mutation in the background; if it fails, reload server state so
// the optimistic local update does not drift from the database.
const resyncFromServer = (error: unknown) => {
  console.error('Failed to sync change with server:', error);
  meRequest()
    .then(({ data }) => useStore.setState(applyBootstrapData(data)))
    .catch(() => {});
};

const persist = (task: Promise<unknown>) => {
  task.catch(resyncFromServer);
};

// For creates: swap the temporary local id with the DB-assigned one.
const persistCreate = (task: Promise<string | undefined>, applyRealId: (realId: string) => void) => {
  task
    .then((realId) => {
      if (realId) applyRealId(realId);
    })
    .catch(resyncFromServer);
};

export const useStore = create<AppState>((set, get) => ({
  currentScreen: 'attendance', // Default screen is Attendance
  previousScreen: null,
  activeStaffProfileId: null,
  currentDate: todayIST(),
  searchQuery: '',
  isAddStaffModalOpen: false,
  staffList: [],
  attendance: {},
  advanceList: [],
  deductionList: [],
  payoutList: [],
  businessInfo: {
    id: '',
    name: '',
    logo: '',
    mobile: '',
    address: '',
  },
  settings: {
    weeklyHoliday: ['Sunday'],
    weeklyHolidayPaid: 'Paid',
    salaryCycleStart: 1,
    salaryCycleEnd: 30,
    newStaffSalaryHoldDays: 10,
    monthCalculation: 'Actual Calendar Month',
    salaryCalculationBasis: 'Attendance Based',
    theme: 'light',
    autoAttendanceEnabled: false,
    autoAttendanceTime: '09:00',
  },

  isLoggedIn: false,
  isSessionRestoring: true,
  currentUser: null,

  login: async (identifier, secret, method) => {
    try {
      const { user, data } = await loginRequest(identifier, secret, method);
      set({
        isLoggedIn: true,
        currentUser: user,
        ...applyBootstrapData(data),
      });
      return true;
    } catch {
      set({ isLoggedIn: false, currentUser: null });
      return false;
    }
  },
  restoreSession: async () => {
    try {
      const { user, data } = await meRequest();
      set({
        isLoggedIn: true,
        currentUser: user,
        ...applyBootstrapData(data),
        isSessionRestoring: false,
      });
    } catch {
      set({ isLoggedIn: false, currentUser: null, isSessionRestoring: false });
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      set({
        isLoggedIn: false,
        currentUser: null,
        currentScreen: 'attendance',
        previousScreen: null,
        staffList: [],
        attendance: {},
        advanceList: [],
        deductionList: [],
        payoutList: [],
        businessInfo: {
          id: '',
          name: '',
          logo: '',
          mobile: '',
          address: '',
        },
      });
      // Drop any in-app screen history from the session that just ended, so
      // back-navigation on the login screen doesn't replay stale screens.
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '');
      }
    }
  },
  changePassword: async (oldPass, newPass) => {
    await changePasswordRequest(oldPass, newPass);
  },

  setScreen: (screen) => {
    const state = get();
    if (state.currentScreen === screen) return;
    set({ previousScreen: state.currentScreen, currentScreen: screen });
    // Push a browser history entry per screen so the PWA's back
    // button/gesture steps back through in-app screens one at a time,
    // instead of exiting the app immediately (there's nothing else in the
    // history stack for it to fall back to otherwise).
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen }, '');
    }
  },
  syncScreenFromHistory: (screen) =>
    set((state) => ({ previousScreen: state.currentScreen, currentScreen: screen })),
  setActiveStaffProfileId: (id) => set({ activeStaffProfileId: id }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsAddStaffModalOpen: (open) => set({ isAddStaffModalOpen: open }),

  addStaff: (staff) => {
    const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const tempId = createTempId();
    const newStaff: Staff = {
      ...staff,
      id: tempId,
      avatar: initials,
      perDaySalary: Math.round(staff.salaryType === 'Monthly' ? staff.monthlySalary / 30 : staff.monthlySalary),
    };
    // Auto-mark attendance from joiningDate to today (inclusive). Uses the
    // real device date, not the store's currentDate — that reflects whatever
    // day the Attendance calendar happens to be viewing, not "today".
    const today = todayIST();
    const start = parseISO(staff.joiningDate);
    const end = parseISO(today);
    const weeklyHolidays = get().settings.weeklyHoliday || [];
    
    let datesList: Date[] = [];
    if (start <= end) {
      try {
        datesList = eachDayOfInterval({ start, end });
      } catch (e) {
        console.error(e);
      }
    }
    
    set((state) => {
      const updatedAttendance = { ...state.attendance };
      datesList.forEach((d) => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const dayName = format(d, 'EEEE');
        const isHoliday = weeklyHolidays.includes(dayName);
        const status = isHoliday ? ('Holiday' as const) : ('Present' as const);
        
        if (!updatedAttendance[dateStr]) {
          updatedAttendance[dateStr] = {};
        }
        updatedAttendance[dateStr][tempId] = {
          status,
          timestamp: new Date().toISOString(),
        };
      });
      return { 
        staffList: [...state.staffList, newStaff].sort((a, b) => a.name.localeCompare(b.name)),
        attendance: updatedAttendance
      };
    });
    
    persistCreate(createStaffRequest(newStaff), (realId) => {
      set((state) => {
        const updatedAttendance = { ...state.attendance };
        Object.keys(updatedAttendance).forEach((dateStr) => {
          if (updatedAttendance[dateStr][tempId]) {
            updatedAttendance[dateStr][realId] = updatedAttendance[dateStr][tempId];
            delete updatedAttendance[dateStr][tempId];
          }
        });
        return {
          staffList: state.staffList.map((s) => (s.id === tempId ? { ...s, id: realId } : s)),
          activeStaffProfileId: state.activeStaffProfileId === tempId ? realId : state.activeStaffProfileId,
          attendance: updatedAttendance,
        };
      });
    });
  },

  updateStaff: (id, updates) => {
    let updatedStaff: Staff | undefined;
    set((state) => {
      const newList = state.staffList.map((s) => {
        if (s.id === id) {
          const merged = { ...s, ...updates };
          merged.perDaySalary = Math.round(
            merged.salaryType === 'Monthly' ? merged.monthlySalary / 30 : merged.monthlySalary
          );
          updatedStaff = merged;
          return merged;
        }
        return s;
      });
      newList.sort((a, b) => a.name.localeCompare(b.name));
      return { staffList: newList };
    });
    if (updatedStaff) {
      persist(updateStaffRequest(updatedStaff));
    }
  },

  deleteStaff: (id) => {
    set((state) => {
      // Mirror the DB cascade: drop the staff member's records everywhere.
      const attendance: AppState['attendance'] = {};
      Object.entries(state.attendance).forEach(([date, records]) => {
        const { [id]: _removed, ...rest } = records;
        attendance[date] = rest;
      });
      return {
        staffList: state.staffList.filter((s) => s.id !== id),
        advanceList: state.advanceList.filter((a) => a.staffId !== id),
        deductionList: state.deductionList.filter((d) => d.staffId !== id),
        payoutList: state.payoutList.filter((p) => p.staffId !== id),
        attendance,
      };
    });
    persist(deleteStaffRequest(id));
  },

  markAttendance: (date, staffId, status) => {
    set((state) => {
      const updatedAttendance = { ...state.attendance };
      if (!updatedAttendance[date]) {
        updatedAttendance[date] = {};
      }
      updatedAttendance[date][staffId] = {
        status,
        timestamp: new Date().toISOString(),
      };
      return { attendance: updatedAttendance };
    });
    persist(markAttendanceRequest(date, staffId, status));
  },

  addAdvance: (staffId, amount, date, remarks) => {
    const tempId = createTempId();
    const record: AdvanceRecord = { id: tempId, staffId, amount, date, remarks };
    set((state) => ({ advanceList: [...state.advanceList, record] }));
    persistCreate(createTransactionRequest('advance', record), (realId) => {
      set((state) => ({
        advanceList: state.advanceList.map((a) => (a.id === tempId ? { ...a, id: realId } : a)),
      }));
    });
  },

  updateAdvance: (id, amount, date, remarks) => {
    set((state) => ({
      advanceList: state.advanceList.map((a) => (a.id === id ? { ...a, amount, date, remarks } : a)),
    }));
    persist(updateTransactionRequest('advance', { id, amount, date, remarks }));
  },

  deleteAdvance: (id) => {
    set((state) => ({
      advanceList: state.advanceList.filter((a) => a.id !== id),
    }));
    persist(deleteTransactionRequest('advance', id));
  },

  addDeduction: (staffId, amount, date, remarks) => {
    const tempId = createTempId();
    const record: DeductionRecord = { id: tempId, staffId, amount, date, remarks };
    set((state) => ({ deductionList: [...state.deductionList, record] }));
    persistCreate(createTransactionRequest('deduction', record), (realId) => {
      set((state) => ({
        deductionList: state.deductionList.map((d) => (d.id === tempId ? { ...d, id: realId } : d)),
      }));
    });
  },

  updateDeduction: (id, amount, date, remarks) => {
    set((state) => ({
      deductionList: state.deductionList.map((d) => (d.id === id ? { ...d, amount, date, remarks } : d)),
    }));
    persist(updateTransactionRequest('deduction', { id, amount, date, remarks }));
  },

  deleteDeduction: (id) => {
    set((state) => ({
      deductionList: state.deductionList.filter((d) => d.id !== id),
    }));
    persist(deleteTransactionRequest('deduction', id));
  },

  paySalary: (staffId, amount, month, date, paymentMode, remarks) => {
    const tempId = createTempId();
    const record: PayoutRecord = {
      id: tempId,
      staffId,
      amount,
      date: date || todayIST(),
      month,
      paymentMode,
      remarks,
    };
    set((state) => ({ payoutList: [...state.payoutList, record] }));
    const { id: _tempId, ...payload } = record;
    persistCreate(createPayoutRequest(payload), (realId) => {
      set((state) => ({
        payoutList: state.payoutList.map((p) => (p.id === tempId ? { ...p, id: realId } : p)),
      }));
    });
  },

  updateBusinessInfo: (info) => {
    const merged = { ...get().businessInfo, ...info };
    set({ businessInfo: merged });
    persist(updateBusinessRequest(merged));
  },

  updateSettings: (newSettings) => {
    const merged = { ...get().settings, ...newSettings };
    set({ settings: merged });
    persist(updateSettingsRequest(merged));
  },

  autoMarkHolidayForDate: (date) => {
    const state = get();
    // Never pre-mark the future; attendance only matters up to today.
    if (date > todayIST()) return;

    const dayName = format(parseISO(date), 'EEEE');
    if (!(state.settings.weeklyHoliday || []).includes(dayName)) return;

    const dayRecords = state.attendance[date] || {};
    // Only active staff who had already joined by this date and aren't marked
    // yet — never overwrite a manually-set status (e.g. Absent on a holiday).
    const entries = state.staffList
      .filter((staff) => staff.status === 'Active' && staff.joiningDate <= date && !dayRecords[staff.id])
      .map((staff) => ({ staffId: staff.id, status: 'Holiday' as const }));
    if (entries.length === 0) return;

    const updatedAttendance = { ...state.attendance, [date]: { ...dayRecords } };
    entries.forEach(({ staffId, status }) => {
      updatedAttendance[date][staffId] = {
        status,
        timestamp: new Date().toISOString(),
      };
    });

    set({ attendance: updatedAttendance });
    persist(markAttendanceBulkRequest(date, entries));
  },

  triggerAutoAttendance: () => {
    const state = get();

    // Always today's real *local* date — state.currentDate is whatever day the
    // Attendance calendar happens to be viewing, not necessarily today.
    const dateStr = todayIST();

    // Holidays fill in on their own regardless of the auto-attendance toggle
    // (they're a fixed fact from the weekly-holiday setting, not a guess about
    // whether staff showed up).
    get().autoMarkHolidayForDate(dateStr);

    if (!state.settings.autoAttendanceEnabled) return;

    const dayAttendance = get().attendance[dateStr] || {};

    // If attendance is already marked for this date, do not overwrite it
    if (Object.keys(dayAttendance).length > 0) return;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const [targetHours, targetMinutes] = state.settings.autoAttendanceTime.split(':').map(Number);
    const isPastTime = (currentHours > targetHours) || (currentHours === targetHours && currentMinutes >= targetMinutes);

    if (!isPastTime) return;

    const dateObj = parseISO(dateStr);
    const dayName = format(dateObj, 'EEEE');
    const isHoliday = state.settings.weeklyHoliday.includes(dayName);

    // If today is a weekly holiday, skip auto-attendance entirely
    if (isHoliday) return;

    const entries = state.staffList
      .filter((staff) => staff.status === 'Active')
      .map((staff) => ({ staffId: staff.id, status: 'Present' as const }));
    if (entries.length === 0) return;

    const updatedAttendance = { ...state.attendance };
    updatedAttendance[dateStr] = {};
    entries.forEach(({ staffId, status }) => {
      updatedAttendance[dateStr][staffId] = {
        status,
        timestamp: new Date().toISOString(),
      };
    });

    set({ attendance: updatedAttendance });
    persist(markAttendanceBulkRequest(dateStr, entries));
  },

  switchBusiness: async (businessId) => {
    const data = await switchBusinessRequest(businessId);
    set({
      ...applyBootstrapData(data),
      currentScreen: 'dashboard',
    });
    // Switching business is a fresh navigation root, same as logging in —
    // reset the history entry so back-navigation doesn't land on a screen
    // that belonged to the previous business's context.
    if (typeof window !== 'undefined') {
      window.history.replaceState({ screen: 'dashboard' }, '');
    }
  },
}));
