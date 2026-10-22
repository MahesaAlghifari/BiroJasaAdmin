const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  // Pre-seed localStorage with admin authentication
  await context.addInitScript(() => {
    localStorage.setItem('auth_token', 'mock-jwt-token');
    localStorage.setItem('auth_user', JSON.stringify({
      id: 'emp-svp',
      userId: 'emp-svp',
      nama: 'Budi Santoso',
      role: 'administrator'
    }));
  });

  const page = await context.newPage();

  // Test 1: Messenger Tasks
  console.log('Navigating to http://localhost:3000/messenger/tasks...');
  await page.goto('http://localhost:3000/messenger/tasks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  console.log('Current URL:', page.url());

  const ambilAlihBtn = page.locator('button:has-text("Ambil Alih")').first();
  const count = await ambilAlihBtn.count();
  console.log('Ambil Alih button count:', count);

  if (count > 0) {
    await ambilAlihBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'proof_messenger_takeover_modal.png'), fullPage: false });
    console.log('Saved proof_messenger_takeover_modal.png');

    const btnBatal = page.locator('button:has-text("Batal")').last();
    if (await btnBatal.count() > 0) {
      await btnBatal.click();
      await page.waitForTimeout(500);
    }
  }

  // Test 2: Order Tracking Advance Confirmation Modal
  console.log('Navigating to http://localhost:3000/order/tracking...');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const btnVerifOrder = page.locator('button:has-text("Verifikasi Order")').first();
  console.log('Verifikasi Order button count:', await btnVerifOrder.count());
  if (await btnVerifOrder.count() > 0) {
    await btnVerifOrder.click();
    await page.waitForTimeout(1000);

    const btnAdvance = page.locator('button:has-text("Verifikasi & Lanjut ke Penjadwalan")').first();
    console.log('Advance button count:', await btnAdvance.count());
    if (await btnAdvance.count() > 0) {
      await btnAdvance.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, 'proof_order_tracking_confirm_advance_modal.png'), fullPage: false });
      console.log('Saved proof_order_tracking_confirm_advance_modal.png');

      const btnBatalAlert = page.locator('button:has-text("Periksa Kembali"), button:has-text("Batal")').first();
      if (await btnBatalAlert.count() > 0) {
        await btnBatalAlert.click();
        await page.waitForTimeout(500);
      }
    }

    const btnBatalModal = page.locator('button:has-text("Batal")').first();
    if (await btnBatalModal.count() > 0) {
      await btnBatalModal.click();
      await page.waitForTimeout(500);
    }
  }

  // Test 3: Stage 3 Verifikasi Dokumen & Notes
  console.log('Checking Stage 3 (Verifikasi Dokumen)...');
  const tabVerifDokumen = page.locator('button[role="tab"]:has-text("Verifikasi Dokumen")').first();
  if (await tabVerifDokumen.count() > 0) {
    await tabVerifDokumen.click();
    await page.waitForTimeout(1000);

    const btnVerifFisik = page.locator('button:has-text("Verifikasi")').first();
    if (await btnVerifFisik.count() > 0) {
      await btnVerifFisik.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, 'proof_order_tracking_stage3_notes_docs.png'), fullPage: false });
      console.log('Saved proof_order_tracking_stage3_notes_docs.png');

      const btnBatalS3 = page.locator('button:has-text("Batal")').last();
      if (await btnBatalS3.count() > 0) {
        await btnBatalS3.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // Test 4: Data Penjualan (Dokumen BEFORE / AFTER)
  console.log('Navigating to http://localhost:3000/data-penjualan...');
  await page.goto('http://localhost:3000/data-penjualan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const btnDetail = page.locator('button:has-text("Lihat Rincian"), button[title*="Lihat"], button[title*="Detail"]').first();
  console.log('Detail button count:', await btnDetail.count());
  if (await btnDetail.count() > 0) {
    await btnDetail.click();
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      const docHeader = document.evaluate(
        "//*[contains(text(), 'Dokumen Masuk (BEFORE)')]",
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null
      ).singleNodeValue;
      if (docHeader) {
        docHeader.scrollIntoView({ behavior: 'instant', block: 'center' });
      } else {
        window.scrollBy(0, 450);
      }
    });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(outDir, 'proof_finance_data_penjualan_before_after_docs.png'), fullPage: false });
    console.log('Saved proof_finance_data_penjualan_before_after_docs.png');
  }

  await browser.close();
})();
