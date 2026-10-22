const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });

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

  console.log('Navigating to http://localhost:3000/order/buat...');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle', timeout: 30000 });
  
  // Wait for BuatOrder form to render
  await page.waitForSelector('#field-wilayahSamsatAsal, select, [role="combobox"]', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Click on Wilayah Samsat dropdown to show options
  const samsatSelect = page.locator('#field-wilayahSamsatAsal button, #field-wilayahSamsatAsal [role="combobox"]').first();
  if (await samsatSelect.isVisible()) {
    await samsatSelect.click();
    await page.waitForTimeout(500);
  }

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'buat_order_samsat_dropdown_open.png'), fullPage: false });
  console.log('Screenshot saved: buat_order_samsat_dropdown_open.png');

  await browser.close();
  console.log('Buat Order capture finished!');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
