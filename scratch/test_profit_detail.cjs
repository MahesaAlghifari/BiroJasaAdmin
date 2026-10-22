const { chromium } = require('playwright');
const path = require('path');
const outDir = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const { data } = await loginRes.json();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token: data.token, user: data.user });

  const page = await context.newPage();
  
  console.log('Navigating to http://localhost:3000/finance/profit...');
  await page.goto('http://localhost:3000/finance/profit', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  const rows = await page.locator('tbody tr').count();
  console.log('Profit rows:', rows);
  
  const viewBtn = page.locator('button[aria-label="Lihat detail transaksi"]').first();
  if (await viewBtn.count() > 0) {
    console.log('Clicking view button on Profit row...');
    await viewBtn.click();
    await page.waitForTimeout(1500);

    // Scroll to Dokumen Masuk (BEFORE)
    await page.evaluate(() => {
      const header = Array.from(document.querySelectorAll('h3, h4, span, div')).find(el => el.textContent.includes('Dokumen Masuk (BEFORE)'));
      if (header) {
        header.scrollIntoView({ behavior: 'instant', block: 'center' });
      } else {
        window.scrollBy(0, 500);
      }
    });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'proof_finance_data_penjualan_before_after_docs.png'), fullPage: false });
    console.log('Saved proof_finance_data_penjualan_before_after_docs.png');
  } else {
    console.log('No view button found in profit');
  }

  await browser.close();
})();
