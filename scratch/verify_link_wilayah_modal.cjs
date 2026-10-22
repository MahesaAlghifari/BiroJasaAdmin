const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
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
  await page.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Click "Hubungkan Samsat" on first row (Kabupaten Aceh Selatan)
  const linkBtn = page.locator('button:has-text("Hubungkan Samsat")').first();
  await linkBtn.click();
  await page.waitForTimeout(600);

  const ssModalPath = path.join(ARTIFACT_DIR, 'master_wilayah_link_modal.png');
  await page.screenshot({ path: ssModalPath, fullPage: false });
  console.log('Saved screenshot link modal:', ssModalPath);

  await browser.close();
  console.log("SUCCESS");
})().catch(err => {
  console.error(err);
  process.exit(1);
});
