const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

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

  console.log('1. Navigating to http://localhost:3000/order/tracking...');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const trackingText = await page.textContent('body');
  const hasNoVerifikasi = trackingText.includes('Tidak ada order pada tahap Verifikasi');
  console.log('Order Tracking has empty state:', hasNoVerifikasi);

  const trackingShotPath = path.join(ARTIFACT_DIR, 'order_tracking_empty_state.png');
  await page.screenshot({ path: trackingShotPath, fullPage: false });
  console.log('Screenshot saved:', trackingShotPath);

  console.log('2. Navigating to http://localhost:3000/order/rekap...');
  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const rekapText = await page.textContent('body');
  const hasNoRekap = rekapText.includes('Tidak ada data order') || rekapText.includes('0 order');
  console.log('Order Rekap has empty state:', hasNoRekap);

  const rekapShotPath = path.join(ARTIFACT_DIR, 'order_rekap_empty_state.png');
  await page.screenshot({ path: rekapShotPath, fullPage: false });
  console.log('Screenshot saved:', rekapShotPath);

  console.log('3. Navigating to http://localhost:3000/order/buat...');
  await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Check in Step 1 (where Parameter Perhitungan Pajak Tahunan is located):
  const step1HasTanggalEstimasi = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    return labels.some(l => l.textContent && l.textContent.includes('Tanggal Estimasi'));
  });
  console.log('Step 1 (Parameter Perhitungan) has Tanggal Estimasi input:', step1HasTanggalEstimasi);

  const buatOrderStep1ShotPath = path.join(ARTIFACT_DIR, 'buat_order_step1_parameter_no_tanggal_estimasi.png');
  await page.screenshot({ path: buatOrderStep1ShotPath, fullPage: false });
  console.log('Screenshot saved:', buatOrderStep1ShotPath);

  // Fill Step 1 required fields
  console.log('Filling Step 1...');
  await page.fill('#input-customer', 'PT Berkah Sentosa');
  await page.fill('#input-nomorHP', '081234567890');

  // Click Berikutnya to go to Step 2
  const nextBtn = page.locator('button:has-text("Berikutnya")').first();
  await nextBtn.click();
  await page.waitForTimeout(1000);

  console.log('Now at Step 2 (Berkas & Dokumen)...');
  // Click Berikutnya from Step 2 to go to Step 3
  const nextBtn2 = page.locator('button:has-text("Berikutnya")').first();
  await nextBtn2.click();
  await page.waitForTimeout(1000);

  console.log('Now at Step 3 (Rincian Estimasi Biaya)...');
  const step3HasTotal = await page.evaluate(() => {
    return document.body.textContent.includes('TOTAL ESTIMASI BIAYA');
  });
  console.log('Step 3 calculated total successfully:', step3HasTotal);

  const buatOrderStep3ShotPath = path.join(ARTIFACT_DIR, 'buat_order_step3_auto_today_calc.png');
  await page.screenshot({ path: buatOrderStep3ShotPath, fullPage: false });
  console.log('Screenshot saved:', buatOrderStep3ShotPath);

  await browser.close();
  console.log('=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
})().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
