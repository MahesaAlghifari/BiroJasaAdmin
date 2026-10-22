const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const artifactDir = path.resolve('C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169');

  console.log('1. Logging in via API to get auth token...');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' })
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data.token;
  const user = loginJson.data.user;

  // Navigate to root to set localStorage
  await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  }, { token, user });

  // 2. Navigate directly to Rekap Order
  console.log('2. Navigating to Rekap Order (/order/rekap)...');
  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'proof_rekap_order_page.png') });
  console.log('✓ Captured proof_rekap_order_page.png');

  // Check Clear Rekap Order button
  const clearBtn = page.locator('button:has-text("Clear Rekap Order")');
  if (await clearBtn.isVisible()) {
    console.log('Clear Rekap Order button is visible, enabled:', await clearBtn.isEnabled());
    if (await clearBtn.isEnabled()) {
      await clearBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactDir, 'proof_clear_rekap_dialog.png') });
      console.log('✓ Captured proof_clear_rekap_dialog.png');
      const cancelBtn = page.locator('button:has-text("Batal")');
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Navigate directly to Order Tracking
  console.log('3. Navigating to Order Tracking (/order/tracking)...');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'proof_order_tracking_page.png') });
  console.log('✓ Captured proof_order_tracking_page.png');

  // Click on the first order row or detail action
  const firstEyeOrRow = page.locator('table tbody tr').first();
  if (await firstEyeOrRow.isVisible()) {
    await firstEyeOrRow.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'proof_order_tracking_detail.png') });
    console.log('✓ Captured proof_order_tracking_detail.png');

    // Click "Upload Dokumen Baru" button
    const uploadBtn = page.locator('button:has-text("Upload Dokumen Baru")').first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(artifactDir, 'proof_upload_new_doc_modal.png') });
      console.log('✓ Captured proof_upload_new_doc_modal.png');
      const batalBtn = page.locator('button:has-text("Batal")').first();
      if (await batalBtn.isVisible()) await batalBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 4. Navigate directly to Messenger Tasks
  console.log('4. Navigating to Messenger Tasks (/messenger/tasks)...');
  await page.goto('http://localhost:3000/messenger/tasks', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_workspace_tasks.png') });
  console.log('✓ Captured proof_messenger_workspace_tasks.png');

  // Click Detail Tugas on any card
  const detailBtn = page.locator('button:has-text("Detail Tugas")').first();
  if (await detailBtn.isVisible()) {
    await detailBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_task_detail_checklist.png') });
    console.log('✓ Captured proof_messenger_task_detail_checklist.png');
  }

  await browser.close();
  console.log('All proofs captured successfully!');
}

run().catch(err => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
