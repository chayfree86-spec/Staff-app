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

export interface ApiUser {
  id: string;
  businessId: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
}

interface ApiAuthResponse {
  ok: boolean;
  message?: string;
  user?: { id: number | string; businessId: number | string; name: string; mobile?: string | null; email?: string | null };
  data?: ApiBootstrapData;
}

const normalizeUser = (user: NonNullable<ApiAuthResponse['user']>): ApiUser => ({
  id: String(user.id),
  businessId: String(user.businessId),
  name: user.name,
  mobile: user.mobile,
  email: user.email,
});

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
): Promise<{ user: ApiUser | null; data: ApiBootstrapData }> {
  const response = await apiRequest<ApiAuthResponse>('/login.php', {
    method: 'POST',
    body: JSON.stringify({ identifier, secret, method }),
  });

  if (!response.data) {
    throw new Error('Login response did not include app data.');
  }

  return { user: response.user ? normalizeUser(response.user) : null, data: response.data };
}

export async function meRequest(): Promise<{ user: ApiUser | null; data: ApiBootstrapData }> {
  const response = await apiRequest<ApiAuthResponse>('/me.php');

  if (!response.data) {
    throw new Error('Session response did not include app data.');
  }

  return { user: response.user ? normalizeUser(response.user) : null, data: response.data };
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

type CreateResponse = { ok: boolean; id?: number | string };

// Create endpoints return the DB-assigned numeric id; callers swap it in place
// of the temporary local id.
export async function createStaffRequest(staff: Staff, currentDate: string): Promise<string | undefined> {
  const res = await apiPost<CreateResponse>('/staff.php', { action: 'create', staff, currentDate });
  return res.id != null ? String(res.id) : undefined;
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
  record: { staffId: string; amount: number; date: string; remarks: string }
): Promise<string | undefined> {
  const res = await apiPost<CreateResponse>('/transactions.php', { action: 'create', type, ...record });
  return res.id != null ? String(res.id) : undefined;
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

export async function createPayoutRequest(payout: Omit<PayoutRecord, 'id'>): Promise<string | undefined> {
  const res = await apiPost<CreateResponse>('/payout.php', { action: 'create', ...payout });
  return res.id != null ? String(res.id) : undefined;
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

export interface RegisterBusinessPayload {
  businessName: string;
  businessMobile?: string;
  businessAddress?: string;
  userName: string;
  userMobile?: string;
  userEmail?: string;
  password: string;
  pin?: string;
}

export async function registerBusinessRequest(payload: RegisterBusinessPayload): Promise<void> {
  await apiPost('/register-business.php', payload);
}

export interface BusinessUser {
  id: string;
  name: string;
  mobile?: string | null;
  email?: string | null;
  isActive: boolean;
  lastLoginAt?: string | null;
}

export interface BusinessAccount {
  id: string;
  name: string;
  mobile?: string | null;
  address?: string | null;
  staffCount: number;
  users: BusinessUser[];
}

export async function listBusinessesRequest(): Promise<{ businesses: BusinessAccount[]; currentUserId: string }> {
  const res = await apiPost<{ ok: boolean; businesses: BusinessAccount[]; currentUserId: string }>(
    '/businesses.php',
    { action: 'list' }
  );
  return { businesses: res.businesses || [], currentUserId: String(res.currentUserId || '') };
}

export async function toggleUserActiveRequest(userId: string, isActive: boolean): Promise<void> {
  await apiPost('/businesses.php', { action: 'toggle_user', userId, isActive });
}

export async function updateBusinessAccountRequest(business: {
  businessId: string;
  name: string;
  mobile?: string;
  address?: string;
}): Promise<void> {
  await apiPost('/businesses.php', { action: 'update_business', ...business });
}

export async function deleteBusinessRequest(businessId: string): Promise<void> {
  await apiPost('/businesses.php', { action: 'delete_business', businessId });
}

export async function updateBusinessUserRequest(user: {
  userId: string;
  name: string;
  mobile?: string;
  email?: string;
  password?: string;
  pin?: string;
}): Promise<void> {
  await apiPost('/businesses.php', { action: 'update_user', ...user });
}

export async function deleteBusinessUserRequest(userId: string): Promise<void> {
  await apiPost('/businesses.php', { action: 'delete_user', userId });
}

export async function switchBusinessRequest(businessId: string): Promise<ApiBootstrapData> {
  const res = await apiPost<{ data: ApiBootstrapData }>('/businesses.php', { action: 'switch', businessId });
  return res.data;
}
