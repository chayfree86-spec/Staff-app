import { create } from 'zustand';
import { format, parseISO } from 'date-fns';
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
  type ApiBootstrapData,
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
  currentScreen: 'attendance' | 'dashboard' | 'staff' | 'salary' | 'more' | 'staff-profile' | 'advance' | 'deduction' | 'reports' | 'business' | 'settings';
  activeStaffProfileId: string | null;
  currentDate: string; // YYYY-MM-DD
  searchQuery: string;
  staffList: Staff[];
  attendance: Record<string, Record<string, AttendanceRecord>>; // date -> staffId -> record
  advanceList: AdvanceRecord[];
  deductionList: DeductionRecord[];
  payoutList: PayoutRecord[];
  businessInfo: BusinessInfo;
  settings: Settings;

  isLoggedIn: boolean;
  login: (identifier: string, secret: string, method: 'password' | 'pin') => Promise<boolean>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<void>;

  // Actions
  setScreen: (screen: AppState['currentScreen']) => void;
  setActiveStaffProfileId: (id: string | null) => void;
  setCurrentDate: (date: string) => void;
  setSearchQuery: (query: string) => void;
  addStaff: (staff: Omit<Staff, 'id' | 'avatar' | 'perDaySalary'>) => void;
  updateStaff: (id: string, updates: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  markAttendance: (date: string, staffId: string, status: AttendanceRecord['status']) => void;
  markAllPresent: (date: string) => void;
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
}

// Plain UUID (36 chars) so ids fit the CHAR(36) columns in MySQL.
const createId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const applyBootstrapData = (data: ApiBootstrapData) => ({
  businessInfo: data.businessInfo,
  settings: data.settings,
  staffList: data.staffList,
  attendance: data.attendance,
  advanceList: data.advanceList,
  deductionList: data.deductionList,
  payoutList: data.payoutList,
});

// Persist a mutation in the background; if it fails, reload server state so
// the optimistic local update does not drift from the database.
const persist = (task: Promise<unknown>) => {
  task.catch((error) => {
    console.error('Failed to sync change with server:', error);
    meRequest()
      .then((data) => useStore.setState(applyBootstrapData(data)))
      .catch(() => {});
  });
};

export const useStore = create<AppState>((set, get) => ({
  currentScreen: 'attendance', // Default screen is Attendance
  activeStaffProfileId: null,
  currentDate: new Date().toISOString().split('T')[0],
  searchQuery: '',
  staffList: [],
  attendance: {},
  advanceList: [],
  deductionList: [],
  payoutList: [],
  businessInfo: {
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
    newStaffSalaryHoldDays: 15,
    monthCalculation: 'Actual Calendar Month',
    salaryCalculationBasis: 'Attendance Based',
    theme: 'light',
    autoAttendanceEnabled: false,
    autoAttendanceTime: '09:00',
  },

  isLoggedIn: false,

  login: async (identifier, secret, method) => {
    try {
      const data = await loginRequest(identifier, secret, method);
      set({
        isLoggedIn: true,
        ...applyBootstrapData(data),
      });
      return true;
    } catch {
      set({ isLoggedIn: false });
      return false;
    }
  },
  restoreSession: async () => {
    try {
      const data = await meRequest();
      set({
        isLoggedIn: true,
        ...applyBootstrapData(data),
      });
    } catch {
      set({ isLoggedIn: false });
    }
  },
  logout: async () => {
    try {
      await logoutRequest();
    } finally {
      set({
        isLoggedIn: false,
        staffList: [],
        attendance: {},
        advanceList: [],
        deductionList: [],
        payoutList: [],
        businessInfo: {
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

  setScreen: (screen) => set({ currentScreen: screen }),
  setActiveStaffProfileId: (id) => set({ activeStaffProfileId: id }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addStaff: (staff) => {
    const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newStaff: Staff = {
      ...staff,
      id: createId(),
      avatar: initials,
      perDaySalary: Math.round(staff.salaryType === 'Monthly' ? staff.monthlySalary / 30 : staff.monthlySalary),
    };
    set((state) => ({ staffList: [...state.staffList, newStaff] }));
    persist(createStaffRequest(newStaff));
  },

  updateStaff: (id, updates) => {
    let updatedStaff: Staff | undefined;
    set((state) => ({
      staffList: state.staffList.map((s) => {
        if (s.id === id) {
          const merged = { ...s, ...updates };
          merged.perDaySalary = Math.round(
            merged.salaryType === 'Monthly' ? merged.monthlySalary / 30 : merged.monthlySalary
          );
          updatedStaff = merged;
          return merged;
        }
        return s;
      }),
    }));
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

  markAllPresent: (date) => {
    const entries = get()
      .staffList.filter((staff) => staff.status === 'Active')
      .map((staff) => ({ staffId: staff.id, status: 'Present' as const }));
    if (entries.length === 0) return;

    set((state) => {
      const updatedAttendance = { ...state.attendance };
      if (!updatedAttendance[date]) {
        updatedAttendance[date] = {};
      }
      entries.forEach(({ staffId, status }) => {
        updatedAttendance[date][staffId] = {
          status,
          timestamp: new Date().toISOString(),
        };
      });
      return { attendance: updatedAttendance };
    });
    persist(markAttendanceBulkRequest(date, entries));
  },

  addAdvance: (staffId, amount, date, remarks) => {
    const record: AdvanceRecord = { id: createId(), staffId, amount, date, remarks };
    set((state) => ({ advanceList: [...state.advanceList, record] }));
    persist(createTransactionRequest('advance', record));
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
    const record: DeductionRecord = { id: createId(), staffId, amount, date, remarks };
    set((state) => ({ deductionList: [...state.deductionList, record] }));
    persist(createTransactionRequest('deduction', record));
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
    const record: PayoutRecord = {
      id: createId(),
      staffId,
      amount,
      date: date || new Date().toISOString().split('T')[0],
      month,
      paymentMode,
      remarks,
    };
    set((state) => ({ payoutList: [...state.payoutList, record] }));
    persist(createPayoutRequest(record));
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

    const dateStr = state.currentDate;
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
}));
