const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function run() {
  console.log("=== STARTING VERIFICATION FOR CLEAN SAMSAT MASTER DATA & SYNC ===");
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

  // 1. Master Data -> Samsat (Clean List)
  console.log('1. Navigating to http://localhost:3000/master-data/samsat...');
  await page.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const headers = await page.locator('table th').allTextContents();
  console.log('Table Headers in Master Samsat:', headers.map(h => h.trim()).filter(Boolean));

  // Get sample rows
  const rowCount = await page.locator('table tbody tr').count();
  console.log('Row count in current page of Master Samsat:', rowCount);
  const firstRow = await page.locator('table tbody tr').first().innerText();
  console.log('Sample Row 1 in Master Samsat:', firstRow.replace(/\n+/g, ' | '));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'master_samsat_clean_list.png'), fullPage: false });
  console.log('Screenshot 1: master_samsat_clean_list.png');

  // Search in Samsat
  const searchInput = page.locator('input[placeholder*="Cari samsat" i]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Bandung');
    await page.waitForTimeout(800);
    const searchResult = await page.locator('table tbody tr').first().innerText();
    console.log('Search "Bandung" Row 1:', searchResult.replace(/\n+/g, ' | '));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'master_samsat_search_bandung.png'), fullPage: false });
    console.log('Screenshot 2: master_samsat_search_bandung.png');
  }

  // 2. Master Data -> Biaya Layanan
  console.log('2. Navigating to http://localhost:3000/master-data/biaya-layanan...');
  await page.goto('http://localhost:3000/master-data/biaya-layanan', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'master_biaya_layanan_514.png'), fullPage: false });
  console.log('Screenshot 3: master_biaya_layanan_514.png');

  // Filter search in Biaya Layanan
  const biayaSearch = page.locator('input[placeholder*="Cari" i]').first();
  if (await biayaSearch.isVisible()) {
    await biayaSearch.fill('Surabaya');
    await page.waitForTimeout(800);
    const biayaResult = await page.locator('table tbody tr').first().innerText();
    console.log('Biaya Layanan Search "Surabaya" Row 1:', biayaResult.replace(/\n+/g, ' | '));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'master_biaya_layanan_search_surabaya.png'), fullPage: false });
    console.log('Screenshot 4: master_biaya_layanan_search_surabaya.png');
  }

  // 3. Master Data -> Harga Dasar Samsat
  console.log('3. Navigating to http://localhost:3000/master-data/harga-dasar...');
  await page.goto('http://localhost:3000/master-data/harga-dasar', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 10000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'master_harga_dasar_samsat.png'), fullPage: false });
  console.log('Screenshot 5: master_harga_dasar_samsat.png');

  // Search in Harga Dasar Samsat
  const hdSearch = page.locator('input[placeholder*="Cari nama Samsat" i]').first();
  if (await hdSearch.isVisible()) {
    await hdSearch.fill('Medan');
    await page.waitForTimeout(800);
    const hdResult = await page.locator('table tbody tr').first().innerText();
    console.log('Harga Dasar Search "Medan" Row 1:', hdResult.replace(/\n+/g, ' | '));
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'master_harga_dasar_search_medan.png'), fullPage: false });
    console.log('Screenshot 6: master_harga_dasar_search_medan.png');
  }

  // 4. Buat Order
  console.log('4. Navigating to http://localhost:3000/order/buat...');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'buat_order_samsat_sync.png'), fullPage: false });
  console.log('Screenshot 7: buat_order_samsat_sync.png');

  await browser.close();
  console.log('=== ALL SCREENSHOTS AND VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
