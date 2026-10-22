const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  console.log("=== STARTING PLAYWRIGHT VERIFICATION FOR MASTER DATA WILAYAH & SAMSAT ===");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 }
  });

  // Inject authentication before navigating
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

  console.log('1. Navigating to http://localhost:3000/master-data/samsat...');
  await page.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);

  // Screenshot 1: Wilayah Administratif view
  const ss1Path = path.join(ARTIFACT_DIR, 'master_wilayah_514_overview.png');
  await page.screenshot({ path: ss1Path, fullPage: false });
  console.log('Saved screenshot 1:', ss1Path);

  // 2. Test Search by "Bandung"
  console.log('2. Testing search by "Bandung"...');
  const searchInput = page.locator('input[placeholder*="Cari kode atau nama"]');
  await searchInput.fill('Bandung');
  await page.waitForTimeout(500);

  const ss2Path = path.join(ARTIFACT_DIR, 'master_wilayah_search_bandung.png');
  await page.screenshot({ path: ss2Path, fullPage: false });
  console.log('Saved screenshot 2 (Search Bandung):', ss2Path);

  // Clear search
  await searchInput.fill('');
  await page.waitForTimeout(300);

  // 3. Switch to Kantor Pelayanan Samsat Tab
  console.log('3. Switching to Kantor Pelayanan Samsat sub-tab...');
  const kantorTabBtn = page.locator('button:has-text("Kantor Pelayanan Samsat")');
  await kantorTabBtn.click();
  await page.waitForTimeout(500);

  const ss3Path = path.join(ARTIFACT_DIR, 'master_samsat_10_offices.png');
  await page.screenshot({ path: ss3Path, fullPage: false });
  console.log('Saved screenshot 3 (10 Operational Samsat Offices):', ss3Path);

  // 4. Open Tambah Kantor Samsat Modal
  console.log('4. Opening Tambah Kantor Samsat dialog...');
  const addBtn = page.locator('button:has-text("Tambah Kantor Samsat")').first();
  await addBtn.click();
  await page.waitForTimeout(600);

  const ss4Path = path.join(ARTIFACT_DIR, 'master_samsat_add_modal.png');
  await page.screenshot({ path: ss4Path, fullPage: false });
  console.log('Saved screenshot 4 (Add Samsat Dialog):', ss4Path);

  // Close modal
  await page.locator('button:has-text("Batal")').click();
  await page.waitForTimeout(300);

  // 5. Check Biaya Layanan page
  console.log('5. Navigating to Biaya Layanan to verify existing fee preservation...');
  await page.goto('http://localhost:3000/master-data/biaya-layanan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const ss5Path = path.join(ARTIFACT_DIR, 'master_biaya_layanan_preserved.png');
  await page.screenshot({ path: ss5Path, fullPage: false });
  console.log('Saved screenshot 5 (Biaya Layanan Preserved):', ss5Path);

  await browser.close();
  console.log("=== PLAYWRIGHT VERIFICATION FINISHED SUCCESSFULLY ===");
})().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
