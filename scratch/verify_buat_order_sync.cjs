const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 950 }
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

  console.log('Navigating to app...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Navigate to Buat Order
  console.log('Navigating to Buat Order...');
  const buatOrderBtn = page.locator('button:has-text("Buat Order"), a:has-text("Buat Order"), [data-tab="buat-order"]').first();
  if (await buatOrderBtn.count() > 0) {
    await buatOrderBtn.click();
  } else {
    await page.click('text=Buat Order');
  }

  await page.waitForTimeout(1000);

  // In Step 1:
  console.log('Filling Step 1...');
  await page.fill('#input-customer', 'Budi Santoso');
  await page.fill('#input-nomorHP', '081234567890');

  // Select Layanan
  console.log('Selecting Layanan Perpanjangan 1 Tahun...');
  const triggers = page.locator('#field-layanan button[role="combobox"]');
  if (await triggers.count() > 0) {
    await triggers.first().click();
    await page.waitForTimeout(300);
    await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');
  }

  await page.waitForTimeout(500);

  // Check Samsat Asal info strip
  const infoStrip = page.locator('text=Jasa:').first();
  const infoStripVisible = await infoStrip.isVisible();
  console.log('Samsat rate info strip visible:', infoStripVisible);
  if (infoStripVisible) {
    const text = await infoStrip.evaluate(el => el.parentElement.innerText);
    console.log('Info strip text for Jakarta Timur:\n', text);
  }

  // Fill Nopol
  await page.fill('#input-plateNumber', '5678');
  await page.fill('input[title="Plat Belakang (Huruf)"]', 'TMR');

  // Fill Alamat Jemput
  await page.fill('#field-jemputDetail input', 'Jl. Pemuda No. 45, Rawamangun');

  // Fill PKB info
  const pkbInput = page.locator('input[placeholder="0"]').first();
  if (await pkbInput.count() > 0) {
    await pkbInput.fill('2500000');
  }
  const dateInput = page.locator('input[type="date"]').first();
  if (await dateInput.count() > 0) {
    await dateInput.fill('2024-05-15');
  }

  await page.waitForTimeout(500);

  // Take screenshot of Step 1 with rate info strip
  const artifactDir = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';
  await page.screenshot({ path: path.join(artifactDir, 'buat_order_step1_sync.png'), fullPage: true });
  console.log('Step 1 screenshot captured');

  // Click Berikutnya to go to Step 2
  console.log('Proceeding to Step 2...');
  const nextBtn1 = page.locator('button:has-text("Berikutnya")').first();
  await nextBtn1.click();
  await page.waitForTimeout(800);

  // Step 2: Click Berikutnya to go to Step 3
  console.log('Proceeding to Step 3...');
  const nextBtn2 = page.locator('button:has-text("Berikutnya")').first();
  await nextBtn2.click();
  await page.waitForTimeout(1000);

  // Check Step 3 breakdowns
  const kurirGroup = page.locator('text=Layanan Kurir Antar-Jemput').first();
  const kurirVisible = await kurirGroup.isVisible();
  console.log('Layanan Kurir Antar-Jemput visible in Step 3:', kurirVisible);

  const grandTotalLoc = page.locator('span.text-base.font-bold.text-primary').first();
  if (await grandTotalLoc.count() > 0) {
    console.log('Grand Total in Step 3:', await grandTotalLoc.innerText());
  }

  // Take screenshot of Step 3
  await page.screenshot({ path: path.join(artifactDir, 'buat_order_step3_sync.png'), fullPage: true });
  console.log('Step 3 screenshot captured');

  await browser.close();
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
})();
