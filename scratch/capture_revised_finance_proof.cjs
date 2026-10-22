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
  if (data.data) {
    return { token: data.data.token, user: data.data.user };
  }
  return { token: 'mock-token', user: { id: 'usr-001', role: 'administrator', name: 'Admin Super (SVP)' } };
}

async function captureProofs() {
  console.log("Starting targeted visual capture of revised Finance modules with Administrator session...");
  const session = await getAuthSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify({ ...user, role: 'administrator', jabatan: 'SVP' }));
      localStorage.setItem('user_role', 'administrator');
    },
    session
  );

  const page = await context.newPage();

  // 1. Tagihan View
  console.log("Navigating to /finance/tagihan...");
  await page.goto('http://localhost:3000/finance/tagihan', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_tagihan_revised.png') });
  console.log("Captured: proof_finance_tagihan_revised.png");

  // 2. Profit Terpending View
  console.log("Navigating to /finance/profit-pending...");
  await page.goto('http://localhost:3000/finance/profit-pending', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_profit_pending_revised.png') });
  console.log("Captured: proof_finance_profit_pending_revised.png");

  // 3. Cashback Terpending View
  console.log("Navigating to /finance/cashback-pending...");
  await page.goto('http://localhost:3000/finance/cashback-pending', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_cashback_pending_revised.png') });
  console.log("Captured: proof_finance_cashback_pending_revised.png");

  // 4. Belum & Kurang Bayar View
  console.log("Navigating to /finance/belum-bayar...");
  await page.goto('http://localhost:3000/finance/belum-bayar', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_belum_bayar_revised.png') });
  console.log("Captured: proof_finance_belum_bayar_revised.png");

  await browser.close();
  console.log("Completed all targeted visual proofs!");
}

captureProofs().catch(err => {
  console.error("Capture error:", err);
  process.exit(1);
});
