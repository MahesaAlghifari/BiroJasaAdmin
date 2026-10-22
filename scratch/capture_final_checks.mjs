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
  page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

  console.log("Navigating to /finance/data-penjualan/mutasi-ld...");
  await page.goto("http://localhost:3000/finance/data-penjualan/mutasi-ld", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "data_penjualan_5_tabs_perfect.png"), fullPage: false });

  console.log("Navigating to /finance/belum-bayar...");
  await page.goto("http://localhost:3000/finance/belum-bayar", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_belum_bayar_perfect.png"), fullPage: false });

  // Click detail
  const detailBtn = await page.$('button:has-text("Detail")');
  if (detailBtn) {
    console.log("Clicking Detail button...");
    await detailBtn.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_detail_perfect.png"), fullPage: true });

    const lihatBtn = await page.$('button:has-text("Lihat")');
    if (lihatBtn) {
      console.log("Clicking Lihat...");
      await lihatBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_preview_dialog_perfect.png") });
    }
  } else {
    console.log("No detail button found on belum-bayar, checking profit-pending...");
    await page.goto("http://localhost:3000/finance/profit", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    const detailProfit = await page.$('button:has-text("Detail")');
    if (detailProfit) {
      await detailProfit.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "finance_detail_perfect.png"), fullPage: true });
    }
  }

  await browser.close();
  console.log("Done!");
}

run().catch(console.error);
