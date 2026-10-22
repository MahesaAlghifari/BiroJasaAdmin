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

async function captureProfitDetail() {
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

  // Create an invoice with full payment in finance store
  await page.goto('http://localhost:3000/finance/tagihan', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1500);

  // Click "Lunas" on first unpaid item to turn it Lunas
  const lunasBtn = await page.$('button[title*="Lunaskan tagihan"]');
  if (lunasBtn) {
    console.log("Clicking Lunas on tagihan...");
    await lunasBtn.click();
    await page.waitForTimeout(1000);
    // Confirm dialog
    const confirmBtn = await page.$('button:has-text("Ya, Tandai Lunas")');
    if (confirmBtn) {
      await confirmBtn.click();
      console.log("Confirmed Lunas!");
      await page.waitForTimeout(2000);
    }
  }

  // Now navigate to /finance/profit-pending
  console.log("Navigating to /finance/profit-pending...");
  await page.goto('http://localhost:3000/finance/profit-pending', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_profit_pending_populated.png') });
  console.log("Captured: proof_finance_profit_pending_populated.png");

  // Click view button
  const viewBtn = await page.$('button[aria-label="Lihat detail transaksi"]');
  if (viewBtn) {
    console.log("Found view button, clicking...");
    await viewBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_detail_profit_pending.png') });
    console.log("Captured: proof_detail_profit_pending.png");
  }

  await browser.close();
}

captureProfitDetail().catch(err => {
  console.error(err);
  process.exit(1);
});
