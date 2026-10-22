import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ARTIFACT_DIR = "C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169";

// Create a small dummy image for testing upload
const sampleImagePath = path.join("d:/Admin/adminsunbirojasa/scratch", "sample_proof.png");
if (!fs.existsSync(sampleImagePath)) {
  // 1x1 transparent png
  const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(sampleImagePath, dummyPng);
}

async function run() {
  console.log("=== VERIFYING TRANSACTION RESET & PAYMENT PROOF STANDARD ===");

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
  page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

  // STEP 1: Verify Empty State on Data Penjualan
  console.log("\n--- 1. Checking Data Penjualan Empty State ---");
  await page.goto("http://localhost:3000/data-penjualan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_reset_data_penjualan_empty.png"), fullPage: false });
  console.log("Screenshot taken: proof_reset_data_penjualan_empty.png");

  // STEP 2: Verify Empty State on Finance Kas & Invoices
  console.log("\n--- 2. Checking Finance Kas Kantor Empty State ---");
  await page.goto("http://localhost:3000/finance/kas-kantor", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_reset_kas_kantor_empty.png"), fullPage: false });

  console.log("\n--- 2b. Checking Finance Belum Bayar Empty State ---");
  await page.goto("http://localhost:3000/finance/belum-bayar", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_reset_belum_bayar_empty.png"), fullPage: false });

  // STEP 3: Buat Order - Bukti Pembayaran Tidak Wajib
  console.log("\n--- 3. Testing Buat Order without Proof ---");
  await page.goto("http://localhost:3000/order/buat-order", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Fill Step 1
  const customerInput = page.locator('input[placeholder*="Nama Pelanggan"], input[placeholder*="nama"]').first();
  if (await customerInput.isVisible()) {
    await customerInput.fill("Budi Hartono");
  }

  const phoneInput = page.locator('input[placeholder*="08"], input[type="tel"]').first();
  if (await phoneInput.isVisible()) {
    await phoneInput.fill("081234567890");
  }

  const nopolInput = page.locator('input[placeholder*="B 1234"], input[placeholder*="Plat"]').first();
  if (await nopolInput.isVisible()) {
    await nopolInput.fill("B 8888 SUN");
  }

  // Next Step 1 -> 2
  const nextBtn1 = page.locator('button:has-text("Lanjut ke Dokumen & Biaya"), button:has-text("Lanjut")').first();
  if (await nextBtn1.isVisible()) {
    await nextBtn1.click();
    await page.waitForTimeout(800);
  }

  // Step 2: Payment section
  // Choose "Bayar di Awal"
  const bayarAwalRadio = page.locator('label:has-text("Bayar di Awal"), button:has-text("Bayar di Awal")').first();
  if (await bayarAwalRadio.isVisible()) {
    await bayarAwalRadio.click();
    await page.waitForTimeout(500);
  }

  // Look for nominal input
  const nominalInput = page.locator('input[type="number"], input[placeholder*="Nominal"], input[placeholder*="Rp"]').last();
  if (await nominalInput.isVisible()) {
    await nominalInput.fill("350000");
  }

  // Verify that proof of payment label says Opsional
  const proofLabel = await page.locator('text=Bukti Pembayaran (Opsional)').isVisible();
  console.log("Proof of Payment label is (Opsional):", proofLabel);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_buat_order_no_proof_allowed.png"), fullPage: false });

  // Next Step 2 -> 3
  const nextBtn2 = page.locator('button:has-text("Lanjut ke Konfirmasi"), button:has-text("Lanjut")').first();
  if (await nextBtn2.isVisible()) {
    await nextBtn2.click();
    await page.waitForTimeout(800);
  }

  // Submit Order
  const submitBtn = page.locator('button:has-text("Simpan & Buat Order"), button:has-text("Buat Order Sekarang")').first();
  if (await submitBtn.isVisible()) {
    console.log("Clicking submit order without payment proof...");
    await submitBtn.click();
    await page.waitForTimeout(2000);
  }

  // STEP 4: Check Order Tracking for new order
  console.log("\n--- 4. Checking Order Tracking ---");
  await page.goto("http://localhost:3000/order/tracking", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_order_tracking_new_order.png"), fullPage: false });

  // Open Stage 1 verification dialog / examine Stage 1
  const verifBtn = page.locator('button:has-text("Verifikasi Awal"), button:has-text("Verifikasi Pembayaran")').first();
  if (await verifBtn.isVisible()) {
    console.log("Stage 1 verification trigger found.");
    await verifBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_order_tracking_stage1_modal.png"), fullPage: false });

    // Try to upload proof in Stage 1
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Uploading payment proof via Stage 1 file input...");
      await fileInput.setInputFiles(sampleImagePath);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_order_tracking_stage1_uploaded.png"), fullPage: false });

      // Save/Confirm verification
      const confirmVerifBtn = page.locator('button:has-text("Verifikasi"), button:has-text("Simpan")').last();
      if (await confirmVerifBtn.isVisible() && !(await confirmVerifBtn.isDisabled())) {
        await confirmVerifBtn.click();
        await page.waitForTimeout(1500);
        console.log("Stage 1 verification saved!");
      }
    }
  }

  // STEP 5: Check Data Penjualan Detail & "Riwayat dan Bukti Pembayaran"
  console.log("\n--- 5. Checking Data Penjualan Detail ---");
  await page.goto("http://localhost:3000/data-penjualan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click row or "Detail" button
  const detailBtn = page.locator('button:has-text("Detail"), button:has-text("Lihat Detail"), td:has-text("Budi Hartono")').first();
  if (await detailBtn.isVisible()) {
    await detailBtn.click();
    await page.waitForTimeout(1500);

    // Scroll to Riwayat dan Bukti Pembayaran section
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_data_penjualan_riwayat_pembayaran.png"), fullPage: false });
    console.log("Screenshot taken: proof_data_penjualan_riwayat_pembayaran.png");

    // Click "Lihat" button on proof if available
    const lihatBuktiBtn = page.locator('button:has-text("Lihat")').first();
    if (await lihatBuktiBtn.isVisible()) {
      await lihatBuktiBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_data_penjualan_payment_proof_preview_modal.png"), fullPage: false });
      console.log("Screenshot taken: proof_data_penjualan_payment_proof_preview_modal.png");
    }
  }

  await browser.close();
  console.log("=== VERIFICATION COMPLETED ===");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
