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

  await page.fill('#input-customer', 'PT Sinar Jaya Abadi');
  await page.fill('#input-nomorHP', '081234567899');
  await page.fill('#input-namaPemilik', 'Bpk. Sinar Jaya');
  await page.fill('#input-plateNumber', '8888');

  const triggers = page.locator('#field-layanan button[role="combobox"]');
  if (await triggers.count() > 0) {
    await triggers.first().click();
    await page.waitForTimeout(300);
    await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');
  }

  await page.click('text=Datang Langsung ke Loket');
  await page.waitForTimeout(400);

  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(600);

  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(600);

  // Scroll down
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);

  const shotPath = path.join(ARTIFACT_DIR, 'step3_bottom_view.png');
  await page.screenshot({ path: shotPath, fullPage: false });
  console.log('Saved:', shotPath);

  // Click Buat Order
  const submitBtn = page.locator('button:has-text("Buat Order")').last();
  console.log('Submit button text:', await submitBtn.textContent());
  await submitBtn.click();
  await page.waitForTimeout(2000);

  const modalShotPath = path.join(ARTIFACT_DIR, 'step3_after_click_buat_order.png');
  await page.screenshot({ path: modalShotPath, fullPage: false });
  console.log('Saved modal:', modalShotPath);

  await browser.close();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
