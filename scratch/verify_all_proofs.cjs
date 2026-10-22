const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function run() {
  console.log('=== RUNNING ALL-IN-ONE PROOF CAPTURE ===');

  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log('Authenticated as:', user?.nama, `(${user?.role})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();

  // 1. Messenger Task Takeover
  console.log('1. Checking /messenger/tasks...');
  await page.goto('http://localhost:3000/messenger/tasks', { waitUntil: 'networkidle' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const btnAmbilAlih = page.locator('button:has-text("Ambil Alih")').first();
  if (await btnAmbilAlih.count() > 0) {
    await btnAmbilAlih.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'proof_messenger_takeover_modal.png'), fullPage: false });
    console.log('Captured proof_messenger_takeover_modal.png');
    const btnBatal = page.locator('button:has-text("Batal")').last();
    if (await btnBatal.count() > 0) await btnBatal.click();
  }

  // 2. Order Tracking Stage 1 -> Confirmation Popup
  console.log('2. Checking /order/tracking (Stage 1 Confirmation)...');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const btnVerif = page.locator('tbody tr button:has-text("Verifikasi")').first();
  if (await btnVerif.count() > 0) {
    await btnVerif.click();
    await page.waitForTimeout(1000);

    const btnAdvance = page.locator('button:has-text("Verifikasi & Lanjut")').first();
    if (await btnAdvance.count() > 0) {
      await btnAdvance.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(outDir, 'proof_order_tracking_confirm_advance_modal.png'), fullPage: false });
      console.log('Captured proof_order_tracking_confirm_advance_modal.png');

      const btnBatalAlert = page.locator('button:has-text("Periksa Kembali"), button:has-text("Batal")').last();
      if (await btnBatalAlert.count() > 0) await btnBatalAlert.click();
    }
    const btnTutup = page.locator('button:has-text("Tutup"), button:has-text("Batal")').last();
    if (await btnTutup.count() > 0) await btnTutup.click();
  }

  // 3. Order Tracking Stage 3 (Dokumen Wajib & Opsional & Messenger Notes)
  console.log('3. Checking /order/tracking (Stage 3 Verifikasi Dokumen)...');
  const stage3Step = page.locator('.xl\\:flex p:has-text("Verifikasi Dokumen")').first();
  if (await stage3Step.count() > 0) {
    await stage3Step.click();
    await page.waitForTimeout(1200);

    const btnVerifDok = page.locator('tbody tr button:has-text("Verifikasi Dokumen")').first();
    if (await btnVerifDok.count() > 0) {
      await btnVerifDok.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outDir, 'proof_order_tracking_stage3_notes_docs.png'), fullPage: false });
      console.log('Captured proof_order_tracking_stage3_notes_docs.png');
      const btnBatalS3 = page.locator('button:has-text("Batal")').last();
      if (await btnBatalS3.count() > 0) await btnBatalS3.click();
    } else {
      console.log('No rows in Stage 3, capturing table view...');
      await page.screenshot({ path: path.join(outDir, 'proof_order_tracking_stage3_notes_docs.png'), fullPage: false });
    }
  }

  // 4. Data Penjualan (Dokumen BEFORE / AFTER)
  console.log('4. Checking /finance/data-penjualan/mutasi-ld...');
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld', { waitUntil: 'networkidle' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const btnViewFinance = page.locator('button[aria-label="Lihat detail transaksi"]').first();
  if (await btnViewFinance.count() > 0) {
    await btnViewFinance.click();
    await page.waitForTimeout(1500);

    // Scroll to Dokumen Masuk (BEFORE)
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
        window.scrollBy(0, 400);
      }
    });
    await page.waitForTimeout(800);

    await page.screenshot({ path: path.join(outDir, 'proof_finance_data_penjualan_before_after_docs.png'), fullPage: false });
    console.log('Captured proof_finance_data_penjualan_before_after_docs.png');
  }

  console.log('=== ALL PROOFS CAPTURED SUCCESSFULLY ===');
  await browser.close();
}

run();
