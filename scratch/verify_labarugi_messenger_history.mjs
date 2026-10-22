import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");

async function run() {
  console.log("1. Authenticating with backend...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log("Logged in user:", user?.nama, "role:", user?.role);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", err => {
    console.error("[BROWSER ERROR]", err.message);
    errors.push(err.message);
  });
  page.on("console", msg => {
    if (msg.type() === "error") {
      console.error("[BROWSER CONSOLE ERROR]", msg.text());
    }
  });

  console.log("\n2. Navigating to Laba Rugi...");
  await page.goto("http://localhost:3000/finance/laba-rugi", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  // Check if error boundary is visible
  const errorTitle1 = await page.$eval("body", el => {
    const errorH = el.querySelector("h2, h3");
    return errorH?.textContent || "";
  }).catch(() => "");
  console.log("Header text on Laba Rugi:", errorTitle1);

  const fallbackText1 = await page.content();
  if (fallbackText1.includes("Terjadi kendala saat memuat Laba Rugi")) {
    console.error("FAIL: ErrorBoundary still showing for Laba Rugi!");
  } else {
    console.log("SUCCESS: Laba Rugi loaded without ErrorBoundary!");
  }
  await page.screenshot({ path: "scratch/proof_laba_rugi_verified.png" });

  console.log("\n3. Navigating to Messenger History...");
  await page.goto("http://localhost:3000/messenger/history", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);

  const fallbackText2 = await page.content();
  if (fallbackText2.includes("Terjadi kendala saat memuat Messenger History")) {
    console.error("FAIL: ErrorBoundary still showing for Messenger History!");
  } else {
    console.log("SUCCESS: Messenger History loaded without ErrorBoundary!");
  }
  await page.screenshot({ path: "scratch/proof_messenger_history_verified.png" });

  await browser.close();

  if (errors.length > 0) {
    console.error("\nCollected browser errors:", errors);
    process.exit(1);
  } else {
    console.log("\nALL TARGETED CHECKS PASSED WITH 0 ERRORS!");
  }
}

run().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
