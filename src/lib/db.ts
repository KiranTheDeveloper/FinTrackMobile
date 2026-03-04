import * as SQLite from "expo-sqlite";

let _db: SQLite.SQLiteDatabase | null = null;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync("fintrack.db");
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS services (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      service_id TEXT NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      dob TEXT,
      type TEXT NOT NULL DEFAULT 'PROSPECT',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      service_id TEXT NOT NULL,
      product_id TEXT,
      status TEXT NOT NULL DEFAULT 'NEW_ENQUIRY',
      notes TEXT,
      premium REAL,
      sum_assured REAL,
      investment_amount REAL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS status_history (
      id TEXT PRIMARY KEY,
      enquiry_id TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      notes TEXT,
      changed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      enquiry_id TEXT NOT NULL,
      due_date TEXT NOT NULL,
      message TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
  await seedServices(_db);
  return _db;
}

async function seedServices(db: SQLite.SQLiteDatabase) {
  const existing = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM services"
  );
  if (existing && existing.count > 0) return;

  const services = [
    { id: "svc-life",   name: "Life Insurance",   code: "LIFE"   },
    { id: "svc-health", name: "Health Insurance",  code: "HEALTH" },
    { id: "svc-mf",     name: "Mutual Funds",      code: "MF"     },
    { id: "svc-itr",    name: "IT Returns",        code: "ITR"    },
  ];
  const products = [
    { id: "p1",  service_id: "svc-life",   name: "LIC"           },
    { id: "p2",  service_id: "svc-life",   name: "Bajaj Life"    },
    { id: "p3",  service_id: "svc-life",   name: "ICICI Life"    },
    { id: "p4",  service_id: "svc-life",   name: "HDFC Life"     },
    { id: "p5",  service_id: "svc-health", name: "Star Health"   },
    { id: "p6",  service_id: "svc-health", name: "Care Health"   },
    { id: "p7",  service_id: "svc-health", name: "TATA AIG Health"},
    { id: "p8",  service_id: "svc-mf",     name: "NJ"            },
    { id: "p9",  service_id: "svc-mf",     name: "Prudent"       },
    { id: "p10", service_id: "svc-itr",    name: "Salaried"      },
    { id: "p11", service_id: "svc-itr",    name: "Business"      },
    { id: "p12", service_id: "svc-itr",    name: "Retired"       },
  ];

  for (const s of services) {
    await db.runAsync(
      "INSERT INTO services (id, name, code) VALUES (?, ?, ?)",
      [s.id, s.name, s.code]
    );
  }
  for (const p of products) {
    await db.runAsync(
      "INSERT INTO products (id, service_id, name) VALUES (?, ?, ?)",
      [p.id, p.service_id, p.name]
    );
  }
}
