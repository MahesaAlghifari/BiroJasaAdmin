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
  console.log("Authenticated as:", user?.nama, `(${user?.role})`);

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

  const testRoutes = [
    { name: "Tagihan", path: "http://localhost:3000/finance/tagihan" },
    { name: "Belum & Kurang Bayar", path: "http://localhost:3000/finance/belum-bayar" },
    { name: "Profit Terpending", path: "http://localhost:3000/finance/profit-pending" },
    { name: "Cashback Terpending", path: "http://localhost:3000/finance/cashback-pending" },
    { name: "Data Penjualan (Mutasi LD)", path: "http://localhost:3000/finance/penjualan/mutasi-ld" },
    { name: "Data Penjualan (Mutasi AS)", path: "http://localhost:3000/finance/penjualan/mutasi-as" },
    { name: "Data Penjualan (BBN)", path: "http://localhost:3000/finance/penjualan/bbn" },
    { name: "Data Penjualan (Perpanjangan Pajak)", path: "http://localhost:3000/finance/penjualan/perpanjangan-pajak" },
    { name: "Data Penjualan (Lain-lain)", path: "http://localhost:3000/finance/penjualan/lain-lain" },
  ];

  for (const route of testRoutes) {
    console.log(`\nNavigating to ${route.name}...`);
    await page.goto(route.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    const bodyContent = await page.content();
    if (bodyContent.includes("Terjadi kendala saat memuat")) {
      console.error(`FAIL: ErrorBoundary caught on ${route.name}`);
      errors.push(`ErrorBoundary on ${route.name}`);
    } else {
      console.log(`SUCCESS: ${route.name} loaded cleanly!`);
    }
  }

  // Take screenshot of Data Penjualan & Tagihan as proof
  await page.goto("http://localhost:3000/finance/penjualan/mutasi-ld", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/proof_data_penjualan_verified.png" });

  await page.goto("http://localhost:3000/finance/tagihan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "scratch/proof_tagihan_verified.png" });

  await browser.close();

  console.log("\n==========================================");
  if (errors.length > 0) {
    console.error(`Total Errors: ${errors.length}`, errors);
    process.exit(1);
  } else {
    console.log("ALL 9 FINANCIAL VIEWS LOADED CLEANLY WITH 0 ERRORS!");
  }
}

run().catch(err => {
  console.error("Execution error:", err);
  process.exit(1);
});
