const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  
  console.log('Navigating to login...');
  await page.goto('http://localhost:3000/#/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  await page.fill('input[type="email"]', 'svp@birojasa.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  console.log('Submitted login form, waiting for navigation...');
  await page.waitForTimeout(2000);
  console.log('Current URL after login:', page.url());

  // 1. Messenger Task (/messenger/tasks)
  console.log('Navigating to /messenger/tasks...');
  await page.goto('http://localhost:3000/#/messenger/tasks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const ambilAlihBtn = page.locator('button:has-text("Ambil Alih")').first();
  const ambilAlihCount = await ambilAlihBtn.count();
  console.log('Ambil Alih count in table:', ambilAlihCount);

  if (ambilAlihCount > 0) {
    await ambilAlihBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'proof_messenger_takeover_modal.png'), fullPage: false });
    console.log('Saved screenshot: proof_messenger_takeover_modal.png');

    const btnBatal = page.locator('button:has-text("Batal")').last();
    if (await btnBatal.count() > 0) {
      await btnBatal.click();
      await page.waitForTimeout(500);
    }
  }

  // 2. Order Tracking Transition Confirmation Popup (/order/tracking)
  console.log('Navigating to /order/tracking...');
  await page.goto('http://localhost:3000/#/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const btnVerifOrder = page.locator('button:has-text("Verifikasi Order")').first();
  if (await btnVerifOrder.count() > 0) {
    await btnVerifOrder.click();
    await page.waitForTimeout(1000);

    const btnAdvanceS1 = page.locator('button:has-text("Verifikasi & Lanjut ke Penjadwalan")').first();
    if (await btnAdvanceS1.count() > 0) {
      await btnAdvanceS1.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, 'proof_order_tracking_confirm_advance_modal.png'), fullPage: false });
      console.log('Saved screenshot: proof_order_tracking_confirm_advance_modal.png');

      const btnBatalAlert = page.locator('button:has-text("Periksa Kembali"), button:has-text("Batal")').first();
      if (await btnBatalAlert.count() > 0) {
        await btnBatalAlert.click();
        await page.waitForTimeout(500);
      }
    }

    const btnBatalS1 = page.locator('button:has-text("Batal")').first();
    if (await btnBatalS1.count() > 0) {
      await btnBatalS1.click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Stage 3 Verifikasi Dokumen & Notes
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
      console.log('Saved screenshot: proof_order_tracking_stage3_notes_docs.png');

      const btnBatalS3 = page.locator('button:has-text("Batal")').last();
      if (await btnBatalS3.count() > 0) {
        await btnBatalS3.click();
        await page.waitForTimeout(500);
      }
    }
  }

  // 4. Data Penjualan (/finance/data-penjualan or /data-penjualan)
  console.log('Navigating to /data-penjualan...');
  await page.goto('http://localhost:3000/#/data-penjualan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const btnDetail = page.locator('button:has-text("Lihat Rincian"), button[title*="Lihat"], button[title*="Detail"]').first();
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
    console.log('Saved screenshot: proof_finance_data_penjualan_before_after_docs.png');
  }

  console.log('--- ALL DONE ---');
  await browser.close();
})();
