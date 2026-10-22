const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function getAuthSession() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const data = await res.json();
  return { token: data.data.token, user: data.data.user };
}

async function testBrowserProfitFlow() {
  const session = await getAuthSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify({ ...user, role: 'administrator', jabatan: 'SVP' }));
      localStorage.setItem('user_role', 'administrator');
    },
    session
  );

  const page = await context.newPage();

  // Create an order via backend API with full payment
  console.log("Creating test order with full payment via API...");
  const orderRes = await fetch('http://localhost:3001/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.token}`
    },
    body: JSON.stringify({
      customer: 'PT. Kencana Mandiri Solusi',
      nomorHP: '081289123456',
      layanan: 'Perpanjangan STNK Tahunan',
      currentStep: 4,
      currentStageName: 'Proses Samsat',
      namaPemilik: 'PT. Kencana Mandiri Solusi',
      jenisKendaraan: 'Mobil',
      tahunKendaraan: 2023,
      nopol: 'B 8989 SUN',
      pkbBerlakuSd: '2026-10-20',
      nominalPkbTerakhir: 1500000,
      nominalSwdkllj: 143000,
      wilayahSamsatAsal: 'Samsat Jakarta Timur',
      biayaJasa: 350000,
      pkb: 1500000,
      swdkllj: 143000,
      dendaSwdkllj: 0,
      totalEstimasi: 1993000,
      payment: {
        tipePembayaran: 'Bayar di Awal',
        statusPembayaran: 'Lunas',
        metodePembayaran: 'Transfer Bank',
        totalBiaya: 1993000,
        dibayar: 1993000,
        kurang: 0,
        overpayment: 0,
        nominalDibayarAwal: 1993000,
        nominalPembayaranAwalTerkonfirmasi: 1993000,
        isPaymentVerified: true,
      }
    })
  });
  const orderData = await orderRes.json();
  console.log("Order created:", orderData.data ? orderData.data.orderNo : orderData);

  // Navigate to /finance/profit-pending
  console.log("Navigating to /finance/profit-pending...");
  await page.goto('http://localhost:3000/finance/profit-pending', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2500);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_profit_pending_populated.png') });
  console.log("Captured: proof_finance_profit_pending_populated.png");

  // Click View button to capture Detail Anatomy View
  const viewBtn = await page.$('button[aria-label="Lihat detail transaksi"]');
  if (viewBtn) {
    console.log("Found view button, clicking...");
    await viewBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_detail_profit_pending.png') });
    console.log("Captured: proof_detail_profit_pending.png");
  } else {
    console.log("View button not found on Profit Terpending");
  }

  await browser.close();
  console.log("Finished browser profit flow verification!");
}

testBrowserProfitFlow().catch(err => {
  console.error(err);
  process.exit(1);
});
