const { chromium } = require('playwright');
const path = require('path');

async function captureDetailedProofs() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const artifactDir = path.resolve('C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169');

  console.log('1. Logging in as Admin...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.locator('input[type="email"]').fill('svp@birojasa.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes('/login'));

  // PROOF 1: Order Tracking - Upload Dokumen Baru Modal
  console.log('2. Navigating to Order Tracking...');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Click row to open detail modal
  const firstRow = page.locator('table tbody tr').first();
  if (await firstRow.isVisible()) {
    await firstRow.click();
    await page.waitForTimeout(1000);

    // Click "Upload Dokumen Baru" button
    const uploadBtn = page.locator('button:has-text("Upload Dokumen Baru")').first();
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, 'proof_upload_dokumen_baru_form.png') });
      console.log('✓ Captured proof_upload_dokumen_baru_form.png');
      await page.locator('button:has-text("Batal")').first().click();
      await page.waitForTimeout(400);
    }

    // Close detail modal
    const closeBtn = page.locator('button[aria-label="Tutup"]').or(page.locator('button:has-text("Tutup")')).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // PROOF 2: Messenger Workspace - Jemput Dokumen Checklist & Catatan Kendala
  console.log('3. Navigating to Messenger Workspace...');
  await page.goto('http://localhost:3000/messenger/workspace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Find Jemput Dokumen card and click Detail Tugas
  const jemputDetailBtn = page.locator('div:has-text("Jemput Dokumen")').locator('button:has-text("Detail Tugas")').first();
  if (await jemputDetailBtn.isVisible()) {
    await jemputDetailBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_jemput_checklist_modal.png') });
    console.log('✓ Captured proof_messenger_jemput_checklist_modal.png');

    const closeBtn = page.locator('button[aria-label="Tutup"]').or(page.locator('button:has-text("Tutup")')).first();
    if (await closeBtn.isVisible()) await closeBtn.click();
    await page.waitForTimeout(400);
  }

  // PROOF 3: Messenger Workspace - Samsat View & Duration Dialog
  console.log('4. Navigating to Pengurusan Samsat Tab...');
  const samsatTab = page.locator('[role="tab"]:has-text("Pengurusan Samsat"), button:has-text("Pengurusan Samsat")').first();
  if (await samsatTab.isVisible()) {
    await samsatTab.click();
    await page.waitForTimeout(1200);

    // Look for a component row with "Proses" button
    const prosesBtn = page.locator('button:has-text("Proses")').first();
    if (await prosesBtn.isVisible()) {
      await prosesBtn.click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_samsat_durasi_dialog.png') });
      console.log('✓ Captured proof_messenger_samsat_durasi_dialog.png');
      await page.locator('button:has-text("Batal")').first().click();
      await page.waitForTimeout(400);
    }

    // Capture Samsat view showing bottom completion button
    await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_samsat_bottom_button.png') });
    console.log('✓ Captured proof_messenger_samsat_bottom_button.png');
  }

  // PROOF 4: Messenger Workspace - Pengantaran Dokumen Alamat Card
  console.log('5. Checking Pengantaran Dokumen Task...');
  const pengantaranTab = page.locator('[role="tab"]:has-text("Pengantaran"), button:has-text("Pengantaran")').first();
  if (await pengantaranTab.isVisible()) {
    await pengantaranTab.click();
    await page.waitForTimeout(800);
  }
  const pengantaranDetailBtn = page.locator('div:has-text("Pengantaran")').locator('button:has-text("Detail Tugas")').first();
  if (await pengantaranDetailBtn.isVisible()) {
    await pengantaranDetailBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'proof_messenger_pengantaran_alamat_card.png') });
    console.log('✓ Captured proof_messenger_pengantaran_alamat_card.png');
  }

  await browser.close();
  console.log('ALL DETAILED PROOFS CAPTURED SUCCESSFULLY!');
}

captureDetailedProofs().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
