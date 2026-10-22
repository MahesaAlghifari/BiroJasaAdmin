const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169';

async function run() {
  console.log('=== STARTING COMPLETE VERIFICATION WITH VALID JWT AUTH ===');

  // 1. Authenticate with backend API
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log("Authenticated as:", user?.nama, `(${user?.role})`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err.message));

  // 1. Check Messenger Workspace (ORD-0013 clean components)
  console.log('\n--- 1. Checking Messenger Workspace ---');
  await page.goto('http://localhost:3000/messenger/workspace', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_1_messenger_workspace_clean.png'), fullPage: false });
  console.log('Captured proof_1_messenger_workspace_clean.png');

  // 2. Check Order Tracking (/order/tracking)
  console.log('\n--- 2. Checking Order Tracking ---');
  await page.goto('http://localhost:3000/order/tracking', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Click Step 4 Stepper (Proses Samsat)
  console.log('Navigating to Stage 4 (Proses Samsat)...');
  await page.locator('p:has-text("Proses Samsat")').first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_2_stage4_table.png'), fullPage: false });
  console.log('Captured proof_2_stage4_table.png');

  // Click Detail Progres on ORD-0013
  const btnDetail = page.locator('button:has-text("Detail"), button:has-text("Detail Progres")').first();
  if (await btnDetail.count() > 0) {
    await btnDetail.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_3_stage4_progress_dialog.png'), fullPage: false });
    console.log('Captured proof_3_stage4_progress_dialog.png');
    // Close modal
    await page.locator('button:has-text("Tutup")').first().click();
    await page.waitForTimeout(500);
  }

  // Click Step 6 Stepper (Supervisi)
  console.log('Navigating to Stage 6 (Supervisi)...');
  await page.locator('p:has-text("Supervisi")').first().click();
  await page.waitForTimeout(1000);

  // Click Supervisi action button inside table row
  const btnSupervisi = page.locator('table tbody button:has-text("Supervisi")').first();
  if (await btnSupervisi.count() > 0) {
    await btnSupervisi.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_4_supervisi_modal_view.png'), fullPage: false });
    console.log('Captured proof_4_supervisi_modal_view.png');

    // Click "Edit / Sesuaikan Biaya"
    const btnEdit = page.locator('button:has-text("Edit / Sesuaikan Biaya")').first();
    if (await btnEdit.count() > 0) {
      await btnEdit.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_5_supervisi_modal_edit.png'), fullPage: false });
      console.log('Captured proof_5_supervisi_modal_edit.png');
    }

    // Close modal
    const closeBtn = page.locator('div[role="dialog"] button:has-text("Batal"), div[role="dialog"] button:has-text("Tutup")').first();
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  } else {
    console.log('No Supervisi action button found in Stage 6 table');
  }

  // 3. Check Rekap Order (/order/rekap)
  console.log('\n--- 3. Checking Rekap Order ---');
  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'proof_6_rekap_order_all_statuses.png'), fullPage: false });
  console.log('Captured proof_6_rekap_order_all_statuses.png');

  await browser.close();
  console.log('\n=== ALL PROOFS CAPTURED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Proof capture error:', err);
  process.exit(1);
});
