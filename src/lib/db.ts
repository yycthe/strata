import Database from 'better-sqlite3';
import path from 'path';

// For Vercel, use a writable path. For local dev, use the project root.
const dbPath = process.env.VERCEL
  ? path.join('/tmp', 'workflow.db')
  : path.join(process.cwd(), 'workflow.db');
  
const db = new Database(dbPath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

// Schema definition
const createTables = () => {
  const schema = `
    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      subject TEXT,
      sender TEXT,
      receivedAt TEXT,
      content TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      planCode TEXT,
      allPlanCodes TEXT,
      aiSummary TEXT,
      audience TEXT,
      attachments TEXT,
      assignedOwnerId TEXT,
      assignedOwnerIds TEXT
    );

    CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        address_1 TEXT,
        city TEXT,
        state TEXT,
        postal_code TEXT,
        plan_code TEXT,
        unit_number TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      window INTEGER NOT NULL,
      status TEXT NOT NULL,
      found INTEGER NOT NULL,
      inserted INTEGER NOT NULL,
      skipped INTEGER NOT NULL,
      matched INTEGER NOT NULL,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_notices_status ON notices(status);
    CREATE INDEX IF NOT EXISTS idx_notices_planCode ON notices(planCode);
    CREATE INDEX IF NOT EXISTS idx_notices_receivedAt ON notices(receivedAt);
  `;
  db.exec(schema);
};

createTables();

console.log('Database initialized and tables created if not exist.');

export default db;
