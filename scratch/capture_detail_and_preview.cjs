const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const { data: { token, user } } = await loginRes.json();

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  page.on("pageerror", err => console.log("PAGE ERROR:", err.message));

  // Navigate to Data Penjualan Perpanjangan Pajak
  console.log("Navigating to Data Penjualan...");
  await page.goto("http://localhost:3000/finance/data-penjualan/perpanjangan-pajak", { waitUntil: "networkidle" });
  await page.waitForSelector("table", { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Look specifically for ORD-0021 row
  const row = page.locator('tr:has-text("ORD-0021")').first();
  console.log("ORD-0021 row visible:", await row.isVisible());

  // Click action menu or row button
  const actionBtn = row.locator("button").first();
  await actionBtn.click();
  await page.waitForTimeout(1500);

  // Check if we are on FinanceDetailPage
  const detailTitle = page.locator('h2:has-text("Detail transaksi")');
  console.log("Detail page title visible:", await detailTitle.isVisible().catch(() => false));

  if (await detailTitle.isVisible()) {
    // Scroll down to show "Riwayat dan Bukti Pembayaran"
    await page.evaluate(() => window.scrollTo(0, 320));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_finance_detail_riwayat_pembayaran_card.png"), fullPage: false });
    console.log("Screenshot: proof_finance_detail_riwayat_pembayaran_card.png");

    // Look for Lihat button in Riwayat dan Bukti Pembayaran
    const lihatBtn = page.locator('button:has-text("Lihat")').first();
    console.log("Lihat button found:", await lihatBtn.isVisible().catch(() => false));
    if (await lihatBtn.isVisible()) {
      await lihatBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_finance_detail_preview_payment_proof_modal.png"), fullPage: false });
      console.log("Screenshot: proof_finance_detail_preview_payment_proof_modal.png");
    }
  }

  await browser.close();
  console.log("Done!");
}

run().catch(console.error);
