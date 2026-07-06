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
  setActiveStaffProfileId: (id: string | null) => void;
  setCurrentDate: (date: string) => void;
  setSearchQuery: (query: string) => void;
  setIsAddStaffModalOpen: (open: boolean) => void;
  addStaff: (staff: Omit<Staff, 'id' | 'avatar' | 'perDaySalary'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  markAttendance: (date: string, staffId: string, status: AttendanceRecord['status']) => void;
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
  currentDate: new Date().toISOString().split('T')[0],
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
    }
  },
  changePassword: async (oldPass, newPass) => {
    await changePasswordRequest(oldPass, newPass);
  },

  setScreen: (screen) => set((state) => ({ previousScreen: state.currentScreen, currentScreen: screen })),
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
    const today = new Date().toISOString().split('T')[0];
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
      date: date || new Date().toISOString().split('T')[0],
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

  triggerAutoAttendance: () => {
    const state = get();
    if (!state.settings.autoAttendanceEnabled) return;

    // Always today's real date — state.currentDate is whatever day the
    // Attendance calendar happens to be viewing, not necessarily today.
    const dateStr = new Date().toISOString().split('T')[0];
    const dayAttendance = state.attendance[dateStr] || {};

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
  },
}));
