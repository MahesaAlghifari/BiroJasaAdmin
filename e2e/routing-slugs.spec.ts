import { test, expect } from "@playwright/test";

test.describe("Phase 8.1: Routing & Canonical Slugs E2E Test Suite", () => {
  const BASE_URL = "http://localhost:3000";

  test("1. Root URL redirects to /dashboard", async ({ page }) => {
    // Authenticate as Admin first
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to root /
    await page.goto(`${BASE_URL}/`);
    await page.waitForURL("**/dashboard", { timeout: 10000 });
    expect(page.url()).toBe(`${BASE_URL}/dashboard`);
    await expect(page.locator("h2", { hasText: "Dashboard" })).toBeVisible();
  });

  test("2. Direct navigation and deep linking to /finance/kas-messenger (Finance Role)", async ({ page }) => {
    // Set authenticated session for Finance
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Directly navigate to /finance/kas-messenger
    await page.goto(`${BASE_URL}/finance/kas-messenger`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/kas-messenger`);
    await expect(page.locator("h2", { hasText: "Kas Messenger" })).toBeVisible();
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("Finance");
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("Kas Messenger");
  });

  test("3. Direct navigation to /order/tracking (Admin Role)", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Direct navigation
    await page.goto(`${BASE_URL}/order/tracking`);
    await expect(page).toHaveURL(`${BASE_URL}/order/tracking`);
    await expect(page.locator("h2", { hasText: "Order Tracking" })).toBeVisible();
    await expect(page.locator("text=Verifikasi").first()).toBeVisible();
  });

  test("4. Data Penjualan root automatically redirects to /finance/data-penjualan/mutasi-ld", async ({ page }) => {
    // Login as Finance
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to /finance/data-penjualan without category
    await page.goto(`${BASE_URL}/finance/data-penjualan`);
    await page.waitForURL("**/finance/data-penjualan/mutasi-ld", { timeout: 10000 });
    expect(page.url()).toBe(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);

    // Verify Mutasi LD tab is active
    const activeTab = page.locator("[role='tab'][data-state='active']");
    await expect(activeTab).toHaveText("Mutasi LD");
  });

  test("5. Data Penjualan tab switching updates browser URL", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);

    // Click Mutasi AS tab
    await page.locator("[role='tab']", { hasText: "Mutasi AS" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("Mutasi AS");

    // Click BBN tab
    await page.locator("[role='tab']", { hasText: "BBN" }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("BBN");
  });

  test("6. Data Penjualan refresh persistence preserves active category", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Direct navigate to /finance/data-penjualan/belum-kurang-bayar
    await page.goto(`${BASE_URL}/finance/data-penjualan/belum-kurang-bayar`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/belum-kurang-bayar`);
    await expect(page.locator("[role='tab'][data-state='active']")).toHaveText("Belum & Kurang Bayar");

    // Reload the page (F5)
    await page.reload();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/belum-kurang-bayar`);
    await expect(page.locator("[role='tab'][data-state='active']")).toHaveText("Belum & Kurang Bayar");
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("Belum & Kurang Bayar");
  });

  test("7. Browser Back and Forward traversal", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Step 1: Dashboard
    expect(page.url()).toBe(`${BASE_URL}/dashboard`);

    // Step 2: Navigate to Order Tracking
    await page.goto(`${BASE_URL}/order/tracking`);
    expect(page.url()).toBe(`${BASE_URL}/order/tracking`);

    // Step 3: Navigate to Buat Order
    await page.goto(`${BASE_URL}/order/buat`);
    expect(page.url()).toBe(`${BASE_URL}/order/buat`);

    // Step 4: Browser Back -> should be /order/tracking
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/order/tracking`);
    await expect(page.locator("h2", { hasText: "Order Tracking" })).toBeVisible();

    // Step 5: Browser Back -> should be /dashboard
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator("h2", { hasText: "Dashboard" })).toBeVisible();

    // Step 6: Browser Forward -> should be /order/tracking
    await page.goForward();
    await expect(page).toHaveURL(`${BASE_URL}/order/tracking`);
    await expect(page.locator("h2", { hasText: "Order Tracking" })).toBeVisible();
  });

  test("8. Settings route /settings renders with correct header title", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Click settings button in header
    await page.locator("header button[aria-label='Pengaturan sistem']").click();
    await expect(page).toHaveURL(`${BASE_URL}/settings`);

    // Verify header title does NOT fallback to "Dashboard"
    await expect(page.locator("header h2", { hasText: "Pengaturan" })).toBeVisible();
    await expect(page.locator("header p", { hasText: "Kelola preferensi dan konfigurasi sistem" })).toBeVisible();
  });

  test("9. Profile route /profile renders with correct header title", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Click profile button in header
    await page.locator("header button[aria-label='Buka profil admin']").click();
    await expect(page).toHaveURL(`${BASE_URL}/profile`);

    // Verify header title does NOT fallback to "Dashboard"
    await expect(page.locator("header h2", { hasText: "Profil Saya" })).toBeVisible();
  });

  test("10. Unknown route renders 404 Not Found page", async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Navigate to an unknown path
    await page.goto(`${BASE_URL}/halaman-tidak-dikenal-12345`);
    await expect(page.locator("text=Halaman Tidak Ditemukan")).toBeVisible();
    await expect(page.locator("text=Error 404")).toBeVisible();

    // Click return to dashboard button
    await page.click("button:has-text('Kembali ke Dashboard')");
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  });

  test("11. Unauthenticated access to protected route redirects to /login", async ({ page }) => {
    // Clear localStorage to simulate unauthenticated visitor
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => window.localStorage.clear());

    // Attempt direct navigation to protected /order/tracking
    await page.goto(`${BASE_URL}/order/tracking`);
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
    await expect(page.locator("button[type='submit']", { hasText: "Masuk ke Sistem" })).toBeVisible();
  });

  test("12. Role-restricted route behavior enforces access boundaries", async ({ page }) => {
    // Login as Admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });

    // Admin is NOT allowed to view Finance modules (/finance/profit)
    await page.goto(`${BASE_URL}/finance/profit`);
    await expect(page.locator("h2", { hasText: "Akses Ditolak" })).toBeVisible();
    await expect(page.locator("text=Anda tidak memiliki izin untuk mengakses halaman ini")).toBeVisible();

    // Click return to dashboard
    await page.click("button:has-text('Kembali ke Dashboard')");
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
  });
});
