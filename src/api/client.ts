import type {
  AdvanceRecord,
  AttendanceRecord,
  BusinessInfo,
  DeductionRecord,
  PayoutRecord,
  Settings,
  Staff,
} from '../store/useStore';

export interface ApiBootstrapData {
  businessInfo: BusinessInfo;
  settings: Settings;
  staffList: Staff[];
  attendance: Record<string, Record<string, AttendanceRecord>>;
  advanceList: AdvanceRecord[];
  deductionList: DeductionRecord[];
  payoutList: PayoutRecord[];
}

interface ApiAuthResponse {
  ok: boolean;
  message?: string;
  data?: ApiBootstrapData;
}

const defaultBaseUrl = `${window.location.protocol}//${window.location.hostname}/Staff-app/api`;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || defaultBaseUrl;

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || 'Request failed.');
  }

  return payload as T;
}

export async function loginRequest(
  identifier: string,
  secret: string,
  method: 'password' | 'pin'
): Promise<ApiBootstrapData> {
  const response = await apiRequest<ApiAuthResponse>('/login.php', {
    method: 'POST',
    body: JSON.stringify({ identifier, secret, method }),
  });

  if (!response.data) {
    throw new Error('Login response did not include app data.');
  }

  return response.data;
}

export async function meRequest(): Promise<ApiBootstrapData> {
  const response = await apiRequest<ApiAuthResponse>('/me.php');

  if (!response.data) {
    throw new Error('Session response did not include app data.');
  }

  return response.data;
}

export async function logoutRequest(): Promise<void> {
  await apiRequest<{ ok: boolean }>('/logout.php', { method: 'POST' });
}

async function apiPost<T = { ok: boolean }>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function createStaffRequest(staff: Staff): Promise<void> {
  await apiPost('/staff.php', { action: 'create', staff });
}

export async function updateStaffRequest(staff: Staff): Promise<void> {
  await apiPost('/staff.php', { action: 'update', staff });
}

export async function deleteStaffRequest(id: string): Promise<void> {
  await apiPost('/staff.php', { action: 'delete', id });
}

export async function markAttendanceRequest(
  date: string,
  staffId: string,
  status: AttendanceRecord['status']
): Promise<void> {
  await apiPost('/attendance.php', { action: 'mark', date, staffId, status });
}

export async function markAttendanceBulkRequest(
  date: string,
  entries: { staffId: string; status: AttendanceRecord['status'] }[]
): Promise<void> {
  await apiPost('/attendance.php', { action: 'mark_bulk', date, entries });
}

type TransactionType = 'advance' | 'deduction';

export async function createTransactionRequest(
  type: TransactionType,
  record: { id: string; staffId: string; amount: number; date: string; remarks: string }
): Promise<void> {
  await apiPost('/transactions.php', { action: 'create', type, ...record });
}

export async function updateTransactionRequest(
  type: TransactionType,
  record: { id: string; amount: number; date: string; remarks: string }
): Promise<void> {
  await apiPost('/transactions.php', { action: 'update', type, ...record });
}

export async function deleteTransactionRequest(type: TransactionType, id: string): Promise<void> {
  await apiPost('/transactions.php', { action: 'delete', type, id });
}

export async function createPayoutRequest(payout: PayoutRecord): Promise<void> {
  await apiPost('/payout.php', { action: 'create', ...payout });
}

export async function updateBusinessRequest(businessInfo: BusinessInfo): Promise<void> {
  await apiPost('/business.php', { businessInfo });
}

export async function updateSettingsRequest(settings: Settings): Promise<void> {
  await apiPost('/settings.php', { settings });
}

export async function changePasswordRequest(oldPassword: string, newPassword: string): Promise<void> {
  await apiPost('/password.php', { oldPassword, newPassword });
}
