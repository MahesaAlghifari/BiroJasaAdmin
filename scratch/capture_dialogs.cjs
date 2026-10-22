const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function getAuthSession() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' })
  });
  const data = await res.json();
  return {
    token: data.data.token,
    user: data.data.user
  };
}

async function run() {
  const { token, user } = await getAuthSession();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();

  // 1. Dialog Add Samsat
  console.log('Navigating to /master-data/samsat...');
  await page.goto('http://localhost:3000/master-data/samsat', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(500);

  const addSamsatBtn = page.locator('button:has-text("Tambah")').first();
  if (await addSamsatBtn.isVisible()) {
    await addSamsatBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'tahap5_dialog_add_samsat.png'),
      fullPage: false,
    });
    console.log('Captured tahap5_dialog_add_samsat.png');
    const cancelBtn = page.locator('[role="dialog"] button:has-text("Batal")').first();
    if (await cancelBtn.isVisible()) await cancelBtn.click();
    await page.waitForTimeout(400);
  }

  // 2. Dialog Add Karyawan
  console.log('Navigating to /manajemen/karyawan...');
  await page.goto('http://localhost:3000/manajemen/karyawan', { waitUntil: 'load', timeout: 30000 });
  await page.waitForSelector('table', { timeout: 15000 });
  await page.waitForTimeout(500);

  const addKaryawanBtn = page.locator('button:has-text("Tambah")').first();
  if (await addKaryawanBtn.isVisible()) {
    await addKaryawanBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'tahap5_dialog_add_karyawan.png'),
      fullPage: false,
    });
    console.log('Captured tahap5_dialog_add_karyawan.png');
  }

  await context.close();
  await browser.close();
  console.log('Dialog capture complete!');
}

run().catch(console.error);
