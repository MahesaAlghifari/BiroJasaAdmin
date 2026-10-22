const { chromium } = require('playwright');
const path = require('path');

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
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const buatOrderBtn = page.locator('button:has-text("Buat Order"), a:has-text("Buat Order")').first();
  await buatOrderBtn.click();
  await page.waitForTimeout(1000);

  // Step 1: Fill
  await page.fill('#input-customer', 'Ahmad Dahlan');
  await page.fill('#input-nomorHP', '081299887766');

  const triggers = page.locator('#field-layanan button[role="combobox"]');
  await triggers.first().click();
  await page.waitForTimeout(300);
  await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');

  await page.fill('#input-plateNumber', '9999');
  await page.fill('input[title="Plat Belakang (Huruf)"]', 'JKT');
  await page.fill('#field-jemputDetail input', 'Jl. Matraman Raya No. 12');

  const pkbInput = page.locator('input[placeholder="0"]').first();
  await pkbInput.fill('3000000');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2024-01-01');

  // Step 1 -> Step 2
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(600);

  // Step 2 -> Step 3
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(1000);

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const artifactDir = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';
  await page.screenshot({ path: path.join(artifactDir, 'buat_order_step3_bottom.png') });
  console.log('Step 3 bottom screenshot captured');

  // Submit order
  console.log('Submitting order...');
  const submitBtn = page.locator('button[type="submit"]:has-text("Buat Order")').first();
  await submitBtn.click();
  await page.waitForTimeout(2000);

  const modal = page.locator('text=Order Berhasil Dibuat').first();
  console.log('Modal visible after submit:', await modal.isVisible());

  await page.screenshot({ path: path.join(artifactDir, 'buat_order_order_created_modal.png') });

  await browser.close();
  console.log('Done!');
})();
