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

const targets = [
  { name: 'master_samsat', path: '/master-data/samsat' },
  { name: 'order_tracking', path: '/order/tracking' },
  { name: 'order_rekap', path: '/order/rekap' },
  { name: 'finance_profit', path: '/finance/profit' },
  { name: 'manajemen_hak_akses', path: '/manajemen/hak-akses' },
];

async function run() {
  const { token, user } = await getAuthSession();
  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1600x900', width: 1600, height: 900 },
    { name: 'mobile_375x667', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    console.log(`Processing VP: ${vp.name}`);
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
      await page.waitForFunction(
        () => !document.body.innerText.includes('Memuat halaman...'),
        { timeout: 10000 }
      ).catch(() => {});
      await page.waitForTimeout(600);

      const shotPath = path.join(ARTIFACT_DIR, `review_clean_${t.name}_${vp.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });
      console.log(`Captured: review_clean_${t.name}_${vp.name}.png`);
    }

    await context.close();
  }

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
