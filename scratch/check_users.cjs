const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/data/database.sqlite');
const users = db.prepare("SELECT email, nama, jabatan, status FROM users").all();
console.log('Users in DB:', users);
db.close();
