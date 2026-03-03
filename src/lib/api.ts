// Point this to your deployed Vercel URL in production
// For local dev, use your machine's LAN IP (not localhost — emulator can't reach it)
export const API_BASE = "https://fin-products-application-tracker.vercel.app";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────

export type ClientType = "PROSPECT" | "EXISTING_CLIENT";
export type EnquiryStatus =
  | "NEW_ENQUIRY" | "KYC_PENDING" | "KYC_RECEIVED" | "PRODUCT_PROPOSED"
  | "QUOTE_SHARED" | "CONFIRMATION_RECEIVED" | "DEAL_CLOSED"
  | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "DROPPED";

export interface Client {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  dob?: string;
  type: ClientType;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  code: string;
  products: Product[];
}

export interface Product {
  id: string;
  name: string;
  serviceId: string;
}

export interface Reminder {
  id: string;
  enquiryId: string;
  dueDate: string;
  message: string;
  isCompleted: boolean;
}

export interface Enquiry {
  id: string;
  clientId: string;
  serviceId: string;
  productId?: string;
  status: EnquiryStatus;
  notes?: string;
  premium?: number;
  sumAssured?: number;
  investmentAmount?: number;
  createdAt: string;
  updatedAt: string;
  client: Client;
  service: Service;
  product?: Product;
  reminders: Reminder[];
}

export interface StatusHistory {
  id: string;
  fromStatus?: string;
  toStatus: string;
  notes?: string;
  changedAt: string;
}

export interface DashboardStats {
  stats: {
    totalClients: number;
    activeEnquiries: number;
    kycPending: number;
    dealsThisMonth: number;
  };
  overdueReminders: (Reminder & { enquiry: Enquiry })[];
  todayReminders: (Reminder & { enquiry: Enquiry })[];
  recentActivity: (StatusHistory & { enquiry: Enquiry })[];
}

// ── API calls ──────────────────────────────────────────────────────────

export const api = {
  // Dashboard
  dashboard: () => request<DashboardStats>("/api/dashboard"),

  // Clients
  clients: {
    list: (search = "", type = "") =>
      request<Client[]>(`/api/clients?search=${encodeURIComponent(search)}&type=${encodeURIComponent(type)}`),
    get: (id: string) => request<Client & { enquiries: Enquiry[]; documents: unknown[] }>(`/api/clients/${id}`),
    create: (data: { name: string; mobile: string; email?: string; dob?: string; type: ClientType }) =>
      request<Client>("/api/clients", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<{ name: string; mobile: string; email: string; dob: string; type: ClientType }>) =>
      request<Client>(`/api/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  },

  // Enquiries
  enquiries: {
    list: (service = "", status = "") =>
      request<Enquiry[]>(`/api/enquiries?service=${service}&status=${status}`),
    get: (id: string) =>
      request<Enquiry & { statusHistory: StatusHistory[] }>(`/api/enquiries/${id}`),
    create: (data: {
      clientId: string; serviceId: string; productId?: string;
      notes?: string; premium?: number; sumAssured?: number;
      investmentAmount?: number; reminderDate?: string; reminderMessage?: string;
    }) => request<Enquiry>("/api/enquiries", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, data: { status: EnquiryStatus; notes?: string; reminderDate?: string; reminderMessage?: string }) =>
      request<Enquiry>(`/api/enquiries/${id}/status`, { method: "POST", body: JSON.stringify(data) }),
  },

  // Reminders
  reminders: {
    list: () => request<(Reminder & { enquiry: Enquiry })[]>("/api/reminders"),
    complete: (id: string) =>
      request<Reminder>(`/api/reminders/${id}`, { method: "PUT", body: JSON.stringify({ isCompleted: true }) }),
  },

  // Masters
  masters: () => request<Service[]>("/api/masters"),
};
