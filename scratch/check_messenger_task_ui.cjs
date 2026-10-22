const { chromium } = require('playwright');

(async () => {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const data = await res.json();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token: data.data.token, user: data.data.user });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/messenger/tasks');
  await page.waitForTimeout(1500);
  const rows = await page.$$eval('table tbody tr', trs => trs.map(tr => tr.innerText.replace(/\n+/g, ' | ')));
  console.log('Messenger Task Rows count:', rows.length);
  rows.forEach((r, idx) => console.log(idx + 1, r));

  const cards = await page.$$eval('.grid .text-2xl', els => els.map(el => el.innerText));
  console.log('Summary counters:', cards);

  await browser.close();
})();
