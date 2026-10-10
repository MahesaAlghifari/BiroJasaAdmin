import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('server/data/database.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name));

for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM ${t.name}`).get();
  console.log(t.name, 'rows:', count.c);
}

const invoiceCols = db.prepare("PRAGMA table_info(finance_invoices)").all();
console.log('finance_invoices schema:', invoiceCols.map(c => c.name));

const orderCols = db.prepare("PRAGMA table_info(orders)").all();
console.log('orders schema:', orderCols.map(c => c.name));

// Check orphan order_nos in finance_invoices
const orphans = db.prepare(`
  SELECT fi.id, fi.invoice_no, fi.order_no 
  FROM finance_invoices fi 
  LEFT JOIN orders o ON fi.order_no = o.order_no 
  WHERE fi.order_no IS NOT NULL AND fi.order_no != '' AND o.order_no IS NULL
`).all();
console.log('Orphan order_nos in finance_invoices:', orphans);

// Check finance_invoices without order_no (standalone invoices)
const standalone = db.prepare(`
  SELECT count(*) as c 
  FROM finance_invoices 
  WHERE order_no IS NULL OR order_no = ''
`).get();
console.log('Invoices with NULL/empty order_no:', standalone.c);

// Print sample invoices
const sampleInvoices = db.prepare("SELECT id, invoice_no, order_no, customer, total_tagihan, dibayar, status FROM finance_invoices LIMIT 5").all();
console.log('Sample invoices:', sampleInvoices);
