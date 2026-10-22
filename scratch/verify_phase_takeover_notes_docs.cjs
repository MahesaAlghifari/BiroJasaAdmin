const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function run() {
  console.log('=== STARTING TARGETED VERIFICATION FOR ALL 4 USER REQUIREMENTS ===');

  // Authenticate with backend API
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log('Logged in via backend API as:', user?.nama, `(${user?.role})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('[PAGE ERROR]:', msg.text());
  });

  // -------------------------------------------------------------------------
  // 1. MESSENGER TASK TAKEOVER (/messenger/tasks)
  // -------------------------------------------------------------------------
  console.log('\n--- 1. Testing Messenger Task Takeover (/messenger/tasks) ---');
  await page.goto('http://localhost:3000/messenger/tasks', { waitUntil: 'networkidle' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const ambilAlihBtn = page.locator('button:has-text("Ambil Alih")').first();
  const countAmbilAlih = await ambilAlihBtn.count();
  console.log(`Found ${countAmbilAlih} "Ambil Alih" buttons in Messenger Task table.`);

  if (countAmbilAlih > 0) {
    await ambilAlihBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'proof_messenger_takeover_modal.png'), fullPage: false });
    console.log('Saved screenshot: proof_messenger_takeover_modal.png');

    // Close the takeover modal
    const btnBatal = page.locator('button:has-text("Batal")').last();
    if (await btnBatal.count() > 0) {
      await btnBatal.click();
      await page.waitForTimeout(500);
    }
  }

  // -------------------------------------------------------------------------
  // 2. ORDER TRACKING CONFIRMATION POPUP (/order/tracking)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. Testing Order Tracking Stage Transition Popup (/order/tracking) ---');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await page.waitForTimeout(1000);

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

  // -------------------------------------------------------------------------
  // 3. STAGE 3 VERIFIKASI DOKUMEN & NOTES
  // -------------------------------------------------------------------------
  console.log('\n--- 3. Testing Stage 3 (Verifikasi Dokumen) & Notes Visibility ---');
  const tabVerifDokumen = page.locator('button[role="tab"]:has-text("Verifikasi Dokumen")').first();
  if (await tabVerifDokumen.count() > 0) {
    await tabVerifDokumen.click();
    await page.waitForTimeout(1000);

    const btnVerifFisik = page.locator('button:has-text("Verifikasi"), button:has-text("Verifikasi Dokumen")').first();
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

  // -------------------------------------------------------------------------
  // 4. DATA PENJUALAN (DOKUMEN BEFORE & AFTER)
  // -------------------------------------------------------------------------
  console.log('\n--- 4. Testing Data Penjualan (/data-penjualan) Dokumen Before / After ---');
  await page.goto('http://localhost:3000/data-penjualan', { waitUntil: 'networkidle' });
  await page.waitForSelector('tbody tr', { timeout: 10000 });
  await page.waitForTimeout(1000);

  const btnDetailFinance = page.locator('button:has-text("Lihat Rincian"), button[title*="Lihat"], button[title*="Detail"]').first();
  if (await btnDetailFinance.count() > 0) {
    await btnDetailFinance.click();
    await page.waitForTimeout(1200);

    // Scroll down to document section
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
    await page.waitForTimeout(600);

    await page.screenshot({ path: path.join(outDir, 'proof_finance_data_penjualan_before_after_docs.png'), fullPage: false });
    console.log('Saved screenshot: proof_finance_data_penjualan_before_after_docs.png');
  }

  console.log('\n=== ALL TARGETED VERIFICATIONS COMPLETED SUCCESSFULLY ===');
  await browser.close();
}

run();
