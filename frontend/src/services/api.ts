import axios, { AxiosError } from 'axios';
import type {
  CustomerSession, CustomerProfile, Vehicle, VehicleFormData,
  Appointment, Estimate, ServiceHistory, Notification,
  MaintenanceReminder, DashboardSummary, AuthTokens,
  VehicleHealth, VehicleQRLink, VehicleDocument, InspectionReport,
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Os dados de mock do modo dev/showcase (VITE_BYPASS_LOGIN=true) não moram mais
// aqui: são servidos pela camada MSW (src/mocks) interceptando na rede. Esta
// camada voltou a ser puro cliente HTTP.

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000,
  // Envia/recebe o cookie httpOnly do refresh token (o JS nunca o lê — anti-XSS).
  withCredentials: true,
});

// ── Attach JWT to every request ───────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const raw = localStorage.getItem('customer_session');
  if (raw) {
    try {
      const session: CustomerSession = JSON.parse(raw);
      if (session.access) config.headers.Authorization = `Bearer ${session.access}`;
    } catch { /* ignore */ }
  }
  return config;
});

// ── Auto-refresh on 401 ───────────────────────────────────────────────────────
let refreshing = false;
apiClient.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const orig = error.config as any;
    if (error.response?.status === 401 && !orig._retry && !refreshing) {
        orig._retry = true;
        refreshing = true;
        try {
          const raw = localStorage.getItem('customer_session');
          if (raw) {
            const session: CustomerSession = JSON.parse(raw);
            // O refresh token vem do cookie httpOnly (withCredentials). O corpo
            // segue apenas como fallback para sessões antigas ainda no localStorage.
            const { data } = await axios.post(
              `${BASE_URL}/customer/auth/refresh`,
              session.refresh ? { refresh: session.refresh } : {},
              { withCredentials: true },
            );
            session.access = data.access;
            localStorage.setItem('customer_session', JSON.stringify(session));
            orig.headers.Authorization = `Bearer ${data.access}`;
            return apiClient(orig);
          }
        } catch {
          localStorage.removeItem('customer_session');
          window.location.href = '/';
        } finally {
          refreshing = false;
        }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: { name: string; email: string; phone: string; password: string; password_confirm: string }) =>
    apiClient.post<AuthTokens & { customer: { id: string; name: string; email: string } }>('/customer/auth/register', data),

  login: (email: string, password: string) =>
    apiClient.post<AuthTokens & { customer: { id: string; name: string; email: string } }>('/customer/auth/login', { email, password }),

  forgotPassword: (email: string) =>
    apiClient.post('/customer/auth/forgot-password', { email }),

  resetPassword: (token: string, new_password: string, new_password_confirm: string) =>
    apiClient.post('/customer/auth/reset-password', { token, new_password, new_password_confirm }),

  verifyEmail: (token: string) =>
    apiClient.post('/customer/auth/verify-email', { token }),

  resendVerification: (email: string) =>
    apiClient.post('/customer/auth/resend-verification', { email }),

  logout: () =>
    apiClient.post('/customer/auth/logout').catch(() => { /* limpar cookie é best-effort */ }),
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const profileApi = {
  get: () => apiClient.get<CustomerProfile>('/customer/me'),
  update: (data: Partial<CustomerProfile>) => apiClient.patch<CustomerProfile>('/customer/me', data),
  changePassword: (data: { old_password: string; new_password: string; new_password_confirm: string }) =>
    apiClient.post('/customer/me/change-password', data),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const dashboardApi = {
  get: () => apiClient.get<DashboardSummary>('/customer/dashboard'),
};

// ── Vehicles ──────────────────────────────────────────────────────────────────

export const vehiclesApi = {
  list: () => apiClient.get<Vehicle[]>('/customer/vehicles'),
  get: (id: string) => apiClient.get<Vehicle>(`/customer/vehicles/${id}`),
  create: (data: VehicleFormData) => apiClient.post<Vehicle>('/customer/vehicles', data),
  update: (id: string, data: Partial<VehicleFormData>) => apiClient.patch<Vehicle>(`/customer/vehicles/${id}`, data),
  delete: (id: string) => apiClient.delete(`/customer/vehicles/${id}`),
};

// ── Appointments ──────────────────────────────────────────────────────────────

export const appointmentsApi = {
  list: (statusFilter?: string) =>
    apiClient.get<Appointment[]>('/customer/appointments', { params: statusFilter ? { status: statusFilter } : {} }),
  get: (id: string) => apiClient.get<Appointment>(`/customer/appointments/${id}`),
  create: (data: {
    vehicle_id: string; service_type: string; service_description?: string;
    date: string; time_slot: string; notes?: string;
  }) => apiClient.post<Appointment>('/customer/appointments', data),
  cancel: (id: string) => apiClient.delete(`/customer/appointments/${id}`),
};

// ── Availability ──────────────────────────────────────────────────────────────

export const availabilityApi = {
  getDays: (year: number, month: number) =>
    apiClient.get<{ year: number; month: number; available_dates: string[] }>('/customer/availability', { params: { year, month } }),
  getTimes: (date: string) =>
    apiClient.get<{ date: string; times: string[] }>('/customer/availability/times', { params: { date } }),
};

// ── Estimates ─────────────────────────────────────────────────────────────────

export const estimatesApi = {
  list: (statusFilter?: string) =>
    apiClient.get<Estimate[]>('/customer/estimates', { params: statusFilter ? { status: statusFilter } : {} }),
  get: (id: string) => apiClient.get<Estimate>(`/customer/estimates/${id}`),
  approve: (id: string, comment?: string) => apiClient.post(`/customer/estimates/${id}`, { action: 'aprovar', comment }),
  reject: (id: string, comment?: string) => apiClient.post(`/customer/estimates/${id}`, { action: 'rejeitar', comment }),
};

// ── History ───────────────────────────────────────────────────────────────────

export const historyApi = {
  list: (vehicleId?: string) =>
    apiClient.get<ServiceHistory[]>('/customer/history', { params: vehicleId ? { vehicle_id: vehicleId } : {} }),
  get: (id: string) => apiClient.get<ServiceHistory>(`/customer/history/${id}`),
};

export const inspectionsApi = {
  get: (id: string) => apiClient.get<InspectionReport>(`/customer/inspections/${id}`),
};

// ── Notifications ─────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (unreadOnly = false) =>
    apiClient.get<Notification[]>('/customer/notifications', { params: unreadOnly ? { unread: 'true' } : {} }),
  get: (id: string) => apiClient.get<Notification>(`/customer/notifications/${id}`),
  markRead: (id: string) => apiClient.post(`/customer/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/customer/notifications/read-all'),
};

// ── Reminders ─────────────────────────────────────────────────────────────────

export const remindersApi = {
  list: () => apiClient.get<MaintenanceReminder[]>('/customer/reminders'),
};

// ── Vehicle Health ────────────────────────────────────────────────────────────

export const healthApi = {
  get: (vehicleId: string) => apiClient.get<VehicleHealth>(`/customer/vehicles/${vehicleId}/health`),
};

// ── QR Code ───────────────────────────────────────────────────────────────────

export const qrCodeApi = {
  get: (vehicleId: string) => apiClient.get<VehicleQRLink>(`/customer/vehicles/${vehicleId}/qr`),
  refresh: (vehicleId: string) => apiClient.post<VehicleQRLink>(`/customer/vehicles/${vehicleId}/qr/refresh`),
};

// ── Documents ─────────────────────────────────────────────────────────────────

export const documentsApi = {
  list: (vehicleId?: string) =>
    apiClient.get<VehicleDocument[]>('/customer/documents', { params: vehicleId ? { vehicle_id: vehicleId } : {} }),
  upload: (data: FormData) => apiClient.post<VehicleDocument>('/customer/documents', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: string) => apiClient.delete(`/customer/documents/${id}`),
};
