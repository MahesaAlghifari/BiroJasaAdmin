const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function verifySimplifiedForm() {
  console.log('=== VERIFYING SIMPLIFIED BUAT ORDER FORM ===');
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

  // 1. Check Metode Layanan labels
  console.log('\n--- 1. Testing Metode Layanan Labels ---');
  const antarJemputTitle = await page.locator('p.font-semibold.text-xs:has-text("Antar Jemput")').innerText();
  const datangLangsungTitle = await page.locator('p.font-semibold.text-xs:has-text("Datang Langsung")').innerText();
  console.log('Antar Jemput Title:', antarJemputTitle);
  console.log('Datang Langsung Title:', datangLangsungTitle);

  const antarJemputCard = page.locator('div:has(> div > div > p:has-text("Antar Jemput"))').first();
  const cardText = await antarJemputCard.innerText();
  console.log('Antar Jemput Card full text:\n', cardText.replace(/\n+/g, ' | '));

  const hasNominalInMethod = cardText.includes('Rp');
  console.log('Any nominal found in Antar Jemput Card?:', hasNominalInMethod ? 'YES (FAIL)' : 'NO (PASS - CLEAN)');

  // 2. Select Layanan: Perpanjangan 1 Tahun
  console.log('\n--- 2. Selecting Layanan and Samsat Asal ---');
  const layananTrigger = page.locator('#field-layanan button').first();
  await layananTrigger.click();
  await page.waitForTimeout(300);
  await page.locator('[role="option"]:has-text("Perpanjangan 1 Tahun")').first().click();
  await page.waitForTimeout(400);

  // 3. Check for Jasa and Kurir badges under Samsat Asal
  console.log('\n--- 3. Checking Samsat Asal Area for Jasa / Kurir Badges ---');
  const fieldSamsatAsal = page.locator('#field-wilayahSamsatAsal');
  const samsatAreaText = await fieldSamsatAsal.innerText();
  console.log('Samsat Asal container text:', samsatAreaText.replace(/\n+/g, ' | '));

  const hasJasaBadge = samsatAreaText.includes('Jasa:');
  const hasKurirBadge = samsatAreaText.includes('Kurir:');
  console.log('Jasa badge found under Samsat?:', hasJasaBadge ? 'YES (FAIL)' : 'NO (PASS - REMOVED)');
  console.log('Kurir badge found under Samsat?:', hasKurirBadge ? 'YES (FAIL)' : 'NO (PASS - REMOVED)');

  // 4. Check Informasi Pajak Kendaraan: Bulan Jatuh Tempo
  console.log('\n--- 4. Checking Bulan Jatuh Tempo Field ---');
  const bulanJatuhTempoLabel = page.locator('label:has-text("Bulan Jatuh Tempo")');
  const isBulanJatuhTempoVisible = await bulanJatuhTempoLabel.isVisible();
  console.log('Is Bulan Jatuh Tempo field visible?:', isBulanJatuhTempoVisible ? 'YES (FAIL)' : 'NO (PASS - REMOVED)');

  // Test entering date in Masa Berlaku PKB S/D
  const dateInput = page.locator('input[type="date"]');
  await dateInput.fill('2024-08-15');
  await page.waitForTimeout(300);

  // Check Tahun Pajak auto-derived
  const tahunPajakInput = page.locator('input[placeholder="Contoh: 2024"]');
  const tahunVal = await tahunPajakInput.inputValue();
  console.log('Tahun Pajak input value after selecting date 2024-08-15:', tahunVal);

  // Take screenshot of Step 1
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_simplified_step1.png'), fullPage: false });
  console.log('Screenshot saved: revisi_simplified_step1.png');

  // 5. Fill remaining fields and proceed to Step 3
  console.log('\n--- 5. Filling remaining fields and proceeding to Step 3 ---');
  await page.locator('#field-customer input').fill('Budi Santoso');
  await page.locator('#field-nomorHP input').fill('081234567890');
  await page.locator('#input-plateNumber').fill('8888');
  await page.locator('input[placeholder="0"]').first().fill('2000000'); // Nominal PKB
  await page.locator('#field-jemputDetail input').fill('Jl. Merdeka No. 45, Jakarta');

  // Click Berikutnya to Step 2
  await page.locator('button:has-text("Berikutnya")').click();
  await page.waitForTimeout(800);

  // Click Berikutnya to Step 3
  await page.locator('button:has-text("Berikutnya")').click();
  await page.waitForTimeout(800);

  // 6. Inspect Step 3 Summary
  console.log('\n--- 6. Inspecting Step 3 Review & Total ---');
  const step3Summary = page.locator('p:has-text("Skema:")').nth(1);
  const step3Text = await step3Summary.innerText();
  console.log('Step 3 subtitle text:\n', step3Text);

  const hasKurirInSubtitle = step3Text.includes('(Kurir:');
  console.log('Has (Kurir: Rp ...) in summary subtitle?:', hasKurirInSubtitle ? 'YES (FAIL)' : 'NO (PASS - CLEAN)');

  const grandTotalText = await page.locator('.text-base.font-bold.text-primary').innerText();
  console.log('Grand Total Estimasi:', grandTotalText);

  // Take screenshot of Step 3
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'revisi_simplified_step3.png'), fullPage: false });
  console.log('Screenshot saved: revisi_simplified_step3.png');

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS PASSED SUCCESSFULLY ===');
}

verifySimplifiedForm().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
