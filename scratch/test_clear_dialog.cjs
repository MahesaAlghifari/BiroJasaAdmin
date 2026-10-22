const { chromium } = require('playwright');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

async function testDialog() {
  const artifactDir = path.resolve('C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169');

  // Archive ORD-2026-0001 in DB
  const db = new DatabaseSync(path.join(__dirname, '../server/data/database.sqlite'));
  const row = db.prepare("SELECT * FROM orders WHERE order_no = 'ORD-2026-0001'").get();
  if (row) {
    const parsed = JSON.parse(row.data_json);
    parsed.isArchived = true;
    parsed.currentStep = 8;
    parsed.currentStageName = 'Selesai (Arsip)';
    db.prepare("UPDATE orders SET is_archived = 1, current_step = 8, current_stage_name = 'Selesai (Arsip)', data_json = ? WHERE order_no = 'ORD-2026-0001'").run(JSON.stringify(parsed));
    console.log('Archived ORD-2026-0001 in SQLite.');
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/login...');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Click demo credential card for Admin (SVP)
  const svpBtn = page.locator('[aria-label="Pilih akun demo Admin SVP"]');
  if (await svpBtn.isVisible()) {
    await svpBtn.click();
    console.log('Clicked Admin SVP demo card');
  } else {
    await page.fill('input[type="email"]', 'svp@birojasa.com');
    await page.fill('input[type="password"]', 'admin123');
  }

  // Click submit
  await page.click('button:has-text("Masuk ke Sistem")');
  console.log('Submitted login form');
  await page.waitForTimeout(1500);

  // Navigate to /order/rekap
  console.log('Navigating to Rekap Order (/order/rekap)...');
  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  const clearBtn = page.locator('button:has-text("Clear Rekap Order")');
  console.log('Clear button visible:', await clearBtn.isVisible(), 'enabled:', await clearBtn.isEnabled());

  if (await clearBtn.isVisible() && await clearBtn.isEnabled()) {
    await clearBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'proof_clear_rekap_dialog.png') });
    console.log('✓ Captured proof_clear_rekap_dialog.png successfully!');
  } else {
    await page.screenshot({ path: path.join(artifactDir, 'proof_rekap_state.png') });
    console.log('Captured proof_rekap_state.png');
  }

  await browser.close();
}

testDialog().catch(err => {
  console.error(err);
  process.exit(1);
});
