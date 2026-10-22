const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function run() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const data = await res.json();
  const token = data.data.token;
  const user = data.data.user;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    },
    { token, user }
  );

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log('Navigating to http://localhost:3000/notifikasi...');
  await page.goto('http://localhost:3000/notifikasi', { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(3000);

  const bodyText = await page.locator('body').innerText();
  console.log('Body Text Snippet:\n', bodyText.slice(0, 400).replace(/\n+/g, ' '));

  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'debug_notifikasi.png') });
  console.log('Saved debug_notifikasi.png');

  await browser.close();
}

run().catch(console.error);
