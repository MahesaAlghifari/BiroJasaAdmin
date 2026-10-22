const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

const viewports = [
  { name: 'desktop_1440x900', width: 1440, height: 900 },
  { name: 'desktop_1280x800', width: 1280, height: 800 },
  { name: 'tablet_768x1024', width: 768, height: 1024 },
  { name: 'mobile_375x667', width: 375, height: 667 },
];

async function getAuthSession() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' })
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error('Failed to login: ' + JSON.stringify(data));
  }
  return {
    token: data.data.token,
    user: data.data.user
  };
}

async function run() {
  console.log('Authenticating with backend...');
  const { token, user } = await getAuthSession();
  console.log('Authenticated successfully as:', user.nama, 'Role:', user.role);

  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

    await context.addInitScript(({ token, user }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }, { token, user });

    const page = await context.newPage();

    // 1. Order Tracking - Stage 4 (Proses Samsat)
    console.log('1. Capturing Order Tracking...');
    await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Switch to Stage 4 (Proses Samsat)
    if (vp.width >= 1280) {
      const stage4Tab = page.locator('button:has-text("4"), p:has-text("Proses Samsat")').first();
      if (await stage4Tab.isVisible()) {
        await stage4Tab.click();
        await page.waitForTimeout(400);
      }
    } else {
      const selectTrigger = page.locator('[role="combobox"]').first();
      if (await selectTrigger.isVisible()) {
        await selectTrigger.click();
        await page.waitForTimeout(300);
        const stage4Item = page.locator('[role="option"]:has-text("Proses Samsat")').first();
        if (await stage4Item.isVisible()) {
          await stage4Item.click();
          await page.waitForTimeout(400);
        }
      }
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_order_tracking_stage4_${vp.name}.png`),
      fullPage: false,
    });

    // Test Search & Reset in Stage 4
    const searchInput = page.locator('input[placeholder*="Cari order"]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('B 1234');
      await page.waitForTimeout(300);
      await page.screenshot({
        path: path.join(ARTIFACT_DIR, `tahap5_order_tracking_search_active_${vp.name}.png`),
        fullPage: false,
      });
      const resetBtn = page.locator('button:has-text("Reset")').first();
      if (await resetBtn.isVisible()) {
        await resetBtn.click();
        await page.waitForTimeout(300);
      }
    }

    // 2. Rekap Order (Order History)
    console.log('2. Capturing Rekap Order...');
    await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_rekap_order_${vp.name}.png`),
      fullPage: false,
    });

    // 3. Master Data Samsat
    console.log('3. Capturing Master Data Samsat...');
    await page.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_master_samsat_${vp.name}.png`),
      fullPage: false,
    });

    // 4. Finance Kas Kantor
    console.log('4. Capturing Finance Kas Kantor...');
    await page.goto('http://localhost:3000/finance/kas-kantor', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_finance_kas_${vp.name}.png`),
      fullPage: false,
    });

    // 5. Manajemen Pengguna
    console.log('5. Capturing Manajemen Pengguna...');
    await page.goto('http://localhost:3000/manajemen/pengguna', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_manajemen_pengguna_${vp.name}.png`),
      fullPage: false,
    });

    // 6. Messenger Tasks
    console.log('6. Capturing Messenger Tasks...');
    await page.goto('http://localhost:3000/messenger/tasks', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_messenger_task_${vp.name}.png`),
      fullPage: false,
    });

    // 7. Riwayat Aktivitas (Audit Log)
    console.log('7. Capturing Audit Log...');
    await page.goto('http://localhost:3000/manajemen/riwayat-aktivitas', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('table', { timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, `tahap5_audit_log_${vp.name}.png`),
      fullPage: false,
    });

    await context.close();
  }

  // Capturing dialog modals on desktop 1280x800
  console.log('\n=== Capturing Dialog Modals on Desktop 1280x800 ===');
  const modalContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await modalContext.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  const modalPage = await modalContext.newPage();

  // Dialog Add Samsat
  console.log('Opening Add Samsat Dialog...');
  await modalPage.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'load', timeout: 30000 });
  await modalPage.waitForSelector('table', { timeout: 15000 });
  await modalPage.waitForTimeout(500);
  const addSamsatBtn = modalPage.locator('button:has-text("Tambah Samsat"), button:has-text("Tambah Data")').first();
  if (await addSamsatBtn.isVisible()) {
    await addSamsatBtn.click();
    await modalPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await modalPage.waitForTimeout(400);
    await modalPage.screenshot({
      path: path.join(ARTIFACT_DIR, 'tahap5_dialog_add_samsat.png'),
      fullPage: false,
    });
    // close dialog
    const cancelBtn = modalPage.locator('[role="dialog"] button:has-text("Batal")').first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
  }

  // Dialog Add Karyawan
  console.log('Opening Add Karyawan Dialog...');
  await modalPage.goto('http://localhost:3000/manajemen/karyawan', { waitUntil: 'load', timeout: 30000 });
  await modalPage.waitForSelector('table', { timeout: 15000 });
  await modalPage.waitForTimeout(500);
  const addKaryawanBtn = modalPage.locator('button:has-text("Tambah Karyawan"), button:has-text("Tambah Data")').first();
  if (await addKaryawanBtn.isVisible()) {
    await addKaryawanBtn.click();
    await modalPage.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await modalPage.waitForTimeout(400);
    await modalPage.screenshot({
      path: path.join(ARTIFACT_DIR, 'tahap5_dialog_add_karyawan.png'),
      fullPage: false,
    });
  }

  await modalContext.close();
  await browser.close();
  console.log('\nAll Tahap 5 visual inspections completed successfully!');
}

run().catch((err) => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
