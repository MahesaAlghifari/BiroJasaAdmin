const { chromium } = require('playwright');
const path = require('path');

async function captureAll() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const artifactDir = path.resolve('C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169');

  console.log('1. Logging in via login form...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('svp@birojasa.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('Logged in successfully!');

  // 2. Go to /order/rekap
  console.log('2. Navigating to /order/rekap...');
  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'proof_rekap_order_table.png') });
  console.log('✓ Captured proof_rekap_order_table.png');

  // Check Clear Rekap Order button
  const clearBtn = page.locator('button:has-text("Clear Rekap Order")');
  const isClearVisible = await clearBtn.isVisible();
  console.log('Clear Rekap Order button visible:', isClearVisible);
  if (isClearVisible) {
    const isClearEnabled = await clearBtn.isEnabled();
    console.log('Clear Rekap Order button enabled:', isClearEnabled);
    if (isClearEnabled) {
      await clearBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, 'proof_clear_rekap_dialog.png') });
      console.log('✓ Captured proof_clear_rekap_dialog.png');
      await page.locator('button:has-text("Batal")').click();
      await page.waitForTimeout(400);
    }
  }

  // 3. Go to /order/tracking
  console.log('3. Navigating to /order/tracking...');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Click on the first row
  const firstRow = page.locator('table tbody tr').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await page.waitForTimeout(800);

    // Look for "Upload Dokumen Baru" button in Stage 5 or document section
    const uploadBtn = page.locator('button:has-text("Upload Dokumen Baru")').first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, 'proof_upload_new_doc_modal.png') });
      console.log('✓ Captured proof_upload_new_doc_modal.png');
      await page.locator('button:has-text("Batal")').first().click();
      await page.waitForTimeout(400);
    }
  }

  // 4. Go to /messenger/workspace
  console.log('4. Navigating to /messenger/workspace...');
  await page.goto('http://localhost:3000/messenger/workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_workspace_active.png') });
  console.log('✓ Captured proof_messenger_workspace_active.png');

  // Check detail modal for Jemput Dokumen
  const detailBtn = page.locator('button:has-text("Detail Tugas")').first();
  if (await detailBtn.isVisible()) {
    await detailBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_detail_checklist.png') });
    console.log('✓ Captured proof_messenger_detail_checklist.png');
    // Close modal
    const closeBtn = page.locator('button[aria-label="Tutup"]').or(page.locator('button:has-text("Tutup")')).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // 5. Check Samsat view tab in Messenger Workspace
  const samsatTab = page.locator('[role="tab"]:has-text("Pengurusan Samsat"), button:has-text("Pengurusan Samsat")').first();
  if (await samsatTab.isVisible()) {
    await samsatTab.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_samsat_view.png') });
    console.log('✓ Captured proof_messenger_samsat_view.png');
  }

  await browser.close();
  console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
}

captureAll().catch(err => {
  console.error('Error during captureAll:', err);
  process.exit(1);
});
