const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const db = new DatabaseSync('server/data/database.sqlite');
const { SAMSAT_OFFICES_514 } = require('../server/src/database/wilayahData.ts');

console.log("Seeding all 514 Samsats to samsat_offices table in database.sqlite...");

const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO samsat_offices (
    id, name, wilayah, alamat, kode_kabupaten_kota, is_verified, status_aktif, updated_at
  ) VALUES (?, ?, ?, ?, ?, 1, 1, datetime('now'))
`);

let count = 0;
for (const s of SAMSAT_OFFICES_514) {
  insertStmt.run(s.id, s.name, s.wilayah, s.alamat, s.kode_kabupaten_kota);
  count++;
}

console.log(`Successfully seeded ${count} Samsat offices!`);
const total = db.prepare("SELECT COUNT(*) as c FROM samsat_offices").get().c;
console.log(`Current total samsat_offices in database: ${total}`);
