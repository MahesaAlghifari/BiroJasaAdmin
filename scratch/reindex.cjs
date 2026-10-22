const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/data/database.sqlite');
console.log('Running REINDEX...');
try {
  db.exec('REINDEX;');
  console.log('REINDEX completed.');
  const res = db.prepare('PRAGMA integrity_check;').all();
  console.log('Integrity check after REINDEX:', res);
} catch (e) {
  console.error('Error during REINDEX:', e.message);
}
db.close();
