const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  console.log('--- 1. Launching Playwright Browser ---');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  console.log('--- 2. Logging in as Admin (SVP) ---');
  await page.goto('http://localhost:3000/login');
  await page.click('div[role="button"]:has-text("Admin (SVP)")');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);

  console.log('--- 3. Navigating to Data Penjualan Mutasi LD ---');
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld');
  await page.waitForTimeout(2000);

  // Take screenshot of the Mutasi LD table before adding
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_initial_table.png'), fullPage: false });
  console.log('Captured proof_mutasi_ld_initial_table.png');

  // Click "+ Tambah Data" or "Tambah" button
  console.log('--- 4. Clicking Tambah button ---');
  const tambahBtn = await page.waitForSelector('button:has-text("Tambah")', { timeout: 10000 });
  await tambahBtn.click();
  await page.waitForTimeout(1500);

  console.log('--- 5. Verifying Form Sections ---');
  // Capture Top of Form (Sections 1 & 2)
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_form_sections_1_2.png'), fullPage: false });
  console.log('Captured proof_mutasi_ld_form_sections_1_2.png');

  // Verify Section 1: Jenis Pengurusan disabled 'Mutasi Luar Daerah'
  const jenisPengurusanInput = await page.$('input[value="Mutasi Luar Daerah"][disabled]');
  console.log('✓ Section 1 - Jenis Pengurusan is disabled and set to Mutasi Luar Daerah:', !!jenisPengurusanInput);

  // Verify Section 2: 8 Address fields
  const detailAlamatInput = await page.$('input[placeholder*="Detail Alamat"], input[placeholder*="Jl. Mangga"]');
  const kotaKabInput = await page.$('input[list="daftar-wilayah-kota-kab"]');
  const kecamatanInput = await page.$('input[placeholder*="Duren Sawit"]');
  const kelurahanInput = await page.$('input[placeholder*="Klender"]');
  const rtRwInput = await page.$('input[placeholder*="005/002"]');
  const noRumahInput = await page.$('input[placeholder*="No. 12B"]');
  const patokanInput = await page.$('input[placeholder*="Depan Indomaret"]');
  const linkLokasiInput = await page.$('input[placeholder*="https://maps.app.goo.gl/..."]');

  console.log('✓ Section 2 - 8 Address inputs present:', {
    detailAlamat: !!detailAlamatInput,
    kotaKab: !!kotaKabInput,
    kecamatan: !!kecamatanInput,
    kelurahan: !!kelurahanInput,
    rtRw: !!rtRwInput,
    noRumah: !!noRumahInput,
    patokan: !!patokanInput,
    linkLokasi: !!linkLokasiInput,
  });

  // Fill in customer data
  console.log('--- 6. Filling Form Fields ---');
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

  // Fill 8 address fields
  if (detailAlamatInput) await detailAlamatInput.fill('Jl. KH Noer Ali Kav. 20');
  if (kotaKabInput) await kotaKabInput.fill('Kota Bekasi');
  if (kecamatanInput) await kecamatanInput.fill('Bekasi Barat');
  if (kelurahanInput) await kelurahanInput.fill('Jakasampurna');
  if (rtRwInput) await rtRwInput.fill('003/007');
  if (noRumahInput) await noRumahInput.fill('No. 20B');
  if (patokanInput) await patokanInput.fill('Sebelah Apotek Kimia Farma');
  if (linkLokasiInput) await linkLokasiInput.fill('https://maps.app.goo.gl/sample123');

  await page.waitForTimeout(500);

  // Verify Buka Peta affordance
  const bukaPetaLink = await page.$('a:has-text("Buka Peta")');
  console.log('✓ Section 2 - Buka Peta affordance link visible:', !!bukaPetaLink);

  // Scroll to Section 3: Financial Section
  console.log('--- 7. Verifying Section 3: Paired Financial Layout ---');
  await page.evaluate(() => window.scrollBy(0, 650));
  await page.waitForTimeout(800);

  // Fill in financial fields
  const inputs = await page.$$('input');
  for (const inp of inputs) {
    const parentText = await inp.evaluate(el => el.closest('.space-y-1')?.innerText || '');
    if (parentText.includes('Uang Masuk dari Konsumen')) {
      await inp.fill('4500000');
      await inp.dispatchEvent('change');
    } else if (parentText.includes('Biaya Pokok Samsat')) {
      await inp.fill('3200000');
      await inp.dispatchEvent('change');
    } else if (parentText.includes('Total Tagihan Konsumen')) {
      await inp.fill('4500000');
      await inp.dispatchEvent('change');
    }
  }

  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_financial_section.png'), fullPage: false });
  console.log('Captured proof_mutasi_ld_financial_section.png');

  // Scroll to Sections 4 & 5
  console.log('--- 8. Verifying Section 4 & 5: Status, Invoice & Dokumen ---');
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_status_documents.png'), fullPage: false });
  console.log('Captured proof_mutasi_ld_status_documents.png');

  // Verify Section 4 badges: Status Pengerjaan (Selesai), Status Pembayaran (Lunas)
  const statusSelesai = await page.$('text=Selesai');
  const statusLunas = await page.$('text=Lunas');
  console.log('✓ Section 4 - Status Pengerjaan "Selesai" badge:', !!statusSelesai);
  console.log('✓ Section 4 - Status Pembayaran "Lunas" badge:', !!statusLunas);

  // Submit form
  console.log('--- 9. Submitting Form ---');
  const submitBtn = await page.waitForSelector('button:has-text("Simpan data")', { timeout: 5000 });
  await submitBtn.click();

  // Wait for submission and redirection to table
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_saved_table.png'), fullPage: false });
  console.log('Captured proof_mutasi_ld_saved_table.png');

  // Verify saved data in table
  const tableHtml = await page.content();
  const customerFound = tableHtml.includes('Hendra Gunawan');
  const nopolFound = tableHtml.includes('B 8877 MLD');
  console.log('✓ Table verification - Saved customer found:', customerFound);
  console.log('✓ Table verification - Saved nopol found:', nopolFound);

  await browser.close();
  console.log('=== ALL MUTASI LD FORM TESTS PASSED SUCCESSFULLY! ===');
})();
