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

  console.log("Navigating to /finance/belum-bayar...");
  await page.goto("http://localhost:3000/finance/belum-bayar", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_belum_bayar_table_loaded.png"), fullPage: false });

  // Click on first row Detail button
  const detailBtn = await page.$('button:has-text("Detail")');
  if (detailBtn) {
    console.log("Found Detail button! Clicking...");
    await detailBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_detail_page_loaded.png"), fullPage: true });

    // Click Lihat preview
    const lihatBtn = await page.$('button:has-text("Lihat")');
    if (lihatBtn) {
      console.log("Found Lihat button! Opening modal...");
      await lihatBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_document_modal_loaded.png") });
    }
  }

  // Check Data Penjualan tabs loaded
  console.log("Navigating to /data-penjualan...");
  await page.goto("http://localhost:3000/data-penjualan", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "data_penjualan_5_tabs_loaded.png"), fullPage: false });

  console.log("Capture completed!");
  await browser.close();
}

run().catch(console.error);
