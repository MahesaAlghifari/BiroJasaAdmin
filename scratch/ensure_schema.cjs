const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/data/database.sqlite');

// Check schema definitions
db.exec(`
  CREATE TABLE IF NOT EXISTS estimation_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    tipe_kendaraan TEXT NOT NULL,
    koefisien_denda REAL NOT NULL DEFAULT 0.48,
    data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_estimation_service ON estimation_templates(service_type);
  CREATE INDEX IF NOT EXISTS idx_estimation_vehicle ON estimation_templates(tipe_kendaraan);
`);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables after ensuring schema:', tables.map(t => t.name));

db.close();
