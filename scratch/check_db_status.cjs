const path = require('path');
const Database = require('better-sqlite3');
const db = new Database(path.join(__dirname, '../server/data/database.sqlite'));

const archiveCounts = db.prepare('SELECT count(*) as total, is_archived FROM orders GROUP BY is_archived').all();
console.log('Archive counts in DB:', archiveCounts);

const totalOrders = db.prepare('SELECT count(*) as total FROM orders').get();
console.log('Total orders in DB:', totalOrders.total);

const totalInvoices = db.prepare('SELECT count(*) as total FROM invoices').get();
console.log('Total invoices in DB:', totalInvoices.total);

const totalPayments = db.prepare('SELECT count(*) as total FROM payment_proofs').get();
console.log('Total payment proofs in DB:', totalPayments.total);
