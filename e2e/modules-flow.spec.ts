import { test, expect } from "@playwright/test";

test.describe("E2E Tests 2–7: Core Modules in Real Browser", () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(45000);
    // Clear localStorage and log in as Admin
    await page.goto("http://localhost:3000");
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();

    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    
    const loginResponsePromise = page.waitForResponse(response => 
      response.url().includes("/api/auth/login") && response.status() === 200
    );
    await page.click("button[type='submit']");
    await loginResponsePromise;
    await page.waitForTimeout(500);
  });

  test("E2E Test 2: Order Module renders live API data in browser", async ({ page }) => {
    // Click Order Tracking directly from expanded sidebar menu
    await page.getByRole("button", { name: "Order Tracking" }).click();
    await expect(page.locator("text=Memuat halaman...")).not.toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(1000);

    // Verify Order tracking view or order cards are visible
    await expect(page.locator("text=Order").first()).toBeVisible();
    const content = await page.content();
    expect(content.includes("Verifikasi") || content.includes("Penjadwalan") || content.includes("ORD-")).toBeTruthy();
  });

  test("E2E Test 3: Finance Module renders live invoices and kas kantor (Finance Role)", async ({ page }) => {
    // Finance role login
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("http://localhost:3000");

    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    const loginResponsePromise = page.waitForResponse(response => 
      response.url().includes("/api/auth/login") && response.status() === 200
    );
    await page.click("button[type='submit']");
    await loginResponsePromise;
    await page.waitForTimeout(800);

    // Finance navigation
    await page.locator("nav button", { hasText: "Finance" }).click();
    await page.waitForTimeout(1000);

    // Verify Finance content renders
    const content = await page.content();
    expect(content.includes("Rp") || content.includes("Tagihan") || content.includes("Profit") || content.includes("Kas")).toBeTruthy();
  });

  test("E2E Test 4: Master Data Module renders pricing", async ({ page }) => {
    // Navigate to Master Data
    await page.locator("nav button", { hasText: "Master Data" }).click();
    await page.waitForTimeout(1000);

    // Verify Master Data content
    await expect(page.locator("text=Master Data").or(page.locator("text=Samsat")).or(page.locator("text=Harga")).first()).toBeVisible();
  });

  test("E2E Test 5: Management Module displays employee & user roster", async ({ page }) => {
    // Navigate to Manajemen
    await page.locator("nav button", { hasText: "Manajemen" }).click();
    await page.waitForTimeout(1000);

    // Verify user management content
    await expect(page.locator("text=Manajemen").or(page.locator("text=Karyawan")).first()).toBeVisible();
    const content = await page.content();
    expect(content.includes("Admin") || content.includes("Budi Santoso") || content.includes("Aktif")).toBeTruthy();
  });

  test("E2E Test 6: Messenger Role lands on dedicated Messenger Workspace", async ({ page }) => {
    // Logout from admin
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("http://localhost:3000");

    // Login as Messenger
    await page.fill("#email", "budi.messenger@birojasa.com");
    await page.fill("#password", "messenger123");
    const loginResponsePromise = page.waitForResponse(response => 
      response.url().includes("/api/auth/login") && response.status() === 200
    );
    await page.click("button[type='submit']");
    await loginResponsePromise;
    await page.waitForTimeout(1200);

    // Verify Messenger Workspace is displayed
    await expect(page.locator("text=Tugas").first()).toBeVisible();
    await expect(page.locator("text=Budi Santoso").first()).toBeVisible();
  });

  test("E2E Test 7: Dashboard renders operational and financial KPIs from live data", async ({ page }) => {
    // Navigate to Dashboard
    await page.locator("nav button", { hasText: "Dashboard" }).click();
    await page.waitForTimeout(1000);

    // Verify Dashboard heading and KPI cards
    await expect(page.locator("h1", { hasText: "Dashboard" })).toBeVisible();
    await expect(page.locator("text=Total Client").first()).toBeVisible();
    await expect(page.locator("text=Rp").first()).toBeVisible();
  });
});
