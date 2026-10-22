import Database from 'better-sqlite3';
const db = new Database('server/data/database.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

for (const table of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM ${table.name}`).all();
    console.log(`Table ${table.name} has ${rows.length} rows`);
    for (const r of rows) {
      const str = JSON.stringify(r);
      if (str.includes('Cell') || str.includes('ROUNDUP')) {
        console.log(`FOUND in ${table.name}:`, str.substring(0, 300));
      }
    }
  } catch (e) {
    console.error(e.message);
  }
}
