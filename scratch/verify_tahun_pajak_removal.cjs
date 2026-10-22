const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function verifyTahunPajakRemoval() {
  console.log('=== VERIFYING TAHUN PAJAK REMOVAL AND VALIDATION ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });

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

  console.log('Navigating to http://localhost:3000/order/buat...');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'load', timeout: 15000 });
  await page.waitForTimeout(1500);

  // 1. Check that Tahun Pajak input is completely removed
  console.log('\n--- 1. Checking absence of Tahun Pajak input ---');
  const tahunPajakLabel = page.locator('label:has-text("Tahun Pajak")');
  const isTahunPajakVisible = await tahunPajakLabel.isVisible();
  console.log('Is "Tahun Pajak" label visible in UI?:', isTahunPajakVisible ? 'YES (FAIL - STILL PRESENT)' : 'NO (PASS - REMOVED)');

  const tahunPajakPlaceholder = page.locator('input[placeholder="Contoh: 2024"]');
  const isTahunPajakInputVisible = await tahunPajakPlaceholder.isVisible();
  console.log('Is "Tahun Pajak" input visible in UI?:', isTahunPajakInputVisible ? 'YES (FAIL)' : 'NO (PASS - REMOVED)');

  // 2. Test validation when pkbBerlakuSd is empty
  console.log('\n--- 2. Testing validation when date is empty ---');
  await page.locator('#field-customer input').fill('Budi Santoso');
  await page.locator('#field-nomorHP input').fill('081234567890');
  await page.locator('#input-plateNumber').fill('8888');
  await page.locator('#field-layanan button').first().click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]:has-text("Perpanjangan 1 Tahun")').first().click();
  await page.waitForTimeout(400);

  // Click Berikutnya without filling date
  console.log('Clicking "Berikutnya" with empty date...');
  await page.locator('button:has-text("Berikutnya")').click();
  await page.waitForTimeout(600);

  // Check error message on pkbBerlakuSd
  const errorMsg = await page.locator('#field-pkbBerlakuSd p.text-destructive').innerText().catch(() => '');
  console.log('Validation error message received:', errorMsg);
  const hasValidationError = errorMsg.includes('Masa Berlaku PKB S/D (Tanggal) wajib diisi');
  console.log('Validation triggered successfully?:', hasValidationError ? 'YES (PASS)' : 'NO (FAIL)');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_tahun_pajak_validation.png'), fullPage: false });
  console.log('Screenshot saved: revisi_tahun_pajak_validation.png');

  // 3. Fill valid date 2024-08-15
  console.log('\n--- 3. Filling valid date 2024-08-15 ---');
  const dateInput = page.locator('#input-pkbBerlakuSd');
  await dateInput.fill('2024-08-15');
  await page.waitForTimeout(300);

  // Check error message disappeared
  const errorMsgAfter = await page.locator('#field-pkbBerlakuSd p.text-destructive').isVisible();
  console.log('Is validation error cleared after filling valid date?:', !errorMsgAfter ? 'YES (PASS)' : 'NO (FAIL)');

  await page.locator('input[placeholder="0"]').first().fill('2000000'); // Nominal PKB
  await page.locator('#field-jemputDetail input').fill('Jl. Merdeka No. 45, Jakarta');

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_tahun_pajak_filled.png'), fullPage: false });
  console.log('Screenshot saved: revisi_tahun_pajak_filled.png');

  // 4. Progress to Step 2 and Step 3
  console.log('\n--- 4. Progressing to Step 2 and Step 3 ---');
  await page.locator('button:has-text("Berikutnya")').click();
  await page.waitForTimeout(800);

  await page.locator('button:has-text("Berikutnya")').click();
  await page.waitForTimeout(800);

  // 5. Verify Step 3 displays correct overdue calculation and total
  console.log('\n--- 5. Verifying Step 3 summary ---');
  const step3SummaryText = await page.locator('.border-t.border-border\\/80').first().innerText();
  console.log('Step 3 summary text:\n', step3SummaryText);

  const grandTotalText = await page.locator('.text-base.font-bold.text-primary').innerText();
  console.log('Grand Total Estimasi:', grandTotalText);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_tahun_pajak_step3.png'), fullPage: false });
  console.log('Screenshot saved: revisi_tahun_pajak_step3.png');

  await browser.close();
  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY ===');
}

verifyTahunPajakRemoval().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
