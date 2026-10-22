const { chromium } = require("playwright");

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
  await page.goto("http://localhost:3000/finance/data-penjualan/perpanjangan-pajak", { waitUntil: "networkidle" });
  await page.waitForSelector("table", { timeout: 15000 });
  const row = page.locator('tr:has-text("Ahmad Dahlan")').first();
  const actionBtn = row.locator("button").first();
  await actionBtn.click();
  await page.waitForTimeout(1500);

  const text = await page.evaluate(() => document.body.innerText);
  const idx = text.indexOf("Riwayat dan Bukti Pembayaran");
  console.log("--- RIWAYAT TEXT ---");
  console.log(text.slice(idx, idx + 1000));

  await browser.close();
}

run().catch(console.error);
