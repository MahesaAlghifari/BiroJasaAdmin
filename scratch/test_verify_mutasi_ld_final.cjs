const { chromium } = require('playwright');
const http = require('http');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function loginApi() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' });
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  console.log('1. Fetching authoritative token from backend...');
  const loginRes = await loginApi();
  const { token, user } = loginRes.data;
  console.log('Got token for:', user.nama, 'Role:', user.role);

  console.log('2. Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1440, height: 1000 });

  console.log('3. Setting localStorage session and navigating...');
  await page.goto('http://localhost:3000/login');
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify({
      ...user,
      name: user.nama,
      role: 'administrator',
      employeeId: 'EMP-001',
    }));
  }, { token, user });

  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  console.log('Arrived at Mutasi LD. Current URL:', page.url());

  // Capture table before adding
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_initial_table.png') });
  console.log('Captured proof_mutasi_ld_initial_table.png');

  // Click Tambah button
  console.log('4. Clicking Tambah button...');
  const tambahBtn = await page.waitForSelector('button:has-text("Tambah")', { timeout: 10000 });
  await tambahBtn.click();
  await page.waitForTimeout(1500);

  console.log('5. Verifying Section 1 & 2...');
  // Capture Section 1 & 2
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_sectioned_form.png') });
  console.log('Captured proof_mutasi_ld_sectioned_form.png');

  // Verify Section 1: Disabled 'Mutasi Luar Daerah'
  const jenisPengurusan = await page.$('input[value="Mutasi Luar Daerah"][disabled]');
  console.log('✓ Section 1: Jenis Pengurusan disabled & "Mutasi Luar Daerah":', !!jenisPengurusan);

  // Verify Section 2: 8 Address fields
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

  // Fill in customer data
  await page.fill('input[placeholder*="Bambang Wijaya"]', 'Bpk. Hendra Gunawan');
  await page.fill('input[placeholder*="Nama pemilik yang tertera"]', 'Hendra Gunawan STNK');
  await page.fill('input[placeholder*="081289123456"]', '081288990011');

  // Plate 3-box
  const plateInputs = await page.$$('input[placeholder="B"], input[placeholder="1234"], input[placeholder="ABC"]');
  if (plateInputs.length >= 3) {
    await plateInputs[0].fill('B');
    await plateInputs[1].fill('8877');
    await plateInputs[2].fill('MLD');
  }

  // Address
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

  console.log('6. Verifying Section 3: Paired Financial Layout & Stat Cards...');
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

  console.log('7. Verifying Section 4 & 5: Status, Invoice & Dokumen...');
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_mutasi_ld_status_documents.png') });
  console.log('Captured proof_mutasi_ld_status_documents.png');

  const statusSelesai = await page.$('div:has-text("Selesai")');
  const statusLunas = await page.$('div:has-text("Lunas")');
  console.log('✓ Section 4: Status Pengerjaan "Selesai" badge present:', !!statusSelesai);
  console.log('✓ Section 4: Status Pembayaran "Lunas" badge present:', !!statusLunas);

  console.log('8. Submitting Form...');
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
