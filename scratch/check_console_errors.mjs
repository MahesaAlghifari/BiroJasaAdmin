import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");

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
  page.on("console", msg => console.log("[BROWSER CONSOLE]", msg.type(), msg.text()));
  page.on("pageerror", err => console.log("[BROWSER ERROR]", err.message, err.stack));

  console.log("Navigating...");
  await page.goto("http://localhost:3000/finance/profit", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);

  await browser.close();
}

run().catch(console.error);
