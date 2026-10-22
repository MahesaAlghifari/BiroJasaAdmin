const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/data/database.sqlite');
const sampleOrders = db.prepare("SELECT order_no, customer, layanan FROM orders LIMIT 5").all();
console.log('Sample orders:', sampleOrders);

const sampleInvoices = db.prepare("SELECT invoice_no, order_no, customer, total_tagihan FROM finance_invoices LIMIT 5").all();
console.log('Sample invoices:', sampleInvoices);

const orphanedDocs = db.prepare("SELECT count(*) as c FROM documents WHERE order_no IS NOT NULL").get();
console.log('Docs with order_no:', orphanedDocs.c);
