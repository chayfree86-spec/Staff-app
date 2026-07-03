import { create } from 'zustand';
import { format, parseISO } from 'date-fns';

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
  password: string;
  login: (pass: string) => boolean;
  logout: () => void;
  changePassword: (newPass: string) => void;
  
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

// Initial mock staff
const initialStaff: Staff[] = [
  {
    id: 'st-1',
    name: 'Arjun Singh',
    mobile: '9876543201',
    avatar: 'AS',
    monthlySalary: 18000,
    perDaySalary: 600,
    salaryType: 'Monthly',
    calculationBasis: 'Attendance Based',
    joiningDate: '2025-05-10',
    status: 'Active',
    fatherName: 'Baldev Singh',
    mobile2: '9876543202',
    address: 'Flat 402, Royal Apartments, Sector 15, Dwarka, New Delhi',
  },
  {
    id: 'st-2',
    name: 'Sneha Patel',
    mobile: '9812345678',
    avatar: 'SP',
    monthlySalary: 24000,
    perDaySalary: 800,
    salaryType: 'Monthly',
    calculationBasis: 'Attendance Based',
    joiningDate: '2026-07-01',
    status: 'Active',
    fatherName: 'Ramanbhai Patel',
    mobile2: '9812345679',
    address: 'B-12, Green Park Extension, New Delhi',
  },
  {
    id: 'st-3',
    name: 'Vikram Rathore',
    mobile: '9765432109',
    avatar: 'VR',
    monthlySalary: 15000,
    perDaySalary: 500,
    salaryType: 'Monthly',
    calculationBasis: 'Fixed Salary',
    joiningDate: '2026-01-05',
    status: 'Active',
    fatherName: 'Digvijay Rathore',
    mobile2: '9765432110',
    address: 'House No. 72, Block C, Connaught Place, New Delhi',
  },
  {
    id: 'st-4',
    name: 'Karan Malhotra',
    mobile: '9988776655',
    avatar: 'KM',
    monthlySalary: 20000,
    perDaySalary: 667,
    salaryType: 'Monthly',
    calculationBasis: 'Attendance Based',
    joiningDate: '2026-03-20',
    status: 'Active',
    fatherName: 'Rajinder Malhotra',
    mobile2: '9988776656',
    address: 'A-3/40, Janakpuri, New Delhi',
  },
  {
    id: 'st-5',
    name: 'Deepak Rao',
    mobile: '9012345678',
    avatar: 'DR',
    monthlySalary: 12000,
    perDaySalary: 400,
    salaryType: 'Daily',
    calculationBasis: 'Attendance Based',
    joiningDate: '2026-05-12',
    status: 'Active',
    fatherName: 'Madhusudan Rao',
    mobile2: '9012345679',
    address: 'Pocket 2, Sector B, Vasant Kunj, New Delhi',
  }
];

// Pre-fill some attendance for June 2026 and early July 2026
const generateMockAttendance = () => {
  const attendance: Record<string, Record<string, AttendanceRecord>> = {};
  
  // June has 30 days
  const tempDate = new Date('2026-06-01');
  const today = new Date();
  
  // Loop up to today
  while (tempDate <= today) {
    const dateStr = tempDate.toISOString().split('T')[0];
    const dayOfWeek = tempDate.getDay(); // 0 = Sunday
    
    attendance[dateStr] = {};
    
    initialStaff.forEach((staff) => {
      // Sundays are weekly holidays by default
      if (dayOfWeek === 0) {
        attendance[dateStr][staff.id] = {
          status: 'Holiday',
          timestamp: `${dateStr}T10:00:00.000Z`,
        };
      } else {
        // Randomise status with high probability of Present
        const rand = Math.random();
        let status: AttendanceRecord['status'] = 'Present';
        
        if (rand < 0.05) {
          status = 'Absent';
        } else if (rand < 0.12) {
          status = 'Half Day';
        }
        
        attendance[dateStr][staff.id] = {
          status,
          timestamp: `${dateStr}T09:15:00.000Z`,
        };
      }
    });
    
    tempDate.setDate(tempDate.getDate() + 1);
  }
  return attendance;
};

// Initial Advances and Deductions
const initialAdvances: AdvanceRecord[] = [
  { id: 'adv-1', staffId: 'st-1', amount: 3000, date: '2026-06-10', remarks: 'Medical Emergency' },
  { id: 'adv-2', staffId: 'st-2', amount: 1500, date: '2026-06-25', remarks: 'Festival Advance' },
  { id: 'adv-3', staffId: 'st-4', amount: 5000, date: '2026-06-05', remarks: 'Home Repair' },
];

const initialDeductions: DeductionRecord[] = [
  { id: 'ded-1', staffId: 'st-1', amount: 500, date: '2026-06-30', remarks: 'Late fine (accumulated)' },
  { id: 'ded-2', staffId: 'st-3', amount: 1000, date: '2026-06-30', remarks: 'Damaged item cost' },
];

const initialPayouts: PayoutRecord[] = [
  { id: 'pay-1', staffId: 'st-1', amount: 14500, date: '2026-07-01', month: 'June 2026' },
  { id: 'pay-2', staffId: 'st-2', amount: 22500, date: '2026-07-01', month: 'June 2026' },
  { id: 'pay-3', staffId: 'st-3', amount: 14000, date: '2026-07-02', month: 'June 2026' },
];

export const useStore = create<AppState>((set) => ({
  currentScreen: 'attendance', // Default screen is Attendance
  activeStaffProfileId: null,
  currentDate: new Date().toISOString().split('T')[0],
  searchQuery: '',
  staffList: initialStaff,
  attendance: generateMockAttendance(),
  advanceList: initialAdvances,
  deductionList: initialDeductions,
  payoutList: initialPayouts,
  businessInfo: {
    name: 'Flavors Bistro',
    logo: '',
    mobile: '9876543210',
    address: '12, Connaught Place, Block E, New Delhi - 110001',
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

  isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
  password: localStorage.getItem('appPassword') || 'admin123',
  
  login: (pass) => {
    let success = false;
    set((state) => {
      if (state.password === pass) {
        localStorage.setItem('isLoggedIn', 'true');
        success = true;
        return { isLoggedIn: true };
      }
      return {};
    });
    return success;
  },
  logout: () => {
    localStorage.removeItem('isLoggedIn');
    set({ isLoggedIn: false });
  },
  changePassword: (newPass) => {
    localStorage.setItem('appPassword', newPass);
    set({ password: newPass });
  },

  setScreen: (screen) => set({ currentScreen: screen }),
  setActiveStaffProfileId: (id) => set({ activeStaffProfileId: id }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  addStaff: (staff) => set((state) => {
    const initials = staff.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const newStaff: Staff = {
      ...staff,
      id: `st-${state.staffList.length + 1}`,
      avatar: initials || 'ST',
      perDaySalary: Math.round(staff.salaryType === 'Monthly' ? staff.monthlySalary / 30 : staff.monthlySalary),
    };
    return { staffList: [...state.staffList, newStaff] };
  }),

  updateStaff: (id, updates) => set((state) => ({
    staffList: state.staffList.map((s) => {
      if (s.id === id) {
        const merged = { ...s, ...updates };
        merged.perDaySalary = Math.round(
          merged.salaryType === 'Monthly' ? merged.monthlySalary / 30 : merged.monthlySalary
        );
        return merged;
      }
      return s;
    }),
  })),

  deleteStaff: (id) => set((state) => ({
    staffList: state.staffList.filter((s) => s.id !== id),
  })),

  markAttendance: (date, staffId, status) => set((state) => {
    const updatedAttendance = { ...state.attendance };
    if (!updatedAttendance[date]) {
      updatedAttendance[date] = {};
    }
    updatedAttendance[date][staffId] = {
      status,
      timestamp: new Date().toISOString(),
    };
    return { attendance: updatedAttendance };
  }),

  markAllPresent: (date) => set((state) => {
    const updatedAttendance = { ...state.attendance };
    if (!updatedAttendance[date]) {
      updatedAttendance[date] = {};
    }
    state.staffList.forEach((staff) => {
      if (staff.status === 'Active') {
        updatedAttendance[date][staff.id] = {
          status: 'Present',
          timestamp: new Date().toISOString(),
        };
      }
    });
    return { attendance: updatedAttendance };
  }),

  addAdvance: (staffId, amount, date, remarks) => set((state) => ({
    advanceList: [
      ...state.advanceList,
      {
        id: `adv-${state.advanceList.length + 1}_${Date.now()}`,
        staffId,
        amount,
        date,
        remarks,
      },
    ],
  })),

  updateAdvance: (id, amount, date, remarks) => set((state) => ({
    advanceList: state.advanceList.map((a) => (a.id === id ? { ...a, amount, date, remarks } : a)),
  })),

  deleteAdvance: (id) => set((state) => ({
    advanceList: state.advanceList.filter((a) => a.id !== id),
  })),

  addDeduction: (staffId, amount, date, remarks) => set((state) => ({
    deductionList: [
      ...state.deductionList,
      {
        id: `ded-${state.deductionList.length + 1}_${Date.now()}`,
        staffId,
        amount,
        date,
        remarks,
      },
    ],
  })),

  updateDeduction: (id, amount, date, remarks) => set((state) => ({
    deductionList: state.deductionList.map((d) => (d.id === id ? { ...d, amount, date, remarks } : d)),
  })),

  deleteDeduction: (id) => set((state) => ({
    deductionList: state.deductionList.filter((d) => d.id !== id),
  })),

  paySalary: (staffId, amount, month, date, paymentMode, remarks) => set((state) => ({
    payoutList: [
      ...state.payoutList,
      {
        id: `pay-${state.payoutList.length + 1}_${Date.now()}`,
        staffId,
        amount,
        date: date || new Date().toISOString().split('T')[0],
        month,
        paymentMode,
        remarks,
      },
    ],
  })),

  updateBusinessInfo: (info) => set((state) => ({
    businessInfo: { ...state.businessInfo, ...info },
  })),

  updateSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings },
  })),

  triggerAutoAttendance: () => set((state) => {
    if (!state.settings.autoAttendanceEnabled) return {};

    const dateStr = state.currentDate;
    const dayAttendance = state.attendance[dateStr] || {};
    
    // If attendance is already marked for this date, do not overwrite it
    if (Object.keys(dayAttendance).length > 0) return {};

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    const [targetHours, targetMinutes] = state.settings.autoAttendanceTime.split(':').map(Number);
    const isPastTime = (currentHours > targetHours) || (currentHours === targetHours && currentMinutes >= targetMinutes);

    if (!isPastTime) return {};

    const dateObj = parseISO(dateStr);
    const dayName = format(dateObj, 'EEEE');
    const isHoliday = state.settings.weeklyHoliday.includes(dayName);

    // If today is a weekly holiday, skip auto-attendance entirely
    if (isHoliday) return {};

    const updatedAttendance = { ...state.attendance };
    updatedAttendance[dateStr] = {};

    state.staffList.forEach((staff) => {
      if (staff.status === 'Active') {
        updatedAttendance[dateStr][staff.id] = {
          status: 'Present',
          timestamp: new Date().toISOString(),
        };
      }
    });

    return { attendance: updatedAttendance };
  }),
}));
