const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 1000 });

  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  
  await page.goto('http://localhost:3000/login');
  await page.click('div[role="button"]:has-text("Admin (SVP)")');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld');
  await page.waitForTimeout(2500);

  const tambahBtn = await page.waitForSelector('button:has-text("Tambah")');
  await tambahBtn.click();
  await page.waitForTimeout(1000);

  // Fill in customer data
  await page.fill('input[placeholder*="Bambang Wijaya"]', 'Bpk. Hendra Gunawan');
  await page.fill('input[placeholder*="Nama pemilik yang tertera"]', 'Hendra Gunawan STNK');
  await page.fill('input[placeholder*="081289123456"]', '081288990011');

  // Fill Plate 3-box
  const plateInputs = await page.$$('input[placeholder="B"], input[placeholder="1234"], input[placeholder="ABC"]');
  if (plateInputs.length >= 3) {
    await plateInputs[0].fill('B');
    await plateInputs[1].fill('8877');
    await plateInputs[2].fill('MLD');
  }

  // Address
  await page.fill('input[placeholder*="Detail Alamat"]', 'Jl. KH Noer Ali Kav. 20');
  await page.fill('input[list="daftar-wilayah-kota-kab"]', 'Kota Bekasi');
  await page.fill('input[placeholder*="Duren Sawit"]', 'Bekasi Barat');
  await page.fill('input[placeholder*="Klender"]', 'Jakasampurna');

  const submitBtn = await page.waitForSelector('button:has-text("Simpan data")');
  await submitBtn.click();
  await page.waitForTimeout(1500);

  const toasts = await page.$$eval('[data-sonner-toast]', els => els.map(e => e.innerText));
  console.log('Toasts after submit:', toasts);

  const pageText = await page.innerText('body');
  console.log('Is "Tambah data" still in body?', pageText.includes('Tambah data'));

  await browser.close();
})();
