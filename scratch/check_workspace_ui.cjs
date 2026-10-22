const { chromium } = require('playwright');

(async () => {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'budi.messenger@birojasa.com', password: 'messenger123' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  const user = loginData.data.user;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify({
      ...user,
      employeeId: 'EMP-MSG-001'
    }));
  }, { token, user });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/messenger/workspace');
  await page.waitForTimeout(1500);

  const chips = await page.$$eval('.flex.items-center.gap-2.overflow-x-auto button', btns => btns.map(b => b.innerText.trim()));
  console.log('Filter chips:', chips);

  const cards = await page.$$eval('main .cursor-pointer', els => els.map(e => e.innerText.replace(/\n+/g, ' | ')));
  console.log('Task cards count:', cards.length);
  cards.forEach((c, idx) => console.log(idx + 1, c));

  const greeting = await page.$eval('main h2', el => el.innerText).catch(() => 'no h2');
  console.log('Greeting:', greeting);

  const greetingP = await page.$eval('main p', el => el.innerText).catch(() => 'no p');
  console.log('Greeting subtitle:', greetingP);

  await browser.close();
})();
