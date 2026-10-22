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
  if (!data.success) {
    throw new Error('Failed to login: ' + JSON.stringify(data));
  }
  return {
    token: data.data.token,
    user: data.data.user,
  };
}

const targets = [
  { name: 'order_buat', path: '/order/buat', selector: '#input-customer' },
  { name: 'settings', path: '/settings', selector: '#input-new-recipient' },
  { name: 'profile', path: '/profile', selector: '#profile-name, h3' },
  { name: 'master_samsat', path: '/master/samsat', selector: 'table' },
  { name: 'manajemen_hak_akses', path: '/manajemen-hak-akses', selector: 'table' },
  { name: 'dashboard', path: '/', selector: 'h1, h2' },
  { name: 'finance_profit', path: '/finance/profit', selector: 'table, h1' },
  { name: 'order_tracking', path: '/order/tracking', selector: 'table' },
  { name: 'order_rekap', path: '/order/rekap', selector: 'table' },
];

async function run() {
  console.log('Authenticating...');
  const { token, user } = await getAuthSession();

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1600x900', width: 1600, height: 900 },
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'mobile_375x667', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    console.log(`\nTesting VP: ${vp.name}`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      },
      { token, user }
    );

    const page = await context.newPage();

    for (const t of targets) {
      await page.goto(`http://localhost:3000${t.path}`, { waitUntil: 'load', timeout: 20000 });
      await page.waitForTimeout(600);

      const shotPath = path.join(ARTIFACT_DIR, `review_${t.name}_${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Captured: review_${t.name}_${vp.name}.png`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDone capturing review screenshots!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
