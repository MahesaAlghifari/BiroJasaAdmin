import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169";

async function run() {
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();

  console.log("Navigating to /finance/profit...");
  await page.goto("http://localhost:3000/finance/profit", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // Click on the eye icon view button
  const viewBtns = await page.$$('button[aria-label="Lihat detail transaksi"]');
  console.log("Found view action buttons:", viewBtns.length);

  if (viewBtns.length > 0) {
    console.log("Clicking first eye icon view button...");
    await viewBtns[0].click();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_detail_page_verified.png"), fullPage: true });

    // Check if Order Selesai & Terarsip badge exists and if Lacak button is absent
    const hasLacakBtn = await page.$('button:has-text("Lacak di Order Tracking")');
    const hasOrderSelesaiBadge = await page.$('text=Order Selesai & Terarsip');
    const hasCompressedDocs = await page.$('text=Berkas & Dokumen Hasil Proses (Terkompresi)');

    console.log("In Detail Page:");
    console.log("- Has Lacak di Order Tracking button?", !!hasLacakBtn);
    console.log("- Has Order Selesai & Terarsip badge?", !!hasOrderSelesaiBadge);
    console.log("- Has Berkas & Dokumen Hasil Proses (Terkompresi)?", !!hasCompressedDocs);

    // Click "Lihat" preview button
    const lihatBtn = await page.$('button:has-text("Lihat")');
    if (lihatBtn) {
      console.log("Clicking 'Lihat' document button...");
      await lihatBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_document_preview_dialog_verified.png") });
      console.log("Preview dialog captured successfully!");
    }
  }

  // Also test clicking view in Belum & Kurang Bayar
  console.log("Navigating to /finance/belum-bayar...");
  await page.goto("http://localhost:3000/finance/belum-bayar", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  const viewBtnsBelum = await page.$$('button[aria-label="Lihat detail transaksi"]');
  console.log("Found view buttons in Belum Bayar:", viewBtnsBelum.length);
  if (viewBtnsBelum.length > 0) {
    await viewBtnsBelum[0].click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_belum_bayar_detail_verified.png"), fullPage: true });
  }

  await browser.close();
  console.log("Done verification!");
}

run().catch(console.error);
