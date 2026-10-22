const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 } });

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
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Select Layanan
  const triggers = page.locator('#field-layanan button[role="combobox"]');
  if (await triggers.count() > 0) {
    await triggers.first().click();
    await page.waitForTimeout(300);
    await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');
  }

  await page.waitForTimeout(600);

  // Scroll to Parameter Perhitungan
  const paramBox = page.locator('text=Parameter Perhitungan Pajak Tahunan Mobil').first();
  await paramBox.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const shotPath = path.join(ARTIFACT_DIR, 'parameter_perhitungan_r4_no_tanggal_estimasi.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved:', shotPath);

  // Also switch to Motor (R2) to verify R2 Parameter Perhitungan has no Tanggal Estimasi
  const vehicleTrigger = page.locator('text=Mobil (Roda 4)').first();
  await vehicleTrigger.click();
  await page.waitForTimeout(300);
  await page.click('[role="option"]:has-text("Motor (Roda 2)")');
  await page.waitForTimeout(600);

  const r2ParamBox = page.locator('text=Parameter Perhitungan Pajak Tahunan Motor').first();
  await r2ParamBox.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  const shotPathR2 = path.join(ARTIFACT_DIR, 'parameter_perhitungan_r2_no_tanggal_estimasi.png');
  await page.screenshot({ path: shotPathR2, fullPage: false });
  console.log('Saved R2:', shotPathR2);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
