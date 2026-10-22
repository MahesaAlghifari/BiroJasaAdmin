const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Seed localStorage with admin user before navigation
  await page.addInitScript(() => {
    window.localStorage.setItem('sun89_auth_user', JSON.stringify({
      id: 'usr-admin-01',
      username: 'administrator',
      name: 'Administrator SUN89',
      role: 'administrator',
      permissions: ['*']
    }));
  });

  console.log('1. Navigating to /finance/belum-bayar...');
  await page.goto('http://localhost:3000/finance/belum-bayar', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Take screenshot of Belum Bayar tab
  await page.screenshot({ path: path.join(__dirname, 'verified_finance_belum_bayar.png'), fullPage: false });

  // Check detail on first row
  const detailButtons = await page.$$('button:has-text("Detail")');
  console.log('Found detail buttons in Belum Bayar:', detailButtons.length);
  if (detailButtons.length > 0) {
    await detailButtons[0].click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(__dirname, 'verified_finance_detail_view.png'), fullPage: true });

    const hasLacakBtn = await page.$('button:has-text("Lacak di Order Tracking")');
    const hasOrderSelesaiBadge = await page.$('text=Order Selesai & Terarsip');
    const hasCompressedDocs = await page.$('text=Berkas & Dokumen Hasil Proses (Terkompresi)');

    console.log('Result for Detail Page:');
    console.log('- Has Lacak button:', !!hasLacakBtn);
    console.log('- Has Order Selesai Badge:', !!hasOrderSelesaiBadge);
    console.log('- Has Compressed Documents Card:', !!hasCompressedDocs);

    // Test clicking "Lihat"
    const lihatButtons = await page.$$('button:has-text("Lihat")');
    console.log('Found "Lihat" preview buttons:', lihatButtons.length);
    if (lihatButtons.length > 0) {
      await lihatButtons[0].click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(__dirname, 'verified_document_preview_dialog.png') });
      console.log('- Preview modal successfully opened and captured!');
      
      const closeBtn = await page.$('button:has-text("Tutup")');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(400);
    }
  }

  // 2. Check Data Penjualan tabs
  console.log('2. Navigating to /data-penjualan...');
  await page.goto('http://localhost:3000/data-penjualan', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(__dirname, 'verified_data_penjualan_5_tabs.png'), fullPage: false });

  // 3. Check Messenger Samsat View
  console.log('3. Navigating to /messenger/samsat...');
  await page.goto('http://localhost:3000/messenger/samsat', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(__dirname, 'verified_messenger_samsat.png'), fullPage: true });

  console.log('All detailed checks completed!');
  await browser.close();
})();
