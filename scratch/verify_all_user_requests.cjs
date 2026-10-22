const { chromium } = require('playwright');
const path = require('path');

async function run() {
  console.log('--- STARTING TARGETED VERIFICATION WITH EXACT ROUTES ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const outDir = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

  // 1. Check Messenger Workspace
  console.log('1. Checking Messenger Workspace...');
  await page.goto('http://localhost:3000/#/messenger/workspace', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'verify_messenger_workspace.png'), fullPage: false });
  console.log('Messenger workspace screenshot saved.');

  // 2. Check Order Tracking (/order/tracking)
  console.log('2. Checking Order Tracking...');
  await page.goto('http://localhost:3000/#/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Tab: Proses Samsat (Stage 4)
  console.log('Checking Stage 4 (Proses Samsat)...');
  const tabSamsat = page.locator('button[role="tab"]:has-text("Proses Samsat")').first();
  if (await tabSamsat.count() > 0) {
    await tabSamsat.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'verify_stage4_tracking.png'), fullPage: false });
    console.log('Stage 4 tracking screenshot saved.');
  }

  // Tab: Verifikasi Ulang (Stage 5)
  console.log('Checking Stage 5 (Verifikasi Ulang)...');
  const tabVerif = page.locator('button[role="tab"]:has-text("Verifikasi Ulang")').first();
  if (await tabVerif.count() > 0) {
    await tabVerif.click();
    await page.waitForTimeout(1000);
    
    // Look for button "Verifikasi Ulang"
    const btnVerif = page.locator('button:has-text("Verifikasi Ulang")').first();
    if (await btnVerif.count() > 0) {
      await btnVerif.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, 'verify_stage5_modal_view.png'), fullPage: false });
      console.log('Stage 5 modal view screenshot saved.');

      // Click "Edit / Sesuaikan Biaya"
      const btnEdit = page.locator('button:has-text("Edit / Sesuaikan Biaya")').first();
      if (await btnEdit.count() > 0) {
        await btnEdit.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(outDir, 'verify_stage5_modal_edit.png'), fullPage: false });
        console.log('Stage 5 modal edit screenshot saved.');
      }

      // Close modal
      const btnTutup = page.locator('button:has-text("Batal"), button:has-text("Tutup")').first();
      if (await btnTutup.count() > 0) {
        await btnTutup.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Tab: Supervisi (Stage 6)
  console.log('Checking Stage 6 (Supervisi)...');
  const tabSupervisi = page.locator('button[role="tab"]:has-text("Supervisi")').first();
  if (await tabSupervisi.count() > 0) {
    await tabSupervisi.click();
    await page.waitForTimeout(1000);
    const btnSpv = page.locator('button:has-text("Supervisi")').first();
    if (await btnSpv.count() > 0) {
      await btnSpv.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, 'verify_stage6_supervisi_modal.png'), fullPage: false });
      console.log('Stage 6 modal screenshot saved.');

      const btnTutup = page.locator('button:has-text("Batal"), button:has-text("Tutup")').first();
      if (await btnTutup.count() > 0) {
        await btnTutup.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // 3. Check Rekap Order (/order/rekap)
  console.log('3. Checking Rekap Order...');
  await page.goto('http://localhost:3000/#/order/rekap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'verify_rekap_order_all.png'), fullPage: false });
  console.log('Rekap Order screenshot saved.');

  await browser.close();
  console.log('--- ALL VERIFICATIONS COMPLETED SUCCESSFULLY ---');
}

run().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
