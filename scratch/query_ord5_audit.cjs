const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./server/data/database.sqlite');
const logs = db.prepare("SELECT * FROM audit_logs WHERE details LIKE '%ORD-0005%' OR metadata_json LIKE '%ORD-0005%'").all();
console.log('Audit logs for ORD-0005 count:', logs.length);
logs.forEach(l => console.log(l.created_at, l.user_name, l.action, l.module, l.details));
