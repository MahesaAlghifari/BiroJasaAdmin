const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('server/data/database.sqlite');

console.log('--- Cleaning Orders & Linked Data ---');

const beforeOrders = db.prepare('SELECT count(*) as c FROM orders').get().c;
const beforeInvoices = db.prepare('SELECT count(*) as c FROM finance_invoices').get().c;
const beforeDocs = db.prepare('SELECT count(*) as c FROM documents WHERE order_no IS NOT NULL OR invoice_id IS NOT NULL').get().c;

console.log(`Before: ${beforeOrders} orders, ${beforeInvoices} invoices, ${beforeDocs} order-linked docs`);

db.exec(`
  DELETE FROM orders;
  DELETE FROM finance_invoices;
  DELETE FROM documents WHERE order_no IS NOT NULL OR invoice_id IS NOT NULL;
  DELETE FROM sqlite_sequence WHERE name IN ('finance_invoices');
`);

const afterOrders = db.prepare('SELECT count(*) as c FROM orders').get().c;
const afterInvoices = db.prepare('SELECT count(*) as c FROM finance_invoices').get().c;
const afterDocs = db.prepare('SELECT count(*) as c FROM documents WHERE order_no IS NOT NULL OR invoice_id IS NOT NULL').get().c;

console.log(`After: ${afterOrders} orders, ${afterInvoices} invoices, ${afterDocs} order-linked docs`);

const usersCount = db.prepare('SELECT count(*) as c FROM users').get().c;
const pricingCount = db.prepare('SELECT count(*) as c FROM samsat_pricing').get().c;
const templatesCount = db.prepare('SELECT count(*) as c FROM estimation_templates').get().c;
console.log(`Master Data Preserved: ${usersCount} users, ${pricingCount} pricing items, ${templatesCount} estimation templates`);

db.close();
console.log('Database cleaned and connection closed cleanly.');
