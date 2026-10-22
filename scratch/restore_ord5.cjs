const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('./server/data/database.sqlite');

const ord5 = db.prepare("SELECT * FROM orders WHERE order_no = 'ORD-0005'").get();
if (!ord5) {
  console.log('ORD-0005 not found!');
  process.exit(1);
}

const data = JSON.parse(ord5.data_json);
data.currentStep = 2;
data.currentStageName = 'Penjadwalan';
data.messenger = 'Budi Santoso';
data.assignedMessengerId = 'EMP-MSG-001';
data.assignedMessengerName = 'Budi Santoso';
data.messengerTaskStatus = 'Dalam Proses';
data.isScheduled = true;
data.tanggalJemput = '2026-10-19';

db.prepare(`
  UPDATE orders SET
    current_step = 2,
    current_stage_name = 'Penjadwalan',
    is_archived = 0,
    data_json = ?,
    updated_at = datetime('now')
  WHERE order_no = 'ORD-0005'
`).run(JSON.stringify(data));

console.log('ORD-0005 restored successfully to active Penjadwalan stage with Budi Santoso assignment.');

const activeOrders = db.prepare("SELECT order_no, customer, current_step, current_stage_name, is_archived FROM orders WHERE is_archived = 0").all();
console.log('Active orders in database count:', activeOrders.length);
activeOrders.forEach(o => console.log(o));
