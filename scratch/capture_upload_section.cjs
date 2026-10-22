const { chromium } = require('playwright');
const path = require('path');
const ARTIFACT_DIR = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

(async () => {
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' })
  });
  const { data } = await loginRes.json();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await context.addInitScript(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token: data.token, user: data.user });

  const page = await context.newPage();
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Switch to Stage 6
  await page.locator('p:has-text("Supervisi")').first().click();
  await page.waitForTimeout(1000);

  // Click Supervisi button
  const btn = page.locator('table tbody button:has-text("Supervisi")').first();
  await btn.click();
  await page.waitForTimeout(1000);

  // Scroll dialog to bottom (Upload section)
  await page.locator('text=Upload Dokumen Baru').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_5b_supervisi_upload_section.png') });
  console.log('Captured proof_5b_supervisi_upload_section.png');

  // Also open Stage 4 Detail modal for ORD-0013
  await page.locator('div[role="dialog"] button:has-text("Batal")').first().click();
  await page.waitForTimeout(500);

  await page.locator('p:has-text("Proses Samsat")').first().click();
  await page.waitForTimeout(1000);

  const btnDetail = page.locator('table tbody button:has-text("Detail")').first();
  if (await btnDetail.count() > 0) {
    await btnDetail.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_3_stage4_progress_dialog.png') });
    console.log('Captured proof_3_stage4_progress_dialog.png');
  }

  await browser.close();
  console.log('Done!');
})();
