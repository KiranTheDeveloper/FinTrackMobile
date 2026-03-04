import { getDB, genId } from "./db";

// ── Types (unchanged — screens use these) ─────────────────────────────────────
export type ClientType = "PROSPECT" | "EXISTING_CLIENT";
export type EnquiryStatus =
  | "NEW_ENQUIRY" | "KYC_PENDING" | "KYC_RECEIVED" | "PRODUCT_PROPOSED"
  | "QUOTE_SHARED" | "CONFIRMATION_RECEIVED" | "DEAL_CLOSED"
  | "IN_PROGRESS" | "COMPLETED" | "ON_HOLD" | "DROPPED";

export interface Client {
  id: string; name: string; mobile: string; email?: string;
  dob?: string; type: ClientType; createdAt: string;
}
export interface Service {
  id: string; name: string; code: string; products: Product[];
}
export interface Product { id: string; name: string; serviceId: string; }
export interface Reminder {
  id: string; enquiryId: string; dueDate: string; message: string; isCompleted: boolean;
}
export interface Enquiry {
  id: string; clientId: string; serviceId: string; productId?: string;
  status: EnquiryStatus; notes?: string; premium?: number;
  sumAssured?: number; investmentAmount?: number;
  createdAt: string; updatedAt: string;
  client: Client; service: Service; product?: Product; reminders: Reminder[];
}
export interface StatusHistory {
  id: string; fromStatus?: string; toStatus: string; notes?: string; changedAt: string;
}
export interface DashboardStats {
  stats: { totalClients: number; activeEnquiries: number; kycPending: number; dealsThisMonth: number };
  overdueReminders: (Reminder & { enquiry: Enquiry })[];
  todayReminders: (Reminder & { enquiry: Enquiry })[];
  recentActivity: (StatusHistory & { enquiry: Enquiry })[];
}

// ── Row types from SQLite ─────────────────────────────────────────────────────
type ClientRow = {
  id: string; name: string; mobile: string; email: string | null;
  dob: string | null; type: string; created_at: string;
};
type EnquiryRow = {
  id: string; client_id: string; service_id: string; product_id: string | null;
  status: string; notes: string | null; premium: number | null;
  sum_assured: number | null; investment_amount: number | null;
  created_at: string; updated_at: string;
  c_id: string; c_name: string; c_mobile: string; c_email: string | null;
  c_dob: string | null; c_type: string; c_created_at: string;
  s_id: string; s_name: string; s_code: string;
  p_id: string | null; p_name: string | null;
};
type ReminderRow = {
  id: string; enquiry_id: string; due_date: string;
  message: string; is_completed: number; created_at: string;
};
type StatusHistoryRow = {
  id: string; enquiry_id: string; from_status: string | null;
  to_status: string; notes: string | null; changed_at: string;
};

// ── Row mappers ───────────────────────────────────────────────────────────────
const ENQUIRY_SELECT = `
  SELECT e.id, e.client_id, e.service_id, e.product_id, e.status, e.notes,
    e.premium, e.sum_assured, e.investment_amount, e.created_at, e.updated_at,
    c.id as c_id, c.name as c_name, c.mobile as c_mobile, c.email as c_email,
    c.dob as c_dob, c.type as c_type, c.created_at as c_created_at,
    s.id as s_id, s.name as s_name, s.code as s_code,
    p.id as p_id, p.name as p_name
  FROM enquiries e
  JOIN clients c ON e.client_id = c.id
  JOIN services s ON e.service_id = s.id
  LEFT JOIN products p ON e.product_id = p.id`;

function rowToClient(r: ClientRow): Client {
  return {
    id: r.id, name: r.name, mobile: r.mobile,
    email: r.email ?? undefined, dob: r.dob ?? undefined,
    type: r.type as ClientType, createdAt: r.created_at,
  };
}

function rowToEnquiry(r: EnquiryRow, reminders: Reminder[] = []): Enquiry {
  return {
    id: r.id, clientId: r.client_id, serviceId: r.s_id,
    productId: r.p_id ?? undefined, status: r.status as EnquiryStatus,
    notes: r.notes ?? undefined, premium: r.premium ?? undefined,
    sumAssured: r.sum_assured ?? undefined, investmentAmount: r.investment_amount ?? undefined,
    createdAt: r.created_at, updatedAt: r.updated_at,
    client: {
      id: r.c_id, name: r.c_name, mobile: r.c_mobile,
      email: r.c_email ?? undefined, dob: r.c_dob ?? undefined,
      type: r.c_type as ClientType, createdAt: r.c_created_at,
    },
    service: { id: r.s_id, name: r.s_name, code: r.s_code, products: [] },
    product: r.p_id ? { id: r.p_id, name: r.p_name!, serviceId: r.s_id } : undefined,
    reminders,
  };
}

function rowToReminder(r: ReminderRow): Reminder {
  return {
    id: r.id, enquiryId: r.enquiry_id, dueDate: r.due_date,
    message: r.message, isCompleted: r.is_completed === 1,
  };
}

function rowToStatusHistory(r: StatusHistoryRow): StatusHistory {
  return {
    id: r.id, fromStatus: r.from_status ?? undefined,
    toStatus: r.to_status, notes: r.notes ?? undefined, changedAt: r.changed_at,
  };
}

async function getPendingReminders(enquiryIds: string[]): Promise<Record<string, Reminder[]>> {
  if (enquiryIds.length === 0) return {};
  const db = await getDB();
  const placeholders = enquiryIds.map(() => "?").join(",");
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM reminders WHERE enquiry_id IN (${placeholders}) AND is_completed = 0 ORDER BY due_date ASC`,
    enquiryIds
  );
  const map: Record<string, Reminder[]> = {};
  for (const r of rows) {
    if (!map[r.enquiry_id]) map[r.enquiry_id] = [];
    map[r.enquiry_id].push(rowToReminder(r));
  }
  return map;
}

// ── API object (same interface as before — screens unchanged) ─────────────────
export const api = {

  dashboard: async (): Promise<DashboardStats> => {
    const db = await getDB();
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [tc, ae, kp, dm] = await Promise.all([
      db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM clients"),
      db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM enquiries WHERE status NOT IN ('COMPLETED','DROPPED')"),
      db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM enquiries WHERE status='KYC_PENDING'"),
      db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM enquiries WHERE status='DEAL_CLOSED' AND updated_at >= ?", [monthStart]),
    ]);

    type ReminderJoinRow = ReminderRow & { e_id: string; e_status: string; e_updated_at: string; c_id: string; c_name: string; c_mobile: string; c_email: string | null; c_dob: string | null; c_type: string; c_created_at: string; s_id: string; s_name: string; s_code: string };
    const reminderJoinSQL = `
      SELECT r.*, e.id as e_id, e.status as e_status, e.updated_at as e_updated_at,
        c.id as c_id, c.name as c_name, c.mobile as c_mobile, c.email as c_email,
        c.dob as c_dob, c.type as c_type, c.created_at as c_created_at,
        s.id as s_id, s.name as s_name, s.code as s_code
      FROM reminders r
      JOIN enquiries e ON r.enquiry_id = e.id
      JOIN clients c ON e.client_id = c.id
      JOIN services s ON e.service_id = s.id
      WHERE r.is_completed = 0`;

    const overdue = await db.getAllAsync<ReminderJoinRow>(
      reminderJoinSQL + " AND r.due_date < ? ORDER BY r.due_date ASC",
      [todayStart.toISOString()]
    );
    const today = await db.getAllAsync<ReminderJoinRow>(
      reminderJoinSQL + " AND r.due_date >= ? AND r.due_date <= ? ORDER BY r.due_date ASC",
      [todayStart.toISOString(), todayEnd.toISOString()]
    );

    const makeReminderWithEnquiry = (r: ReminderJoinRow) => ({
      id: r.id, enquiryId: r.enquiry_id, dueDate: r.due_date,
      message: r.message, isCompleted: false,
      enquiry: rowToEnquiry({
        id: r.e_id, client_id: r.c_id, service_id: r.s_id,
        product_id: null, status: r.e_status, notes: null,
        premium: null, sum_assured: null, investment_amount: null,
        created_at: r.c_created_at, updated_at: r.e_updated_at,
        c_id: r.c_id, c_name: r.c_name, c_mobile: r.c_mobile,
        c_email: r.c_email, c_dob: r.c_dob, c_type: r.c_type, c_created_at: r.c_created_at,
        s_id: r.s_id, s_name: r.s_name, s_code: r.s_code, p_id: null, p_name: null,
      } as EnquiryRow),
    });

    type HistoryJoinRow = StatusHistoryRow & { e_id: string; c_name: string; s_name: string; c_mobile: string; c_type: string; c_created_at: string; c_email: string | null; c_dob: string | null; s_id: string; s_code: string; c_id: string; e_updated_at: string };
    const activityRows = await db.getAllAsync<HistoryJoinRow>(`
      SELECT h.*, e.id as e_id, e.updated_at as e_updated_at,
        c.id as c_id, c.name as c_name, c.mobile as c_mobile, c.email as c_email,
        c.dob as c_dob, c.type as c_type, c.created_at as c_created_at,
        s.id as s_id, s.name as s_name, s.code as s_code
      FROM status_history h
      JOIN enquiries e ON h.enquiry_id = e.id
      JOIN clients c ON e.client_id = c.id
      JOIN services s ON e.service_id = s.id
      ORDER BY h.changed_at DESC LIMIT 10
    `);

    return {
      stats: {
        totalClients: tc?.count ?? 0,
        activeEnquiries: ae?.count ?? 0,
        kycPending: kp?.count ?? 0,
        dealsThisMonth: dm?.count ?? 0,
      },
      overdueReminders: overdue.map(makeReminderWithEnquiry),
      todayReminders: today.map(makeReminderWithEnquiry),
      recentActivity: activityRows.map(h => ({
        id: h.id, fromStatus: h.from_status ?? undefined,
        toStatus: h.to_status, notes: h.notes ?? undefined, changedAt: h.changed_at,
        enquiry: rowToEnquiry({
          id: h.e_id, client_id: h.c_id, service_id: h.s_id,
          product_id: null, status: "", notes: null,
          premium: null, sum_assured: null, investment_amount: null,
          created_at: h.c_created_at, updated_at: h.e_updated_at,
          c_id: h.c_id, c_name: h.c_name, c_mobile: h.c_mobile,
          c_email: h.c_email, c_dob: h.c_dob, c_type: h.c_type, c_created_at: h.c_created_at,
          s_id: h.s_id, s_name: h.s_name, s_code: h.s_code, p_id: null, p_name: null,
        } as EnquiryRow),
      })),
    };
  },

  clients: {
    list: async (search = "", type = ""): Promise<Client[]> => {
      const db = await getDB();
      const conditions: string[] = [];
      const params: string[] = [];
      if (search) { conditions.push("(name LIKE ? OR mobile LIKE ?)"); params.push(`%${search}%`, `%${search}%`); }
      if (type) { conditions.push("type = ?"); params.push(type); }
      const where = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
      const rows = await db.getAllAsync<ClientRow>("SELECT * FROM clients" + where + " ORDER BY created_at DESC", params);
      return rows.map(rowToClient);
    },

    get: async (id: string): Promise<Client & { enquiries: Enquiry[]; documents: unknown[] }> => {
      const db = await getDB();
      const clientRow = await db.getFirstAsync<ClientRow>("SELECT * FROM clients WHERE id = ?", [id]);
      if (!clientRow) throw new Error("Client not found");
      const enquiryRows = await db.getAllAsync<EnquiryRow>(ENQUIRY_SELECT + " WHERE e.client_id = ? ORDER BY e.updated_at DESC", [id]);
      const enquiryIds = enquiryRows.map(r => r.id);
      const reminderMap = await getPendingReminders(enquiryIds);
      const enquiries = enquiryRows.map(r => rowToEnquiry(r, reminderMap[r.id]?.slice(0, 1) ?? []));
      return { ...rowToClient(clientRow), enquiries, documents: [] };
    },

    create: async (data: { name: string; mobile: string; email?: string; dob?: string; type: ClientType }): Promise<Client> => {
      const db = await getDB();
      const id = genId();
      const now = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO clients (id, name, mobile, email, dob, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [id, data.name, data.mobile, data.email ?? null, data.dob ?? null, data.type, now]
      );
      return { id, name: data.name, mobile: data.mobile, email: data.email, dob: data.dob, type: data.type, createdAt: now };
    },

    update: async (id: string, data: Partial<{ name: string; mobile: string; email: string; dob: string; type: ClientType }>): Promise<Client> => {
      const db = await getDB();
      const entries = Object.entries(data).filter(([, v]) => v !== undefined);
      if (entries.length === 0) throw new Error("Nothing to update");
      const sets = entries.map(([k]) => `${k} = ?`).join(", ");
      const vals = entries.map(([, v]) => v);
      await db.runAsync(`UPDATE clients SET ${sets} WHERE id = ?`, [...vals, id]);
      const row = await db.getFirstAsync<ClientRow>("SELECT * FROM clients WHERE id = ?", [id]);
      return rowToClient(row!);
    },
  },

  enquiries: {
    list: async (service = "", status = ""): Promise<Enquiry[]> => {
      const db = await getDB();
      const conditions: string[] = [];
      const params: string[] = [];
      if (service) { conditions.push("s.code = ?"); params.push(service); }
      if (status) { conditions.push("e.status = ?"); params.push(status); }
      const where = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
      const rows = await db.getAllAsync<EnquiryRow>(ENQUIRY_SELECT + where + " ORDER BY e.updated_at DESC", params);
      const reminderMap = await getPendingReminders(rows.map(r => r.id));
      return rows.map(r => rowToEnquiry(r, reminderMap[r.id]?.slice(0, 1) ?? []));
    },

    get: async (id: string): Promise<Enquiry & { statusHistory: StatusHistory[] }> => {
      const db = await getDB();
      const row = await db.getFirstAsync<EnquiryRow>(ENQUIRY_SELECT + " WHERE e.id = ?", [id]);
      if (!row) throw new Error("Enquiry not found");
      const [reminderRows, historyRows] = await Promise.all([
        db.getAllAsync<ReminderRow>("SELECT * FROM reminders WHERE enquiry_id = ? ORDER BY due_date ASC", [id]),
        db.getAllAsync<StatusHistoryRow>("SELECT * FROM status_history WHERE enquiry_id = ? ORDER BY changed_at DESC", [id]),
      ]);
      return { ...rowToEnquiry(row, reminderRows.map(rowToReminder)), statusHistory: historyRows.map(rowToStatusHistory) };
    },

    create: async (data: { clientId: string; serviceId: string; productId?: string; notes?: string; premium?: number; sumAssured?: number; investmentAmount?: number; reminderDate?: string; reminderMessage?: string }): Promise<Enquiry> => {
      const db = await getDB();
      const id = genId();
      const now = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO enquiries (id, client_id, service_id, product_id, status, notes, premium, sum_assured, investment_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [id, data.clientId, data.serviceId, data.productId ?? null, "NEW_ENQUIRY", data.notes ?? null, data.premium ?? null, data.sumAssured ?? null, data.investmentAmount ?? null, now, now]
      );
      await db.runAsync(
        "INSERT INTO status_history (id, enquiry_id, from_status, to_status, notes, changed_at) VALUES (?, ?, ?, ?, ?, ?)",
        [genId(), id, null, "NEW_ENQUIRY", "Enquiry created", now]
      );
      if (data.reminderDate && data.reminderMessage) {
        await db.runAsync(
          "INSERT INTO reminders (id, enquiry_id, due_date, message, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [genId(), id, data.reminderDate, data.reminderMessage, 0, now]
        );
      }
      const row = await db.getFirstAsync<EnquiryRow>(ENQUIRY_SELECT + " WHERE e.id = ?", [id]);
      return rowToEnquiry(row!);
    },

    updateStatus: async (id: string, data: { status: EnquiryStatus; notes?: string; reminderDate?: string; reminderMessage?: string }): Promise<Enquiry> => {
      const db = await getDB();
      const current = await db.getFirstAsync<{ status: string }>("SELECT status FROM enquiries WHERE id = ?", [id]);
      const now = new Date().toISOString();
      await db.runAsync("UPDATE enquiries SET status = ?, updated_at = ? WHERE id = ?", [data.status, now, id]);
      await db.runAsync(
        "INSERT INTO status_history (id, enquiry_id, from_status, to_status, notes, changed_at) VALUES (?, ?, ?, ?, ?, ?)",
        [genId(), id, current?.status ?? null, data.status, data.notes ?? null, now]
      );
      if (data.reminderDate && data.reminderMessage) {
        await db.runAsync(
          "INSERT INTO reminders (id, enquiry_id, due_date, message, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [genId(), id, data.reminderDate, data.reminderMessage, 0, now]
        );
      }
      const row = await db.getFirstAsync<EnquiryRow>(ENQUIRY_SELECT + " WHERE e.id = ?", [id]);
      return rowToEnquiry(row!);
    },
  },

  reminders: {
    add: async (enquiryId: string, dueDate: string, message: string): Promise<Reminder> => {
      const db = await getDB();
      const id = genId();
      const now = new Date().toISOString();
      await db.runAsync(
        "INSERT INTO reminders (id, enquiry_id, due_date, message, is_completed, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [id, enquiryId, dueDate, message, 0, now]
      );
      return { id, enquiryId, dueDate, message, isCompleted: false };
    },

    list: async (): Promise<(Reminder & { enquiry: Enquiry })[]> => {
      const db = await getDB();
      type RJ = ReminderRow & { e_id: string; e_status: string; e_updated_at: string; c_id: string; c_name: string; c_mobile: string; c_email: string | null; c_dob: string | null; c_type: string; c_created_at: string; s_id: string; s_name: string; s_code: string };
      const rows = await db.getAllAsync<RJ>(`
        SELECT r.*, e.id as e_id, e.status as e_status, e.updated_at as e_updated_at,
          c.id as c_id, c.name as c_name, c.mobile as c_mobile, c.email as c_email,
          c.dob as c_dob, c.type as c_type, c.created_at as c_created_at,
          s.id as s_id, s.name as s_name, s.code as s_code
        FROM reminders r
        JOIN enquiries e ON r.enquiry_id = e.id
        JOIN clients c ON e.client_id = c.id
        JOIN services s ON e.service_id = s.id
        ORDER BY r.is_completed ASC, r.due_date ASC
      `);
      return rows.map(r => ({
        id: r.id, enquiryId: r.enquiry_id, dueDate: r.due_date,
        message: r.message, isCompleted: r.is_completed === 1,
        enquiry: rowToEnquiry({
          id: r.e_id, client_id: r.c_id, service_id: r.s_id, product_id: null,
          status: r.e_status, notes: null, premium: null, sum_assured: null, investment_amount: null,
          created_at: r.c_created_at, updated_at: r.e_updated_at,
          c_id: r.c_id, c_name: r.c_name, c_mobile: r.c_mobile, c_email: r.c_email,
          c_dob: r.c_dob, c_type: r.c_type, c_created_at: r.c_created_at,
          s_id: r.s_id, s_name: r.s_name, s_code: r.s_code, p_id: null, p_name: null,
        } as EnquiryRow),
      }));
    },

    complete: async (id: string): Promise<Reminder> => {
      const db = await getDB();
      await db.runAsync("UPDATE reminders SET is_completed = 1 WHERE id = ?", [id]);
      const row = await db.getFirstAsync<ReminderRow>("SELECT * FROM reminders WHERE id = ?", [id]);
      return rowToReminder(row!);
    },
  },

  masters: async (): Promise<Service[]> => {
    const db = await getDB();
    const services = await db.getAllAsync<{ id: string; name: string; code: string }>("SELECT * FROM services ORDER BY code");
    const products = await db.getAllAsync<{ id: string; service_id: string; name: string }>("SELECT * FROM products ORDER BY name");
    return services.map(s => ({
      id: s.id, name: s.name, code: s.code,
      products: products.filter(p => p.service_id === s.id).map(p => ({ id: p.id, name: p.name, serviceId: p.service_id })),
    }));
  },
};
