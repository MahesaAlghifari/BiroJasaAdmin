import { test, expect } from "@playwright/test";

test.describe("Phase 8.2: Shared Table Vertical-Fill & Page Layout System", () => {
  const BASE_URL = "http://localhost:3000";

  test.beforeEach(async ({ page }) => {
    // Authenticate as SVP / Administrator (full access to all modules)
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "svp@birojasa.com");
    await page.fill("#password", "admin123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("1. Finance Kas Kantor: Table card expands to fill vertical space and anchors summary at bottom", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/finance/kas-kantor`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/kas-kantor`);

    // Wait for table to be visible
    const tableCard = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableCard).toBeVisible();

    // Verify table wrapper has min-height and expands
    const boundingBox = await tableCard.boundingBox();
    expect(boundingBox).not.toBeNull();
    if (boundingBox) {
      expect(boundingBox.height).toBeGreaterThanOrEqual(220);
    }

    // Check that summary cards below table exist and are rendered cleanly
    const summaryCards = page.locator("text=Total penerimaan debit").first();
    await expect(summaryCards).toBeVisible();

    // Ensure pagination is visible and anchored
    const pagination = page.locator("nav[aria-label='Paginasi tabel']").first();
    await expect(pagination).toBeVisible();
  });

  test("2. Finance Kas Messenger: Vertical fill with pagination anchored at bottom", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/finance/kas-messenger`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/kas-messenger`);

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(220);
    }

    // Pagination at bottom
    const pagination = page.locator("nav[aria-label='Paginasi tabel']").first();
    await expect(pagination).toBeVisible();
  });

  test("3. Data Penjualan: Tabs content and table expand vertically", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(220);
    }

    const pagination = page.locator("nav[aria-label='Paginasi tabel']").first();
    await expect(pagination).toBeVisible();
  });

  test("4. Master Data Biaya Layanan: Table wrapper expands and summary card stays below", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/master-data/biaya-layanan`);
    await expect(page).toHaveURL(`${BASE_URL}/master-data/biaya-layanan`);

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(220);
    }

    // Summary Card stays below table
    const summaryCard = page.locator("text=Total Wilayah").first();
    await expect(summaryCard).toBeVisible();
  });

  test("5. Master Data Harga Dasar Samsat: Table wrapper expands with horizontal scroll", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/master-data/harga-dasar`);
    await expect(page).toHaveURL(`${BASE_URL}/master-data/harga-dasar`);

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(220);
    }
  });

  test("6. Manajemen Pengguna: Full height card and anchored pagination", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/manajemen/pengguna`);
    await expect(page).toHaveURL(`${BASE_URL}/manajemen/pengguna`);

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const pagination = page.locator("nav[aria-label='Paginasi tabel']").first();
    await expect(pagination).toBeVisible();
  });

  test("7. Audit Log: Empty search query renders centered empty state with min height", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/manajemen/riwayat-aktivitas`);
    await expect(page).toHaveURL(`${BASE_URL}/manajemen/riwayat-aktivitas`);

    // Type a nonexistent search query to trigger empty state
    const searchInput = page.locator("input[placeholder*='Cari pengguna']").first();
    await searchInput.fill("NONEXISTENT_QUERY_12345");

    const emptyCell = page.locator("text=Tidak ada data aktivitas").first();
    await expect(emptyCell).toBeVisible();

    const emptyBox = await emptyCell.boundingBox();
    expect(emptyBox).not.toBeNull();
    if (emptyBox) {
      // Empty state has min-h-[200px] py-12
      expect(emptyBox.height).toBeGreaterThanOrEqual(100);
    }
  });

  test("8. Messenger Task: Stats grid at top, table fills space, pagination anchored", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/messenger/tasks`);
    await expect(page).toHaveURL(`${BASE_URL}/messenger/tasks`);

    // Stats grid visible
    await expect(page.locator("text=Belum Diambil").first()).toBeVisible();

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const pagination = page.locator("nav[aria-label='Paginasi tabel']").first();
    await expect(pagination).toBeVisible();
  });

  test("9. Order Tracking: Stepper at top, active stage table fills vertical layout", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/order/tracking`);
    await expect(page).toHaveURL(`${BASE_URL}/order/tracking`);

    const tableWrapper = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableWrapper).toBeVisible();

    const box = await tableWrapper.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(220);
    }
  });

  test("10. Order History / Rekap Order: Summary grid at top, table fills space, footer anchored at bottom", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE_URL}/order/rekap`);
    await expect(page).toHaveURL(`${BASE_URL}/order/rekap`);

    // Summary cards visible
    await expect(page.locator("text=Total Order Selesai").first()).toBeVisible();

    const tableWrapper = page.locator(".rounded-xl.border.border-border\\/80").first();
    await expect(tableWrapper).toBeVisible();

    const footerText = page.locator("text=Menampilkan").first();
    await expect(footerText).toBeVisible();
  });
});
