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

const routesToTest = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'finance_profit', path: '/finance/profit' },
  { name: 'finance_tagihan', path: '/finance/tagihan' },
  { name: 'master_samsat', path: '/master-data/samsat' },
  { name: 'master_biaya_layanan', path: '/master-data/biaya-layanan' },
  { name: 'master_harga_dasar', path: '/master-data/harga-dasar' },
  { name: 'manajemen_karyawan', path: '/manajemen/karyawan' },
  { name: 'manajemen_pengguna', path: '/manajemen/pengguna' },
  { name: 'manajemen_hak_akses', path: '/manajemen/hak-akses' },
  { name: 'audit_log', path: '/manajemen/riwayat-aktivitas' },
  { name: 'order_buat', path: '/order/buat' },
  { name: 'order_tracking', path: '/order/tracking' },
  { name: 'order_rekap', path: '/order/rekap' },
  { name: 'settings', path: '/settings' },
  { name: 'notifikasi', path: '/notifikasi' },
  { name: 'profile', path: '/profile' },
];

async function run() {
  console.log('Authenticating with backend...');
  const { token, user } = await getAuthSession();
  console.log('Authenticated as:', user.nama, 'Role:', user.role);

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1600x900', width: 1600, height: 900 },
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'desktop_1280x800', width: 1280, height: 800 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_375x667', width: 375, height: 667 },
  ];

  const results = [];

  for (const vp of viewports) {
    console.log(`\n======================================================`);
    console.log(`=== Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    console.log(`======================================================`);

    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      },
      { token, user }
    );

    const page = await context.newPage();

    for (const r of routesToTest) {
      const url = `http://localhost:3000${r.path}`;
      try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page.waitForTimeout(400);

        const check = await page.evaluate(() => {
          const main = document.querySelector('main');
          const pageShell = document.querySelector('.page-shell');
          const rootContent = pageShell ? pageShell.firstElementChild : null;
          const bodyOverflow = document.documentElement.scrollWidth > window.innerWidth;

          const pageShellRect = pageShell ? pageShell.getBoundingClientRect() : null;
          const rootRect = rootContent ? rootContent.getBoundingClientRect() : null;

          return {
            windowWidth: window.innerWidth,
            pageShellWidth: pageShellRect ? Math.round(pageShellRect.width) : null,
            rootContentWidth: rootRect ? Math.round(rootRect.width) : null,
            rootContentClasses: rootContent ? rootContent.className : '',
            hasHorizontalOverflow: bodyOverflow,
            scrollWidth: document.documentElement.scrollWidth,
          };
        });

        const status = !check.hasHorizontalOverflow ? 'PASS' : 'FAIL';
        console.log(`[${status}] ${r.name.padEnd(22)} | vp: ${check.windowWidth} | shell: ${check.pageShellWidth} | root: ${check.rootContentWidth} | overflow: ${check.hasHorizontalOverflow}`);

        results.push({
          viewport: vp.name,
          route: r.name,
          path: r.path,
          ...check,
          passed: !check.hasHorizontalOverflow,
        });

        // Capture key representative screenshots on 1600, 1440, 768, 375
        const shouldScreenshot = 
          (vp.name === 'desktop_1600x900' && ['dashboard', 'order_buat', 'settings', 'master_samsat', 'manajemen_hak_akses'].includes(r.name)) ||
          (vp.name === 'desktop_1440x900' && ['dashboard', 'finance_profit', 'master_samsat', 'manajemen_hak_akses', 'settings', 'profile'].includes(r.name)) ||
          (vp.name === 'tablet_768x1024' && ['master_samsat', 'settings', 'profile'].includes(r.name)) ||
          (vp.name === 'mobile_375x667' && ['master_samsat', 'settings', 'profile'].includes(r.name));

        if (shouldScreenshot) {
          const shotName = `global_fc_${r.name}_${vp.name}.png`;
          const shotPath = path.join(ARTIFACT_DIR, shotName);
          await page.screenshot({ path: shotPath, fullPage: false });
          console.log(`   -> Screenshot: ${shotName}`);
        }
      } catch (err) {
        console.error(`Error checking ${r.name}:`, err.message);
      }
    }

    await context.close();
  }

  await browser.close();

  console.log('\n======================================================');
  console.log('=== SUMMARY OF FULL-CONTAINER AUDIT & VERIFICATION ===');
  console.log('======================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`Total tests: ${total} | Passed: ${passed} | Failed: ${failed}`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
