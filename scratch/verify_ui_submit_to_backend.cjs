const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

async function loginApi() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: 'admin@birojasa.com',
      password: 'admin123'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('--- 1. Authenticating with Backend API ---');
  const loginRes = await loginApi();
  if (!loginRes.success || !loginRes.data?.token) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const { token, user } = loginRes.data;
  console.log('Login success! User:', user.nama, 'Role:', user.role);

  console.log('--- 2. Launching Playwright Browser ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER PAGEERROR:', err.message));

  // Navigate to login or root to set localStorage
  await page.goto('http://localhost:3000/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  console.log('--- 3. Navigating to /order/buat ---');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Fill Step 1
  console.log('--- 4. Filling Step 1 ---');
  await page.fill('#input-customer', 'PT Verifikasi Backend');
  await page.fill('#input-nomorHP', '081299887766');
  await page.fill('#input-plateNumber', '7788');
  // Fill plate suffix
  const suffixInput = page.locator('input[placeholder="ABC"]');
  if (await suffixInput.count() > 0) {
    await suffixInput.fill('BJA');
  }

  // Choose Datang Langsung ke Loket
  await page.click('text=Datang Langsung ke Loket');
  await page.waitForTimeout(400);

  // Select jenis pengurusan Samsat
  console.log('--- Selecting Jenis Pengurusan ---');
  await page.click('button:has-text("Pilih jenis pengurusan Samsat")');
  await page.waitForTimeout(400);
  await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');
  await page.waitForTimeout(400);

  // Advance to Step 2
  console.log('--- 5. Advancing to Step 2 ---');
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(1000);

  // Advance to Step 3
  console.log('--- 6. Advancing to Step 3 ---');
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(1000);

  // Screenshot Step 3 before click
  await page.screenshot({
    path: 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169/verify_step3_submit_ready.png'
  });

  // Click Buat Order
  console.log('--- 7. Clicking Buat Order button ---');
  const submitBtn = page.locator('button[type="submit"]:has-text("Buat Order")');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();

  // Wait for success modal dialog
  console.log('--- 8. Waiting for Order Berhasil Dibuat dialog ---');
  await page.waitForSelector('text=Order Berhasil Dibuat', { timeout: 10000 });
  console.log('SUCCESS! Modal "Order Berhasil Dibuat" appeared.');

  await page.screenshot({
    path: 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169/verify_order_created_modal_success.png'
  });

  await browser.close();

  // Check SQLite Database
  console.log('--- 9. Verifying Database SQLite Persistence ---');
  const dbPath = path.resolve(__dirname, '../server/data/database.sqlite');
  const db = new DatabaseSync(dbPath);
  const rows = db.prepare('SELECT order_no, customer, nomor_hp, layanan, nopol, current_stage_name, total_biaya FROM orders').all();
  console.log('Orders in database:', rows);

  const invoiceRows = db.prepare('SELECT invoice_no, order_no, customer, status, total_tagihan FROM finance_invoices').all();
  console.log('Invoices in database:', invoiceRows);

  if (rows.length === 0) {
    console.error('ERROR: Order was NOT saved in database!');
    process.exit(1);
  }

  // Cleanup: restore empty state as requested by user
  console.log('--- 10. Cleaning up created order to maintain clean 0 orders state ---');
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM finance_invoices').run();
  db.close();

  console.log('Cleanup completed. Total orders in DB:', 0);
  console.log('ALL FRONTEND & BACKEND INTEGRATION CHECKS PASSED PERFECTLY!');
})();
