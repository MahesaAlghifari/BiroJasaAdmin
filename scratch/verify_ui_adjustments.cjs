const fs = require('fs');

const fc = fs.readFileSync('src/app/components/FinanceContent.tsx', 'utf8');
const am = fs.readFileSync('src/app/components/AccessManagement.tsx', 'utf8');

console.log('--- 1. Testing FinanceContent.tsx (Profit Terpending) ---');
const hasInflowSummaryInPending = fc.includes('Ringkasan Pemasukan per Rekening / Metode Pembayaran (Order Berjalan)');
console.log('✓ InflowSummaryCard removed from profit-pending:', !hasInflowSummaryInPending);

const hasFilterBarInPending = fc.includes('statusLabel="Tahap Pengerjaan"');
console.log('✓ PaymentFilterBar removed from profit-pending:', !hasFilterBarInPending);

const profitTabStillHasFilterBar = fc.includes('title="Ringkasan Pemasukan per Rekening / Metode Pembayaran"');
console.log('✓ Main Profit tab still retains its PaymentFilterBar & InflowSummaryCard:', profitTabStillHasFilterBar);

console.log('\n--- 2. Testing AccessManagement.tsx (Hak Akses) ---');
const hasMessengerInRoleSelector = am.includes('["admin", "finance", "messenger"] as Role[]');
console.log('✓ Messenger role selector removed:', !hasMessengerInRoleSelector);

const hasAdminFinanceSelector = am.includes('(["admin", "finance"] as Role[])');
console.log('✓ Admin and Finance only in role selector:', hasAdminFinanceSelector);

const is2ColsGrid = am.includes('grid grid-cols-1 sm:grid-cols-2 gap-2.5');
console.log('✓ Grid adjusted to 2 columns:', is2ColsGrid);

if (!hasInflowSummaryInPending && !hasFilterBarInPending && profitTabStillHasFilterBar && !hasMessengerInRoleSelector && hasAdminFinanceSelector && is2ColsGrid) {
  console.log('\n=============================================');
  console.log('ALL VERIFICATIONS PASSED (6/6)');
  console.log('=============================================');
} else {
  console.error('\nFAIL: Some verifications failed');
  process.exit(1);
}
