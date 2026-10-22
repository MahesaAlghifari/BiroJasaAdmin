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

async function run() {
  console.log('Authenticating with backend...');
  const { token, user } = await getAuthSession();
  console.log('Authenticated successfully as:', user.nama, 'Role:', user.role);

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'desktop_1280x800', width: 1280, height: 800 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_375x667', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      },
      { token, user }
    );

    const page = await context.newPage();

    // 1. Test Popover open on dashboard
    console.log('1. Testing Notification Popover on Dashboard...');
    await page.goto('http://localhost:3000/dashboard', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('header', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Locate bell button in header
    const bellBtn = page.locator('header button[aria-label*="Notifikasi"]').first();
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      await page.waitForTimeout(400);

      // Verify Popover content is visible
      const popoverContent = page.locator('[data-slot="popover-content"]');
      await popoverContent.waitFor({ state: 'visible', timeout: 5000 });

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `tahap6_popover_open_${vp.name}.png`),
        fullPage: false,
      });
      console.log(`Saved: tahap6_popover_open_${vp.name}.png`);

      // Test click outside or escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }

    // 2. Test /notifikasi page - Tab 1 (Notifikasi Operasional)
    console.log('2. Testing /notifikasi page (Tab In-App)...');
    await page.goto('http://localhost:3000/notifikasi', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap6_halaman_notifikasi_inapp_${vp.name}.png`),
      fullPage: false,
    });
    console.log(`Saved: tahap6_halaman_notifikasi_inapp_${vp.name}.png`);

    // Test Search & Reset in /notifikasi (only for desktop 1440x900 to avoid duplicate screenshots)
    if (vp.name === 'desktop_1440x900') {
      const searchInput = page.locator('input[placeholder*="Cari notifikasi"]').first();
      if (await searchInput.isVisible()) {
        await searchInput.fill('Budi');
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(ARTIFACT_DIR, `tahap6_halaman_notifikasi_search_active_${vp.name}.png`),
          fullPage: false,
        });
        const resetBtn = page.locator('button:has-text("Reset")').first();
        if (await resetBtn.isVisible()) {
          await resetBtn.click();
          await page.waitForTimeout(300);
        }
      }
    }

    // 3. Test /notifikasi page - Tab 2 (Riwayat Pengiriman Email SMTP)
    console.log('3. Testing /notifikasi page (Tab Email SMTP)...');
    const emailTab = page.locator('button[role="tab"]:has-text("Riwayat Pengiriman Email")').first();
    if (await emailTab.isVisible()) {
      await emailTab.click();
      await page.waitForTimeout(400);

      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `tahap6_halaman_notifikasi_email_${vp.name}.png`),
        fullPage: false,
      });
      console.log(`Saved: tahap6_halaman_notifikasi_email_${vp.name}.png`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nAll Tahap 6 visual inspections completed successfully!');
}

run().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
