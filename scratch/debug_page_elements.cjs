const { chromium } = require('playwright');

(async () => {
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log("Logged in:", user?.nama, "Token exists:", !!token);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });

  await page.goto('http://localhost:3000/messenger/tasks', { waitUntil: 'networkidle' });
  
  // Wait for table rows to appear
  try {
    await page.waitForSelector('tbody tr', { timeout: 8000 });
  } catch (e) {
    console.log('Timeout waiting for tbody tr');
  }

  await page.waitForTimeout(1000);
  const rows = await page.$$eval('tbody tr', els => els.map(e => e.innerText.trim()).filter(Boolean));
  console.log('Table rows count:', rows.length);
  if (rows.length > 0) {
    console.log('First 2 rows:');
    rows.slice(0, 2).forEach((r, idx) => console.log(`[Row ${idx + 1}]:`, r.replace(/\n+/g, ' | ')));
  }

  const ambilAlihBtns = await page.$$eval('button', els => els.map(e => e.innerText.trim()).filter(t => t.includes('Ambil Alih')));
  console.log('Ambil Alih buttons found:', ambilAlihBtns.length);

  await browser.close();
})();
