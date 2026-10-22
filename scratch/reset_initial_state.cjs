const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'data', 'database.sqlite');
const db = new DatabaseSync(dbPath);

console.log('Restoring 4 orders to unassigned & Belum Diambil (exact Screenshot 1 state)...');

const unassignedOrders = ['ORD-0001', 'ORD-0002', 'ORD-0003', 'ORD-0004'];

for (const orderNo of unassignedOrders) {
  const row = db.prepare('SELECT data_json FROM orders WHERE order_no = ?').get(orderNo);
  if (!row) continue;
  const order = JSON.parse(row.data_json);

  order.messenger = 'Belum Ditugaskan';
  order.assignedMessengerName = 'Belum Ditugaskan';
  order.assignedMessengerId = undefined;
  order.messengerTaskStatus = 'Belum Diambil';
  order.isScheduled = false;

  db.prepare(`
    UPDATE orders SET
      data_json = ?,
      updated_at = datetime('now')
    WHERE order_no = ?
  `).run(JSON.stringify(order), orderNo);

  console.log(`Reset ${orderNo} to Belum Ditugaskan & Belum Diambil.`);
}

// Check final summary
const allRows = db.prepare('SELECT order_no, data_json FROM orders WHERE is_archived = 0').all();
console.log('\nFinal active orders in SQLite:');
allRows.forEach(r => {
  const o = JSON.parse(r.data_json);
  console.log(` - ${o.orderNo}: ${o.customer} | ${o.messenger || 'Belum Ditugaskan'} | ${o.assignedMessengerId || '-'} | Status: ${o.messengerTaskStatus || 'Belum Diambil'} | Step: ${o.currentStep}`);
});

db.close();
