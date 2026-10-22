const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs = require("fs");

const dbPath = path.join(__dirname, "..", "server", "data", "database.sqlite");
const uploadsDir = path.join(__dirname, "..", "server", "uploads");

const db = new DatabaseSync(dbPath);

console.log("=== STARTING RESET TRANSAKSI ADMIN SUN89 ===");

// 1. Get all documents definitely linked to orders
const linkedDocs = db.prepare("SELECT id, order_no, storage_name FROM documents WHERE order_no IS NOT NULL").all();
console.log(`Found ${linkedDocs.length} documents definitely linked to orders.`);

// 2. Identify physical files to delete
let deletedFilesCount = 0;
let missingFilesCount = 0;
for (const doc of linkedDocs) {
  if (doc.storage_name) {
    const filePath = path.join(uploadsDir, doc.storage_name);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        deletedFilesCount++;
      } catch (err) {
        console.error(`Failed to delete physical file ${filePath}:`, err.message);
      }
    } else {
      missingFilesCount++;
    }
  }
}
console.log(`Physical files deleted: ${deletedFilesCount}, already missing: ${missingFilesCount}`);

// 3. Delete database records inside transaction
db.exec("BEGIN TRANSACTION");
try {
  // Orders
  const orderCount = db.prepare("SELECT COUNT(*) as c FROM orders").get().c;
  db.prepare("DELETE FROM orders").run();
  console.log(`Deleted ${orderCount} orders from 'orders' table.`);

  // Finance Invoices
  const invCount = db.prepare("SELECT COUNT(*) as c FROM finance_invoices").get().c;
  db.prepare("DELETE FROM finance_invoices").run();
  console.log(`Deleted ${invCount} invoices from 'finance_invoices' table.`);

  // Kas Kantor
  const kasCount = db.prepare("SELECT COUNT(*) as c FROM kas_kantor").get().c;
  db.prepare("DELETE FROM kas_kantor").run();
  console.log(`Deleted ${kasCount} records from 'kas_kantor' table.`);

  // Pengeluaran
  const pengeluaranCount = db.prepare("SELECT COUNT(*) as c FROM pengeluaran").get().c;
  db.prepare("DELETE FROM pengeluaran").run();
  console.log(`Deleted ${pengeluaranCount} records from 'pengeluaran' table.`);

  // Documents definitely linked to orders
  const delDocs = db.prepare("DELETE FROM documents WHERE order_no IS NOT NULL").run();
  console.log(`Deleted ${delDocs.changes || linkedDocs.length} linked document metadata rows from 'documents' table.`);

  // Notification logs related to orders
  const delNotifs = db.prepare("DELETE FROM notification_logs WHERE reference_no LIKE 'ORD-%'").run();
  console.log(`Deleted notification logs related to old orders.`);

  // Reset sqlite autoincrement sequences for cleared tables
  try {
    db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('finance_invoices', 'kas_kantor', 'pengeluaran')").run();
    console.log("Reset autoincrement sequences for cleared transactional tables.");
  } catch (err) {
    console.warn("Could not reset sqlite_sequence:", err.message);
  }

  db.exec("COMMIT");
  console.log("Database transaction committed successfully.");
} catch (err) {
  db.exec("ROLLBACK");
  console.error("Database reset failed, rolled back:", err);
  process.exit(1);
}

// 4. Verify post-reset counts
console.log("\n=== POST-RESET DATABASE COUNTS ===");
const checkTables = [
  "orders",
  "finance_invoices",
  "kas_kantor",
  "pengeluaran",
  "documents",
  "users",
  "samsat_pricing",
  "wilayah_administratif",
  "samsat_offices",
  "estimation_templates",
  "payment_methods",
  "notification_settings",
  "role_permissions"
];

for (const t of checkTables) {
  const row = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
  console.log(` - ${t}: ${row.c} rows`);
}

const remainingUploadFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir).length : 0;
console.log(`\nRemaining physical files in server/uploads: ${remainingUploadFiles}`);
console.log("=== RESET COMPLETED SUCCESSFULLY ===");
