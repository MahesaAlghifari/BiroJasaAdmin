const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('1. Navigating to root / login...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Login if required
  const usernameInput = await page.$('input[type="text"], input[name="username"], input[name="email"]');
  if (usernameInput) {
    console.log('Logging in as administrator...');
    await usernameInput.fill('admin');
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) await passwordInput.fill('admin123');
    const submitBtn = await page.$('button[type="submit"]');
    if (submitBtn) await submitBtn.click();
    await page.waitForTimeout(1000);
  }

  // Test 1: Check Data Penjualan only has 5 operational tabs
  console.log('2. Checking Data Penjualan categories...');
  await page.goto('http://localhost:3000/data-penjualan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const tabTexts = await page.$$eval('[role="tab"]', tabs => tabs.map(t => t.innerText.trim()));
  console.log('Data Penjualan Tabs:', tabTexts);
  const forbiddenTabs = ['Belum & Kurang Bayar', 'Profit Terpending', 'Cashback Terpending'];
  const hasForbidden = tabTexts.some(t => forbiddenTabs.includes(t));
  console.log('Are non-operational tabs excluded from Data Penjualan?', !hasForbidden);

  // Take screenshot of Data Penjualan
  await page.screenshot({ path: path.join(__dirname, 'data_penjualan_tabs.png'), fullPage: false });

  // Test 2: Check Finance Subtabs: Belum Bayar, Profit Pending, Cashback Pending
  console.log('3. Checking Finance -> Belum Bayar...');
  await page.goto('http://localhost:3000/finance/belum-bayar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const belumBayarBtnTambah = await page.$('button:has-text("Tambah Data"), button:has-text("Tambah Transaksi")');
  console.log('Belum Bayar has Add button?', !!belumBayarBtnTambah);
  await page.screenshot({ path: path.join(__dirname, 'finance_belum_bayar.png') });

  console.log('4. Checking Finance -> Profit Pending...');
  await page.goto('http://localhost:3000/finance/profit-pending', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const profitBtnTambah = await page.$('button:has-text("Tambah Data"), button:has-text("Tambah Transaksi")');
  console.log('Profit Pending has Add button?', !!profitBtnTambah);
  await page.screenshot({ path: path.join(__dirname, 'finance_profit_pending.png') });

  console.log('5. Checking Finance -> Cashback Pending...');
  await page.goto('http://localhost:3000/finance/cashback-pending', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const cashbackBtnTambah = await page.$('button:has-text("Tambah Data"), button:has-text("Tambah Transaksi")');
  console.log('Cashback Pending has Add button?', !!cashbackBtnTambah);
  await page.screenshot({ path: path.join(__dirname, 'finance_cashback_pending.png') });

  // Test 3: Check Detail Page for Finished Order -> Lacak button hidden & Compressed docs shown
  console.log('6. Checking Detail Page for Finished Order...');
  // Click on the first row in the table or navigate directly
  const firstDetailBtn = await page.$('button:has-text("Detail"), button[title="Lihat Detail"], tr td');
  if (firstDetailBtn) {
    await firstDetailBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, 'finance_detail_page.png'), fullPage: true });

    const hasLacakBtn = await page.$('button:has-text("Lacak di Order Tracking")');
    const hasOrderSelesaiBadge = await page.$('text=Order Selesai & Terarsip');
    const hasCompressedDocs = await page.$('text=Berkas & Dokumen Hasil Proses (Terkompresi)');

    console.log('Has Lacak di Order Tracking button?', !!hasLacakBtn);
    console.log('Has Order Selesai & Terarsip badge?', !!hasOrderSelesaiBadge);
    console.log('Has Berkas & Dokumen Hasil Proses (Terkompresi)?', !!hasCompressedDocs);

    // If documents are present, test clicking "Lihat"
    const lihatBtn = await page.$('button:has-text("Lihat")');
    if (lihatBtn) {
      console.log('Clicking "Lihat" preview button...');
      await lihatBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(__dirname, 'document_preview_dialog.png') });
      console.log('Preview dialog captured!');
      // Close preview
      const closeBtn = await page.$('button:has-text("Tutup")');
      if (closeBtn) await closeBtn.click();
    }
  }

  // Test 4: Messenger Samsat View -> Check Mutasi components
  console.log('7. Checking Messenger Samsat View...');
  await page.goto('http://localhost:3000/messenger/samsat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'messenger_samsat_view.png') });

  console.log('All tests completed successfully!');
  await browser.close();
})();
