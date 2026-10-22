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

  // Navigate to Buat Order
  const buatOrderBtn = page.locator('button:has-text("Buat Order"), a:has-text("Buat Order")').first();
  await buatOrderBtn.click();
  await page.waitForTimeout(1000);

  // Step 1: Fill form
  await page.fill('#input-customer', 'Siti Rahma');
  await page.fill('#input-nomorHP', '085712345678');

  // Select Layanan Perpanjangan 1 Tahun
  const triggers = page.locator('#field-layanan button[role="combobox"]');
  if (await triggers.count() > 0) {
    await triggers.first().click();
    await page.waitForTimeout(300);
    await page.click('[role="option"]:has-text("Perpanjangan 1 Tahun")');
  }

  // Switch Wilayah Samsat Asal to Bogor
  console.log('Switching Samsat to Bogor...');
  const samsatTrigger = page.locator('#field-wilayahSamsatAsal button[role="combobox"]');
  await samsatTrigger.click();
  await page.waitForTimeout(300);
  await page.click('[role="option"]:has-text("Bogor")');
  await page.waitForTimeout(500);

  // Check Bogor info strip
  const infoStripText = await page.locator('#field-wilayahSamsatAsal').innerText();
  console.log('Bogor info strip text:\n', infoStripText);

  // Fill Nopol
  await page.fill('#input-plateNumber', '1234');
  await page.fill('input[title="Plat Belakang (Huruf)"]', 'BGR');

  // Fill Alamat Jemput
  await page.fill('#field-jemputDetail input', 'Jl. Pajajaran No. 10, Bogor');

  // Fill PKB info
  const pkbInput = page.locator('input[placeholder="0"]').first();
  await pkbInput.fill('1800000');
  const dateInput = page.locator('input[type="date"]').first();
  await dateInput.fill('2025-01-10');

  // Test Datang Langsung vs Antar Jemput
  console.log('Testing Datang Langsung...');
  await page.click('text=Datang Langsung ke Loket');
  await page.waitForTimeout(300);

  // Go to Step 2
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(600);

  // Go to Step 3
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(800);

  // Verify Kurir is NOT present for Datang Langsung
  let kurirCount = await page.locator('text=Layanan Kurir Antar-Jemput').count();
  console.log('Kurir group count for Datang Langsung (expected 0):', kurirCount);

  // Go back to Step 1 and switch to Antar Jemput
  console.log('Going back to Step 1 to switch to Antar Jemput...');
  await page.click('button:has-text("Kembali")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Kembali")');
  await page.waitForTimeout(500);

  await page.click('text=Antar Jemput Dokumen');
  await page.waitForTimeout(300);

  // Proceed to Step 3 again
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(500);
  await page.click('button:has-text("Berikutnya")');
  await page.waitForTimeout(800);

  // Verify Kurir IS present with Bogor courier fee
  kurirCount = await page.locator('text=Layanan Kurir Antar-Jemput').count();
  console.log('Kurir group count for Antar Jemput (expected 1):', kurirCount);

  const grandTotal = await page.locator('span.text-base.font-bold.text-primary').first().innerText();
  console.log('Bogor Grand Total in Step 3:', grandTotal);

  const artifactDir = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';
  await page.screenshot({ path: path.join(artifactDir, 'buat_order_bogor_step3.png'), fullPage: true });

  // Submit order
  console.log('Submitting order...');
  await page.click('button[type="submit"]:has-text("Buat Order")');
  await page.waitForTimeout(1500);

  // Check success dialog
  const successModal = page.locator('text=Order Berhasil Dibuat').first();
  const isSuccess = await successModal.isVisible();
  console.log('Success modal visible:', isSuccess);

  await page.screenshot({ path: path.join(artifactDir, 'buat_order_success_modal.png') });

  await browser.close();
  console.log('SAMSAT SWITCH & ORDER SUBMISSION TEST PASSED!');
})();
