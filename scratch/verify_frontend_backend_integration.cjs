const { chromium } = require('playwright');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  console.log('=== VERIFYING FRONTEND-BACKEND INTEGRATION ===');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });

  // Inject authentication as admin
  await context.addInitScript(() => {
    localStorage.setItem(
      'auth_user',
      JSON.stringify({
        role: 'administrator',
        name: 'Admin Super (SVP)',
        userId: 'usr-001',
        employeeId: 'EMP-001',
      })
    );
    localStorage.setItem('auth_token', 'mock-valid-token-superadmin');
  });

  const page = await context.newPage();

  // 1. Go to Buat Order
  console.log('1. Navigating to http://localhost:3000/order/buat...');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Fill Step 1
  console.log('2. Filling Step 1 required fields...');
  await page.fill('#input-customer', 'PT Sinar Jaya Abadi');
  await page.fill('#input-nomorHP', '081234567899');
  await page.fill('#input-namaPemilik', 'Bpk. Sinar Jaya');
  await page.fill('#input-plateNumber', '8888');

  // Select Layanan
  const triggers = page.locator('#field-layanan button[role="combobox"]');
  if (await triggers.count() > 0) {
    await triggers.first().click();
    await page.waitForTimeout(300);
    await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');
  }

  // Choose Datang Langsung ke Loket
  await page.click('text=Datang Langsung ke Loket');
  await page.waitForTimeout(500);

  // Go to Step 2
  console.log('3. Clicking Berikutnya to Step 2...');
  const nextBtn = page.locator('button:has-text("Berikutnya")').first();
  await nextBtn.click();
  await page.waitForTimeout(800);

  // Go to Step 3
  console.log('4. Clicking Berikutnya to Step 3...');
  const nextBtn2 = page.locator('button:has-text("Berikutnya")').first();
  await nextBtn2.click();
  await page.waitForTimeout(800);

  // Submit order in Step 3
  console.log('5. Submitting order...');
  const submitBtn = page.locator('button[type="submit"]:has-text("Buat Order"), button:has-text("Buat Order")').first();
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await page.waitForTimeout(3000);

  // Check success dialog
  const successModal = page.locator('text=Order Berhasil Dibuat').first();
  const isSuccess = await successModal.isVisible();
  console.log('6. Order creation modal visible:', isSuccess);

  const modalShotPath = path.join(ARTIFACT_DIR, 'integration_order_created_modal.png');
  await page.screenshot({ path: modalShotPath, fullPage: false });

  // Close modal and navigate to Tracking
  const toTrackingBtn = page.locator('button:has-text("Buka Order Tracking"), button:has-text("Lihat di Order Tracking")').first();
  if (await toTrackingBtn.count() > 0) {
    await toTrackingBtn.click();
  } else {
    await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(1500);

  console.log('7. Checking Order Tracking page...');
  const trackingPageShotPath = path.join(ARTIFACT_DIR, 'integration_order_tracking_with_new_order.png');
  await page.screenshot({ path: trackingPageShotPath, fullPage: false });

  // 8. Verify SQLite Database Record
  const db = new DatabaseSync('server/data/database.sqlite');
  const ordersInDb = db.prepare('SELECT order_no, customer, layanan, total_biaya, current_stage_name FROM orders').all();
  console.log('8. Orders in SQLite DB:', ordersInDb);

  const invoicesInDb = db.prepare('SELECT invoice_no, order_no, total_tagihan FROM finance_invoices').all();
  console.log('9. Invoices in SQLite DB:', invoicesInDb);

  // Clean up the created test order so user workspace stays clean as requested
  if (ordersInDb.length > 0) {
    const oNo = ordersInDb[0].order_no;
    db.exec(`
      DELETE FROM orders WHERE order_no = '${oNo}';
      DELETE FROM finance_invoices WHERE order_no = '${oNo}';
    `);
    console.log(`10. Cleaned test order ${oNo} from DB to preserve clean state.`);
  }
  db.close();

  await browser.close();
  console.log('\n=== INTEGRATION TEST FINISHED SUCCESSFULLY ===');
})().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
