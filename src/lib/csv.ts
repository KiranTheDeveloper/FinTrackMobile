import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { getDB, genId } from "./db";

// ── Helpers ───────────────────────────────────────────────────────────────────
function escape(val: string | null | undefined): string {
  if (val == null) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function parseCSV(text: string): string[][] {
  return text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const cols: string[] = [];
      let cur = "";
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"' && !inQuote) { inQuote = true; }
        else if (ch === '"' && inQuote && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"' && inQuote) { inQuote = false; }
        else if (ch === "," && !inQuote) { cols.push(cur); cur = ""; }
        else { cur += ch; }
      }
      cols.push(cur);
      return cols;
    });
}

async function shareFile(path: string, mimeType: string) {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error("Sharing is not available on this device");
  await Sharing.shareAsync(path, { mimeType, dialogTitle: "Save or share file" });
}

// ── Export ────────────────────────────────────────────────────────────────────
export async function exportClientsCSV(): Promise<void> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: string; name: string; mobile: string; email: string | null;
    dob: string | null; type: string; created_at: string;
  }>("SELECT * FROM clients ORDER BY created_at DESC");

  const header = "id,name,mobile,email,dob,type,created_at";
  const lines = rows.map(r =>
    [r.id, r.name, r.mobile, r.email, r.dob, r.type, r.created_at].map(escape).join(",")
  );
  const csv = [header, ...lines].join("\n");

  const path = FileSystem.documentDirectory + "fintrack_clients.csv";
  await FileSystem.writeAsStringAsync(path, csv, { encoding: "utf8" });
  await shareFile(path, "text/csv");
}

export async function exportEnquiriesCSV(): Promise<void> {
  const db = await getDB();
  const rows = await db.getAllAsync<{
    id: string; status: string; notes: string | null;
    premium: number | null; sum_assured: number | null; investment_amount: number | null;
    created_at: string; updated_at: string;
    c_mobile: string; s_code: string; p_name: string | null;
  }>(`
    SELECT e.id, e.status, e.notes, e.premium, e.sum_assured, e.investment_amount,
      e.created_at, e.updated_at,
      c.mobile as c_mobile, s.code as s_code, p.name as p_name
    FROM enquiries e
    JOIN clients c ON e.client_id = c.id
    JOIN services s ON e.service_id = s.id
    LEFT JOIN products p ON e.product_id = p.id
    ORDER BY e.created_at DESC
  `);

  const header = "id,client_mobile,service_code,product_name,status,notes,premium,sum_assured,investment_amount,created_at,updated_at";
  const lines = rows.map(r =>
    [r.id, r.c_mobile, r.s_code, r.p_name, r.status, r.notes,
      r.premium, r.sum_assured, r.investment_amount, r.created_at, r.updated_at
    ].map(v => escape(v != null ? String(v) : null)).join(",")
  );
  const csv = [header, ...lines].join("\n");

  const path = FileSystem.documentDirectory + "fintrack_enquiries.csv";
  await FileSystem.writeAsStringAsync(path, csv, { encoding: "utf8" });
  await shareFile(path, "text/csv");
}

// ── Import ────────────────────────────────────────────────────────────────────
export async function importClientsCSV(): Promise<{ imported: number; skipped: number }> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) throw new Error("No file selected");

  const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: "utf8" });
  const rows = parseCSV(content);
  if (rows.length < 2) throw new Error("CSV is empty or has no data rows");

  // Skip header row
  const dataRows = rows.slice(1);
  const db = await getDB();
  let imported = 0, skipped = 0;

  for (const cols of dataRows) {
    // Columns: id,name,mobile,email,dob,type,created_at
    if (cols.length < 3) { skipped++; continue; }
    const [, name, mobile, email, dob, type, created_at] = cols;
    if (!name || !mobile) { skipped++; continue; }

    const existing = await db.getFirstAsync<{ id: string }>(
      "SELECT id FROM clients WHERE mobile = ?", [mobile]
    );
    if (existing) { skipped++; continue; }

    const validType = (type === "EXISTING_CLIENT" || type === "PROSPECT") ? type : "PROSPECT";
    await db.runAsync(
      "INSERT INTO clients (id, name, mobile, email, dob, type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [genId(), name, mobile, email || null, dob || null, validType, created_at || new Date().toISOString()]
    );
    imported++;
  }

  return { imported, skipped };
}

export async function importEnquiriesCSV(): Promise<{ imported: number; skipped: number }> {
  const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.length) throw new Error("No file selected");

  const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: "utf8" });
  const rows = parseCSV(content);
  if (rows.length < 2) throw new Error("CSV is empty or has no data rows");

  const dataRows = rows.slice(1);
  const db = await getDB();
  let imported = 0, skipped = 0;

  for (const cols of dataRows) {
    // Columns: id,client_mobile,service_code,product_name,status,notes,premium,sum_assured,investment_amount,created_at,updated_at
    if (cols.length < 4) { skipped++; continue; }
    const [, clientMobile, serviceCode, productName, status, notes, premium, sumAssured, investmentAmount, createdAt, updatedAt] = cols;

    const client = await db.getFirstAsync<{ id: string }>("SELECT id FROM clients WHERE mobile = ?", [clientMobile]);
    if (!client) { skipped++; continue; }

    const service = await db.getFirstAsync<{ id: string }>("SELECT id FROM services WHERE code = ?", [serviceCode]);
    if (!service) { skipped++; continue; }

    let productId: string | null = null;
    if (productName) {
      const prod = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM products WHERE name = ? AND service_id = ?", [productName, service.id]
      );
      productId = prod?.id ?? null;
    }

    const now = new Date().toISOString();
    await db.runAsync(
      "INSERT INTO enquiries (id, client_id, service_id, product_id, status, notes, premium, sum_assured, investment_amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [genId(), client.id, service.id, productId, status || "NEW_ENQUIRY",
        notes || null, premium ? parseFloat(premium) : null,
        sumAssured ? parseFloat(sumAssured) : null,
        investmentAmount ? parseFloat(investmentAmount) : null,
        createdAt || now, updatedAt || now]
    );
    imported++;
  }

  return { imported, skipped };
}
