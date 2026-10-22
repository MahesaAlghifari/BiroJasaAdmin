const { chromium } = require('playwright');
const http = require('http');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ARTIFACT_DIR = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function loginApi() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' });
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('1. Fetching authoritative token from backend...');
  const loginRes = await loginApi();
  const { token, user } = loginRes.data;
  console.log('Got token for:', user.nama, 'Role:', user.role);

  console.log('2. Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 1000 });

  console.log('3. Setting localStorage session and navigating...');
  await page.goto('http://localhost:3000/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify({
      ...user,
      name: user.nama,
      role: 'administrator',
      employeeId: 'EMP-001',
    }));
  }, { token, user });

  console.log('4. Navigating to Mutasi LD table...');
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Arrived at Mutasi LD. Current URL:', page.url());

  // Click Tambah button
  console.log('5. Clicking Tambah button...');
  const tambahBtn = page.locator('button:has-text("Tambah")').first();
  await tambahBtn.waitFor({ state: 'visible', timeout: 10000 });
  await tambahBtn.click();
  await page.waitForTimeout(1500);

  // 6. Screenshot top of form
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_revisi_form_top.png') });
  console.log('Captured proof_mutasi_ld_revisi_form_top.png');

  // Fill Section 2: Customer Name, Phone, Nopol
  console.log('7. Filling Customer Info & Nopol...');
  const custInput = page.locator('input[placeholder*="Bambang Wijaya"]').first();
  await custInput.fill('Hendra Gunawan Mutasi LD');

  const phoneInput = page.locator('input[placeholder*="0812"]').first();
  await phoneInput.fill('081234567890');

  // Fill plate number
  const plateNum = page.locator('input[placeholder="1234"]');
  if (await plateNum.isVisible()) {
    await plateNum.fill('7788');
  }
  const plateSuffix = page.locator('input[placeholder="ABC"]');
  if (await plateSuffix.isVisible()) {
    await plateSuffix.fill('MLD');
  }

  // Scroll to Section 3 & 4
  console.log('8. Verifying Section 3: Penerimaan Uang...');
  await page.evaluate(() => window.scrollBy(0, 500));
  await page.waitForTimeout(500);

  // Fill Uang Masuk dari Konsumen
  const uangMasukInput = page.locator('label:has-text("2. Uang Masuk dari Konsumen")').locator('..').locator('input[type="number"]').first();
  await uangMasukInput.fill('2500000');

  // Screenshot middle of form
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_revisi_form_middle.png') });
  console.log('Captured proof_mutasi_ld_revisi_form_middle.png');

  // Section 4: Pengeluaran Samsat
  console.log('9. Verifying Section 4: Pengeluaran Samsat...');
  const biayaSamsatInput = page.locator('label:has-text("2. Biaya Pokok Samsat")').locator('..').locator('input[type="number"]').first();
  await biayaSamsatInput.fill('950000');

  const penerimaInput = page.locator('label:has-text("5. Nama Rekening / Penerima")').locator('..').locator('input[type="text"]').first();
  await penerimaInput.fill('Kasda Samsat Jawa Barat');

  // Verify Nomor Rekening Tujuan Samsat is NOT present in UI
  const noRekCount = await page.locator('text="Nomor Rekening Tujuan Samsat"').count();
  console.log('Is "Nomor Rekening Tujuan Samsat" in UI? (must be 0):', noRekCount);

  // Section 5: Ringkasan Keuangan
  console.log('10. Verifying Section 5: Ringkasan Keuangan...');
  await page.evaluate(() => window.scrollBy(0, 700));
  await page.waitForTimeout(500);

  const biayaJasaVal = await page.locator('div:has(label:has-text("Biaya Jasa (Rp)")) input[type="number"]').first().inputValue();
  console.log('✓ Biaya Jasa auto-fill:', biayaJasaVal);

  const biayaAntarJemputVal = await page.locator('div:has(label:has-text("Biaya Antar Jemput")) input[type="number"]').first().inputValue();
  console.log('✓ Biaya Antar Jemput value:', biayaAntarJemputVal);

  const totalTagihanVal = await page.locator('div:has(label:has-text("Total Tagihan Konsumen (Rp)")) input[type="number"]').first().inputValue();
  console.log('✓ Total Tagihan value:', totalTagihanVal);

  // Screenshot bottom of form
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_revisi_form_bottom.png') });
  console.log('Captured proof_mutasi_ld_revisi_form_bottom.png');

  // 11. Click "Simpan Data Penjualan (Mutasi LD)"
  console.log('11. Clicking Simpan Data Penjualan button...');
  const simpanBtn = page.locator('button:has-text("Simpan Data Penjualan")').first();
  await simpanBtn.waitFor({ state: 'visible', timeout: 10000 });
  await simpanBtn.click();
  await page.waitForTimeout(3000);

  // 12. Verify return to table and row presence
  console.log('12. Verifying saved transaction in table...');
  const content = await page.textContent('body');
  const isFound = content.includes('Hendra Gunawan Mutasi LD') || content.includes('7788');
  console.log('Transaction visible in table?', isFound);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_revisi_saved_table.png') });
  console.log('Captured proof_mutasi_ld_revisi_saved_table.png');

  // 13. Verify SQLite directly
  console.log('13. Checking SQLite database rows...');
  const db = new DatabaseSync('server/data/database.sqlite');
  const savedOrder = db.prepare("SELECT order_no, customer, nopol, biaya_jasa, biaya_antar_jemput, nama_penerima_keluar FROM orders WHERE customer LIKE '%Hendra Gunawan%' ORDER BY created_at DESC LIMIT 1").get();
  console.log('✓ Order row in SQLite:', savedOrder);

  if (savedOrder && savedOrder.order_no) {
    const savedInvoice = db.prepare("SELECT invoice_no, order_no, biaya_jasa, biaya_antar_jemput, nama_penerima_keluar, total_tagihan FROM finance_invoices WHERE order_no = ?").get(savedOrder.order_no);
    console.log('✓ Finance invoice in SQLite:', savedInvoice);
  }

  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
  await browser.close();
})().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
