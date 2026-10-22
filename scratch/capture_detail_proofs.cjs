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

async function captureDetailProofs() {
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

  // 1. Detail Page from Cashback Terpending
  console.log("Navigating to /finance/cashback-pending...");
  await page.goto('http://localhost:3000/finance/cashback-pending', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);

  const viewBtn = await page.$('button[aria-label="Lihat detail transaksi"]');
  if (viewBtn) {
    console.log("Found view button, clicking...");
    await viewBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_detail_cashback_pending.png') });
    console.log("Captured: proof_detail_cashback_pending.png");
  } else {
    console.log("View button not found on cashback pending!");
  }

  // 2. Detail Page from Belum & Kurang Bayar
  console.log("Navigating to /finance/belum-bayar...");
  await page.goto('http://localhost:3000/finance/belum-bayar', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);

  const viewBtn2 = await page.$('button[aria-label="Lihat detail transaksi"]');
  if (viewBtn2) {
    console.log("Found view button on belum bayar, clicking...");
    await viewBtn2.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_detail_belum_bayar.png') });
    console.log("Captured: proof_detail_belum_bayar.png");
  } else {
    console.log("View button not found on belum bayar!");
  }

  await browser.close();
  console.log("Finished detail page proofs!");
}

captureDetailProofs().catch(err => {
  console.error(err);
  process.exit(1);
});
