const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "server", "data", "database.sqlite");
const uploadsDir = path.join(__dirname, "..", "server", "uploads");

const db = new DatabaseSync(dbPath);

console.log("=== ORDERS ===");
const orders = db.prepare("SELECT order_no, customer, layanan, nopol, current_stage_name, payment_status, total_biaya, created_at FROM orders").all();
console.log(`Total orders: ${orders.length}`);
orders.forEach(o => console.log(` - ${o.order_no}: ${o.customer} (${o.layanan}) - ${o.payment_status}`));

console.log("\n=== FINANCE INVOICES ===");
const invoices = db.prepare("SELECT invoice_no, order_no, customer, status, total_tagihan, dibayar, sisa FROM finance_invoices").all();
console.log(`Total invoices: ${invoices.length}`);
invoices.forEach(i => console.log(` - ${i.invoice_no} (${i.order_no}): ${i.customer} - ${i.status} (Tagihan: ${i.total_tagihan}, Dibayar: ${i.dibayar})`));

console.log("\n=== KAS KANTOR & PENGELUARAN ===");
const kasCount = db.prepare("SELECT COUNT(*) as c FROM kas_kantor").get().c;
const pengeluaranCount = db.prepare("SELECT COUNT(*) as c FROM pengeluaran").get().c;
console.log(`Kas kantor rows: ${kasCount}, Pengeluaran rows: ${pengeluaranCount}`);

console.log("\n=== DOCUMENTS IN DATABASE ===");
const allDocs = db.prepare("SELECT id, order_no, invoice_id, document_type, original_name, storage_name, size_bytes FROM documents").all();
console.log(`Total documents in DB: ${allDocs.length}`);
const withOrder = allDocs.filter(d => d.order_no !== null && d.order_no !== undefined && d.order_no !== "");
console.log(`Documents with order_no: ${withOrder.length}`);
withOrder.forEach(d => console.log(` - [${d.order_no}] ${d.id}: ${d.original_name} -> ${d.storage_name}`));

console.log("\n=== PHYSICAL FILES IN SERVER/UPLOADS ===");
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  console.log(`Total files in server/uploads: ${files.length}`);
  
  const dbStorageNames = new Set(allDocs.map(d => d.storage_name));
  const orderLinkedStorageNames = new Set(withOrder.map(d => d.storage_name));
  
  let linkedFilesCount = 0;
  let unlinkedFilesCount = 0;
  
  files.forEach(f => {
    if (orderLinkedStorageNames.has(f)) {
      linkedFilesCount++;
    } else {
      unlinkedFilesCount++;
    }
  });
  console.log(`Files linked to orders in DB: ${linkedFilesCount}`);
  console.log(`Files NOT linked to orders: ${unlinkedFilesCount}`);
} else {
  console.log("Uploads dir does not exist.");
}
