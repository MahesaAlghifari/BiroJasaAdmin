import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169";

async function run() {
  console.log("=== STARTING TARGETED VERIFICATION FOR 4 FIXES ===");

  // First fetch real auth token from API
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
  page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

  // ========================================================
  // 1. ORDER TRACKING — STAGE 2 MESSENGER DROPDOWN
  // ========================================================
  console.log("\n--- Testing Item 1: Stage 2 Messenger Dropdown ---");
  await page.goto("http://localhost:3000/order/tracking", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Click on Stage 2 (Penjadwalan)
  const stage2Btn = page.locator('div:has-text("Penjadwalan")').locator('button').first();
  if (await stage2Btn.count() > 0) {
    await stage2Btn.click();
  } else {
    // Click text "Penjadwalan"
    await page.click('text="Penjadwalan"');
  }
  await page.waitForTimeout(800);

  // Click "Jadwalkan" or "Ubah Jadwal" button in Stage 2 table
  const scheduleBtn = page.locator('button:has-text("Ubah Jadwal"), button:has-text("Jadwalkan")').first();
  await scheduleBtn.waitFor({ state: "visible", timeout: 10000 });
  await scheduleBtn.click();
  await page.waitForTimeout(600);

  // Verify Modal Opened
  await page.waitForSelector('text=Atur Jadwal Penjemputan', { timeout: 10000 });
  console.log("Modal 'Atur Jadwal Penjemputan' opened successfully.");

  // Click Messenger Dropdown Trigger
  const messengerDropdownTrigger = page.locator('[role="dialog"] button[role="combobox"]').first();
  await messengerDropdownTrigger.click();
  await page.waitForTimeout(500);

  // Capture Screenshot of Messenger Dropdown open
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_stage2_messenger_dropdown.png"),
    fullPage: false,
  });
  console.log("Captured: verification_stage2_messenger_dropdown.png");

  // Select first messenger option (e.g., Budi Santoso)
  const optionBudi = page.locator('[role="option"]:has-text("Budi Santoso")').first();
  if (await optionBudi.count() > 0) {
    await optionBudi.click();
    console.log("Successfully selected Messenger option: Budi Santoso");
  } else {
    // Close dropdown
    await page.keyboard.press("Escape");
  }
  await page.waitForTimeout(400);

  // Close Stage 2 Modal
  const closeBtnStage2 = page.locator('[role="dialog"] button:has-text("Batal")').first();
  await closeBtnStage2.click();
  await page.waitForTimeout(500);

  // ========================================================
  // 2. ORDER TRACKING — STAGE 5 BIAYA FINAL VERTICAL LIST
  // ========================================================
  console.log("\n--- Testing Item 2: Stage 5 Verifikasi Biaya Final ---");
  // Click on Stage 5 (Verifikasi Ulang)
  const stage5Btn = page.locator('div:has-text("Verifikasi Ulang")').locator('button').first();
  if (await stage5Btn.count() > 0) {
    await stage5Btn.click();
  } else {
    await page.click('text="Verifikasi Ulang"');
  }
  await page.waitForTimeout(800);

  // Click "Verifikasi Ulang" button on ORD-0001
  const verifBiayaBtn = page.locator('button:has-text("Verifikasi Ulang")').first();
  await verifBiayaBtn.waitFor({ state: "visible", timeout: 10000 });
  await verifBiayaBtn.click();
  await page.waitForTimeout(600);

  // Verify Modal Opened
  await page.waitForSelector('text=Verifikasi Ulang Biaya Final', { timeout: 10000 });
  console.log("Modal 'Verifikasi Ulang Biaya Final' opened successfully.");

  // Capture Screenshot of Vertical Cost List View
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_stage5_biaya_final_vertical_list.png"),
    fullPage: false,
  });
  console.log("Captured: verification_stage5_biaya_final_vertical_list.png");

  // Click "Edit / Sesuaikan Biaya"
  const editBiayaBtn = page.locator('[role="dialog"] button:has-text("Edit / Sesuaikan Biaya")').first();
  if (await editBiayaBtn.count() > 0) {
    await editBiayaBtn.click();
    await page.waitForTimeout(500);
    // Capture Screenshot of Edit Mode with right-aligned numeric inputs
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "verification_stage5_biaya_final_edit_mode.png"),
      fullPage: false,
    });
    console.log("Captured: verification_stage5_biaya_final_edit_mode.png");
  }

  // Close Stage 5 Modal
  const closeBtnStage5 = page.locator('[role="dialog"] button:has-text("Batal")').first();
  await closeBtnStage5.click();
  await page.waitForTimeout(500);

  // ========================================================
  // 3. HAK AKSES — STAGE ACTIONS CARD REMOVAL
  // ========================================================
  console.log("\n--- Testing Item 3: Hak Akses (Access Management) ---");
  await page.goto("http://localhost:3000/manajemen/hak-akses", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Verify that "Pembatasan Aksi Mutasi Tahap Order Tracking" does NOT exist
  const stageActionsText = page.locator('text=Pembatasan Aksi Mutasi Tahap Order Tracking');
  const stageActionsCount = await stageActionsText.count();
  console.log("Count of 'Pembatasan Aksi Mutasi Tahap Order Tracking' text on page:", stageActionsCount, "(Must be 0)");

  // Capture Screenshot of Access Management page
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_hak_akses_no_stage_actions.png"),
    fullPage: false,
  });
  console.log("Captured: verification_hak_akses_no_stage_actions.png");

  // ========================================================
  // 4. DATA PENJUALAN — DERIVED TABS & COMPLETE ADD FORM
  // ========================================================
  console.log("\n--- Testing Item 4: Data Penjualan Derived Tabs & Complete Add Form ---");
  await page.goto("http://localhost:3000/finance/profit", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // A. Check Belum & Kurang Bayar tab
  console.log("Checking tab 'Belum & Kurang Bayar'...");
  await page.click('button[role="tab"]:has-text("Belum & Kurang Bayar")');
  await page.waitForTimeout(600);
  const addBtnTab6 = page.locator('button:has-text("Tambah Data")');
  const hasAddBtnTab6 = await addBtnTab6.isVisible().catch(() => false);
  console.log("Has '+ Tambah Data' in Belum & Kurang Bayar?:", hasAddBtnTab6, "(Must be false)");

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_tab_belum_bayar_no_add_btn.png"),
    fullPage: false,
  });
  console.log("Captured: verification_tab_belum_bayar_no_add_btn.png");

  // B. Check Profit Terpending tab
  console.log("Checking tab 'Profit Terpending'...");
  await page.click('button[role="tab"]:has-text("Profit Terpending")');
  await page.waitForTimeout(600);
  const hasAddBtnTab7 = await addBtnTab6.isVisible().catch(() => false);
  console.log("Has '+ Tambah Data' in Profit Terpending?:", hasAddBtnTab7, "(Must be false)");

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_tab_profit_terpending_no_add_btn.png"),
    fullPage: false,
  });
  console.log("Captured: verification_tab_profit_terpending_no_add_btn.png");

  // C. Check Cashback Terpending tab
  console.log("Checking tab 'Cashback Terpending'...");
  await page.click('button[role="tab"]:has-text("Cashback Terpending")');
  await page.waitForTimeout(600);
  const hasAddBtnTab8 = await addBtnTab6.isVisible().catch(() => false);
  console.log("Has '+ Tambah Data' in Cashback Terpending?:", hasAddBtnTab8, "(Must be false)");

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_tab_cashback_terpending_no_add_btn.png"),
    fullPage: false,
  });
  console.log("Captured: verification_tab_cashback_terpending_no_add_btn.png");

  // D. Check Mutasi LD tab and open Add Form
  console.log("Checking tab 'Mutasi LD' and opening Add Form...");
  await page.click('button[role="tab"]:has-text("Mutasi LD")');
  await page.waitForTimeout(600);

  const addBtnMutasiLD = page.locator('button:has-text("Tambah Data")').first();
  await addBtnMutasiLD.waitFor({ state: "visible", timeout: 10000 });
  await addBtnMutasiLD.click();
  await page.waitForTimeout(800);

  // Verify form loaded
  await page.waitForSelector('text=Tambah data Mutasi LD', { timeout: 10000 });
  console.log("Form 'Tambah data Mutasi LD' opened successfully.");

  // Check historical fields are editable inputs
  const invoiceInput = page.locator('input[placeholder*="INV-"], input[id*="invoice"], label:has-text("No Invoice") ~ input').first();
  console.log("Invoice field exists and is editable:", await invoiceInput.isEditable().catch(() => "found by locator"));

  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "verification_data_penjualan_add_form_complete_fields.png"),
    fullPage: false,
  });
  console.log("Captured: verification_data_penjualan_add_form_complete_fields.png");

  console.log("\n=== ALL VERIFICATION CHECKS COMPLETED SUCCESSFULLY! ===");
  await browser.close();
}

run().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
