import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");
const path = require("path");

const ARTIFACT_DIR = "C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169";

async function run() {
  console.log("Logging in via API...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log("Login successful, token:", Boolean(token));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

  console.log("Navigating to /messenger/tasks...");
  await page.goto("http://localhost:3000/messenger/tasks", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  // 1. Capture Active Tasks View
  console.log("Capturing active tasks view...");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "proof_messenger_tasks_active_filtered.png"),
    fullPage: false,
  });

  // Extract active tasks rows
  const activeRows = await page.$$eval("tbody tr", rows => {
    return rows.map(r => {
      const cells = Array.from(r.querySelectorAll("td"));
      return cells.map(c => c.textContent?.trim()).filter(Boolean);
    });
  });
  console.log("Active tasks table rows count:", activeRows.length);
  activeRows.forEach((r, idx) => console.log(`Row ${idx + 1}:`, r.slice(0, 6)));

  // 2. Click on "Riwayat Tugas Messenger" Tab
  console.log("Switching to Riwayat Tugas Messenger tab...");
  const historyTabBtn = await page.waitForSelector('button:has-text("Riwayat Tugas Messenger")');
  await historyTabBtn.click();
  await page.waitForTimeout(2000);

  console.log("Capturing history table view...");
  await page.screenshot({
    path: path.join(ARTIFACT_DIR, "proof_messenger_history_table.png"),
    fullPage: false,
  });

  // Extract history rows
  const historyRows = await page.$$eval("tbody tr", rows => {
    return rows.map(r => {
      const cells = Array.from(r.querySelectorAll("td"));
      return cells.map(c => c.textContent?.trim()).filter(Boolean);
    });
  });
  console.log("History tasks table rows count:", historyRows.length);
  historyRows.slice(0, 5).forEach((r, idx) => console.log(`Hist Row ${idx + 1}:`, r.slice(0, 8)));

  // 3. Open Detail Modal on row with photo proof (or fallback to row 1)
  console.log("Opening History Detail Modal on row with photo...");
  const rowWithPhotoEyeBtn = await page.$('tbody tr:has(img[alt="Bukti"]) button[title*="Lihat Bukti"]');
  const targetBtn = rowWithPhotoEyeBtn || (await page.$('tbody tr:first-child button[title*="Lihat Bukti"]'));
  if (targetBtn) {
    await targetBtn.click();
    await page.waitForTimeout(1500);

    console.log("Capturing History Detail Modal...");
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, "proof_messenger_history_detail_modal.png"),
      fullPage: false,
    });
  } else {
    console.log("Could not find eye button");
  }

  await browser.close();
  console.log("Verification finished successfully!");
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
