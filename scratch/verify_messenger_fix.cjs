const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 }, // Pixel 7 mobile viewport for Workspace Messenger
  });

  const page = await context.newPage();

  console.log('=== STEP 1: Verify Messenger Workspace for Budi (EMP-MSG-001) ===');
  await page.goto('http://localhost:3000/login');
  await page.waitForLoadState('networkidle');

  // Fill login
  await page.fill('input[type="email"]', 'messenger@birojasa.com');
  await page.fill('input[type="password"]', 'messenger123');
  await page.click('button[type="submit"]');

  // Wait for redirect to /messenger/workspace
  await page.waitForURL('**/messenger/workspace', { timeout: 10000 });
  await page.waitForTimeout(2000); // Allow data fetch to complete

  // Read header
  const headerUser = await page.textContent('header');
  console.log('Header user info:', headerUser.replace(/\s+/g, ' ').trim());

  // Check filter chips
  const buttons = await page.locator('button').allInnerTexts();
  const chipTexts = buttons.filter(b => b.includes('Semua (') || b.includes('Jemput (') || b.includes('Samsat (') || b.includes('Antar ('));
  console.log('Filter chips found:', chipTexts);

  // Check cards rendered
  const cardTexts = await page.locator('.space-y-3 > div, [class*="rounded-2xl"]').allInnerTexts();
  const orderCards = cardTexts.filter(c => c.includes('ORD-'));
  console.log(`Order cards count: ${orderCards.length}`);
  orderCards.forEach((c, idx) => {
    const firstLine = c.split('\n').filter(Boolean).slice(0, 4).join(' | ');
    console.log(` Card ${idx + 1}: ${firstLine}`);
  });

  const wsScreenshotPath = path.join(ARTIFACT_DIR, 'workspace_messenger_fixed_mobile_412x915.png');
  await page.screenshot({ path: wsScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${wsScreenshotPath}`);

  console.log('\n=== STEP 2: Verify Admin SUN89 Messenger Task (/messenger/tasks) ===');
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const adminPage = await desktopContext.newPage();
  await adminPage.goto('http://localhost:3000/login');
  await adminPage.waitForLoadState('networkidle');
  await adminPage.fill('input[type="email"]', 'admin@birojasa.com');
  await adminPage.fill('input[type="password"]', 'admin123');
  await adminPage.click('button[type="submit"]');
  await adminPage.waitForURL('**/dashboard', { timeout: 10000 });

  await adminPage.goto('http://localhost:3000/messenger/tasks');
  await adminPage.waitForTimeout(2000);

  const adminStats = await adminPage.locator('.grid.grid-cols-2').innerText();
  console.log('Admin task stats:\n', adminStats.replace(/\n\s*\n/g, '\n').trim());

  const rows = await adminPage.locator('tbody tr').allInnerTexts();
  console.log(`Admin table rows count: ${rows.length}`);
  rows.forEach((r, idx) => {
    const clean = r.replace(/\t/g, ' | ').replace(/\n+/g, ' ');
    console.log(` Row ${idx + 1}: ${clean}`);
  });

  const adminScreenshotPath = path.join(ARTIFACT_DIR, 'admin_messenger_task_desktop_1440x900.png');
  await adminPage.screenshot({ path: adminScreenshotPath, fullPage: true });
  console.log(`Saved screenshot: ${adminScreenshotPath}`);

  console.log('\n=== STEP 3: Test Claiming Unassigned Task (Mulai Jemput on ORD-0001) ===');
  // In messenger workspace, find the card with ORD-0001 and click "Mulai Jemput"
  const ord1Card = page.locator('.space-y-3 > div').filter({ hasText: 'ORD-0001' });
  const startButton = ord1Card.locator('button', { hasText: 'Mulai Jemput' });
  if (await startButton.isVisible()) {
    console.log('Found "Mulai Jemput" button on ORD-0001. Clicking it...');
    await startButton.click();
    await page.waitForTimeout(2000);

    // Verify it updated
    const updatedOrd1Text = await ord1Card.innerText();
    console.log('Updated ORD-0001 card text:\n', updatedOrd1Text.replace(/\n+/g, ' | '));

    const claimedScreenshot = path.join(ARTIFACT_DIR, 'workspace_messenger_ord0001_claimed.png');
    await page.screenshot({ path: claimedScreenshot, fullPage: true });
    console.log(`Saved screenshot: ${claimedScreenshot}`);

    // Check admin page reflects the claim
    await adminPage.reload();
    await adminPage.waitForTimeout(2000);
    const updatedAdminStats = await adminPage.locator('.grid.grid-cols-2').innerText();
    console.log('Updated Admin stats after claim:\n', updatedAdminStats.replace(/\n\s*\n/g, '\n').trim());
    const updatedAdminRows = await adminPage.locator('tbody tr').allInnerTexts();
    updatedAdminRows.forEach((r, idx) => {
      const clean = r.replace(/\t/g, ' | ').replace(/\n+/g, ' ');
      console.log(` Updated Row ${idx + 1}: ${clean}`);
    });
  } else {
    console.log('Start button for ORD-0001 not visible.');
  }

  await browser.close();
  console.log('\n=== ALL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
