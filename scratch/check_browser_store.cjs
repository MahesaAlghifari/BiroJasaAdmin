const { chromium } = require('playwright');

async function checkBrowserStore() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('svp@birojasa.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));

  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const result = await page.evaluate(async () => {
    // Check localStorage
    const auth_token = localStorage.getItem('auth_token');
    const auth_user = localStorage.getItem('auth_user');

    // Fetch from backend directly from browser context
    const res = await fetch('/api/orders/archived', {
      headers: auth_token ? { Authorization: `Bearer ${auth_token}` } : {}
    });
    const data = await res.json();

    // Check table rows
    const rows = document.querySelectorAll('table tbody tr');

    return {
      auth_token: !!auth_token,
      auth_user: JSON.parse(auth_user || '{}'),
      backendArchivedCount: data.data?.length,
      tableRowCount: rows.length,
      tableText: document.querySelector('table')?.innerText?.substring(0, 300)
    };
  });

  console.log('Browser check result:', result);
  await browser.close();
}

checkBrowserStore();
