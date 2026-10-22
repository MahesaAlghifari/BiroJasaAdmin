const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const data = await loginRes.json();
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify({ ...user, role: 'administrator', jabatan: 'SVP' }));
    localStorage.setItem('user_role', 'administrator');
  }, { token: data.data.token, user: data.data.user });
  
  await page.goto('http://localhost:3000/finance/profit-pending', { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Memuat halaman...', { state: 'detached', timeout: 10000 });
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_finance_profit_pending_revised.png') });
  console.log('Captured proof_finance_profit_pending_revised.png');
  
  const viewBtn = await page.$('button[aria-label="Lihat detail transaksi"]');
  if (viewBtn) {
    console.log('Found view button, clicking...');
    await viewBtn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_detail_profit_pending.png') });
    console.log('Captured proof_detail_profit_pending.png');
  } else {
    console.log('No view button found!');
  }
  await browser.close();
}

main().catch(console.error);
