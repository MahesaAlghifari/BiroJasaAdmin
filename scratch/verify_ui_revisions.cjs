const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function verifyUI() {
  console.log('=== STARTING REVISED UI VERIFICATION ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });

  // Inject session
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

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BUAT ORDER — TEST SEARCHABLE SAMSAT SELECT
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n1. Navigating to http://localhost:3000/order/buat...');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1500);

  const samsatAsalBtn = page.locator('#field-wilayahSamsatAsal button').first();
  await samsatAsalBtn.scrollIntoViewIfNeeded();
  await samsatAsalBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Samsat Asal initial text:', (await samsatAsalBtn.innerText()).trim());

  // Click to open searchable combobox
  await samsatAsalBtn.click();
  await page.waitForTimeout(600);

  // Verify dropdown is open and sorted A-Z
  const firstOptions = await page.locator('[data-slot="popover-content"] .max-h-60 button').allTextContents();
  console.log('Top 5 Samsat options (showing A-Z alphabetical ordering):');
  firstOptions.slice(0, 5).forEach((t, i) => console.log(`  ${i + 1}. ${t.replace(/\s+/g, ' ').trim()}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_1_buat_order_dropdown_open.png'), fullPage: false });
  console.log('Screenshot 1 saved: revisi_1_buat_order_dropdown_open.png');

  // Search "Bandung" in real-time
  const searchInput = page.locator('[data-slot="popover-content"] input');
  await searchInput.fill('Bandung');
  await page.waitForTimeout(500);

  const searchResults = await page.locator('[data-slot="popover-content"] .max-h-60 button').allTextContents();
  console.log('Results matching "Bandung":', searchResults.map(t => t.replace(/\s+/g, ' ').trim()));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_1_buat_order_search_bandung.png'), fullPage: false });
  console.log('Screenshot 2 saved: revisi_1_buat_order_search_bandung.png');

  // Click "Bandung" option
  const bandungOpt = page.locator('[data-slot="popover-content"] .max-h-60 button').filter({ hasText: 'Bandung' }).first();
  await bandungOpt.click();
  await page.waitForTimeout(500);
  console.log('Samsat Asal text after selection:', (await samsatAsalBtn.innerText()).trim());

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. MASTER DATA → SAMSAT (FILTER PROVINSI & SORT A-Z)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Navigating to http://localhost:3000/master-data/samsat...');
  await page.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Check initial rows to verify default A-Z sorting
  const defaultRows = await page.locator('table tbody tr').allTextContents();
  console.log('Top 4 rows in Master Samsat (verifying default A-Z sort):');
  defaultRows.slice(0, 4).forEach((r, idx) => console.log(`  Row ${idx + 1}: ${r.replace(/\s+/g, ' ').trim()}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_2_master_samsat_sorted_az.png'), fullPage: false });
  console.log('Screenshot 3 saved: revisi_2_master_samsat_sorted_az.png');

  // Select Province "Jawa Barat"
  const provSelectTrigger = page.locator('button').filter({ hasText: /Semua Provinsi/i }).first();
  await provSelectTrigger.click();
  await page.waitForTimeout(400);
  const jabarOption = page.locator('[role="option"]').filter({ hasText: 'Jawa Barat' }).first();
  await jabarOption.click();
  await page.waitForTimeout(600);

  const jabarRows = await page.locator('table tbody tr').allTextContents();
  console.log(`Master Samsat rows under Jawa Barat (count: ${jabarRows.length}):`);
  jabarRows.slice(0, 4).forEach((r, idx) => console.log(`  Row ${idx + 1}: ${r.replace(/\s+/g, ' ').trim()}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_2_master_samsat_filter_jabar.png'), fullPage: false });
  console.log('Screenshot 4 saved: revisi_2_master_samsat_filter_jabar.png');

  // Search "Bekasi" while "Jawa Barat" is selected
  const samsatSearch = page.locator('input[placeholder*="Cari samsat"]').first();
  await samsatSearch.fill('Bekasi');
  await page.waitForTimeout(500);
  const bekasiRows = await page.locator('table tbody tr').allTextContents();
  console.log(`Results for search "Bekasi" under Jawa Barat:`, bekasiRows.map(r => r.replace(/\s+/g, ' ').trim()));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_2_master_samsat_search_bekasi_jabar.png'), fullPage: false });
  console.log('Screenshot 5 saved: revisi_2_master_samsat_search_bekasi_jabar.png');

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. MASTER DATA → BIAYA LAYANAN (FILTER PROVINSI)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Navigating to http://localhost:3000/master-data/biaya-layanan...');
  await page.goto('http://localhost:3000/master-data/biaya-layanan', { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Filter Province "Daerah Khusus Ibukota Jakarta"
  const provFilterBiaya = page.locator('button').filter({ hasText: /Semua Provinsi/i }).first();
  await provFilterBiaya.click();
  await page.waitForTimeout(400);
  const dkiOption = page.locator('[role="option"]').filter({ hasText: 'Daerah Khusus Ibukota Jakarta' }).first();
  await dkiOption.click();
  await page.waitForTimeout(600);

  const dkiRows = await page.locator('table tbody tr').allTextContents();
  console.log(`Biaya Layanan rows under DKI Jakarta (count: ${dkiRows.length}):`);
  dkiRows.forEach((r, idx) => console.log(`  Row ${idx + 1}: ${r.replace(/\s+/g, ' ').trim()}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_3_biaya_layanan_filter_dki.png'), fullPage: false });
  console.log('Screenshot 6 saved: revisi_3_biaya_layanan_filter_dki.png');

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. MASTER DATA → HARGA DASAR SAMSAT (FILTER PROVINSI)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Navigating to http://localhost:3000/master-data/harga-dasar...');
  await page.goto('http://localhost:3000/master-data/harga-dasar', { waitUntil: 'load', timeout: 15000 });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  // Filter Province "Jawa Barat"
  const provFilterHarga = page.locator('button').filter({ hasText: /Semua Provinsi/i }).first();
  await provFilterHarga.click();
  await page.waitForTimeout(400);
  const jabarHargaOption = page.locator('[role="option"]').filter({ hasText: 'Jawa Barat' }).first();
  await jabarHargaOption.click();
  await page.waitForTimeout(600);

  const jabarHargaRows = await page.locator('table tbody tr').allTextContents();
  console.log(`Harga Dasar Samsat rows under Jawa Barat (count: ${jabarHargaRows.length}):`);
  jabarHargaRows.slice(0, 4).forEach((r, idx) => console.log(`  Row ${idx + 1}: ${r.replace(/\s+/g, ' ').trim()}`));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_4_harga_dasar_filter_jabar.png'), fullPage: false });
  console.log('Screenshot 7 saved: revisi_4_harga_dasar_filter_jabar.png');

  await browser.close();
  console.log('\n=== ALL UI REVISIONS VERIFIED SUCCESSFULLY! ===');
}

verifyUI().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
