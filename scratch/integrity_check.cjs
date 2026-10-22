const { DatabaseSync } = require('node:sqlite');
try {
  const db = new DatabaseSync('server/data/database.sqlite');
  const res = db.prepare('PRAGMA integrity_check;').all();
  console.log('Integrity check:', res);
  db.close();
} catch (e) {
  console.error('Error opening db:', e.message);
}
