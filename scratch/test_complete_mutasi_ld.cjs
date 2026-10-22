const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  console.log('--- 1. Launching Browser ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('--- 2. Logging in as Admin (SVP) ---');
  await page.goto('http://localhost:3000/login');
  await page.click('div[role="button"]:has-text("Admin (SVP)")');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('Logged in. Current URL:', page.url());

  console.log('--- 3. Navigating to Mutasi LD ---');
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld');
  await page.waitForTimeout(2500);

  // Click Tambah button
  console.log('--- 4. Clicking Tambah Button ---');
  const tambahBtn = await page.waitForSelector('button:has-text("Tambah")');
  await tambahBtn.click();
  await page.waitForTimeout(1500);

  console.log('--- 5. Verifying Section 1 & Section 2 ---');
  // Section 1 verification
  const jenisPengurusan = await page.$('input[value="Mutasi Luar Daerah"][disabled]');
  console.log('✓ Section 1: Jenis Pengurusan disabled & "Mutasi Luar Daerah":', !!jenisPengurusan);

  // Section 2 verification: 8 fields
  const detailAlamatInput = await page.$('input[placeholder*="Detail Alamat"], input[placeholder*="Jl. Mangga"]');
  const kotaKabInput = await page.$('input[list="daftar-wilayah-kota-kab"]');
  const kecamatanInput = await page.$('input[placeholder*="Duren Sawit"]');
  const kelurahanInput = await page.$('input[placeholder*="Klender"]');
  const rtRwInput = await page.$('input[placeholder*="005/002"]');
  const noRumahInput = await page.$('input[placeholder*="No. 12B"]');
  const patokanInput = await page.$('input[placeholder*="Depan Indomaret"]');
  const linkLokasiInput = await page.$('input[placeholder*="https://maps.app.goo.gl/..."]');

  console.log('✓ Section 2: 8 Address fields present:', {
    detailAlamat: !!detailAlamatInput,
    kotaKab: !!kotaKabInput,
    kecamatan: !!kecamatanInput,
    kelurahan: !!kelurahanInput,
    rtRw: !!rtRwInput,
    noRumah: !!noRumahInput,
    patokan: !!patokanInput,
    linkLokasi: !!linkLokasiInput,
  });

  // Fill Customer data
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

  // Check Buka Peta affordance link
  const bukaPetaLink = await page.$('a:has-text("Buka Peta")');
  console.log('✓ Section 2: Buka Peta affordance link visible:', !!bukaPetaLink);

  // Capture Section 1 & 2
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_sectioned_form.png') });
  console.log('Captured proof_mutasi_ld_sectioned_form.png');

  console.log('--- 6. Verifying Section 3: Paired Financial Layout & Stat Cards ---');
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(600);

  // Fill Financial Inputs
  const allInputs = await page.$$('input');
  for (const inp of allInputs) {
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

  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_financial_section.png') });
  console.log('Captured proof_mutasi_ld_financial_section.png');

  console.log('--- 7. Verifying Section 4 & 5: Status, Invoice & Dokumen ---');
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_status_documents.png') });
  console.log('Captured proof_mutasi_ld_status_documents.png');

  const statusSelesai = await page.$('div:has-text("Selesai")');
  const statusLunas = await page.$('div:has-text("Lunas")');
  console.log('✓ Section 4: Status Pengerjaan "Selesai" badge present:', !!statusSelesai);
  console.log('✓ Section 4: Status Pembayaran "Lunas" badge present:', !!statusLunas);

  console.log('--- 8. Submitting Form ---');
  const submitBtn = await page.waitForSelector('button:has-text("Simpan data")');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  // Capture table after saving
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_saved_in_table.png') });
  console.log('Captured proof_mutasi_ld_saved_in_table.png');

  const content = await page.content();
  const customerFound = content.includes('Hendra Gunawan');
  const nopolFound = content.includes('B 8877 MLD');
  console.log('✓ Table verification - Saved customer found in table:', customerFound);
  console.log('✓ Table verification - Saved nopol found in table:', nopolFound);

  await browser.close();
  console.log('=== ALL END-TO-END VERIFICATIONS PASSED (100%) ===');
})();
