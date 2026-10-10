import { test, expect, Browser } from "@playwright/test";
import * as path from "path";

const BASE_URL = "http://localhost:3000";
const DP = `${BASE_URL}/finance/data-penjualan`;
const PRIMARY = "rgb(37, 99, 235)"; // solid blue
const WHITE = "rgb(255, 255, 255)"; // white text
const EVIDENCE_DIR = "C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169\\responsive_evidence";

async function loginFinance(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", "finance@birojasa.com");
  await page.fill("#password", "finance123");
  await page.click("button[type='submit']");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("Phase 8.5: Data Penjualan Toolbar & Interaction UX Refinement", () => {
  test.beforeEach(async ({ page }) => {
    await loginFinance(page);
  });

  test("1-5. Active Tab: Solid blue background, white text, no bottom indicator, URL sync on click", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DP}/mutasi-ld`);
    await page.waitForLoadState("domcontentloaded");

    const activeTab = page.getByRole("tab", { name: "Mutasi LD", exact: true });
    const inactiveTab = page.getByRole("tab", { name: "Mutasi AS", exact: true });

    // 1. Active tab is solid blue
    const activeBg = await activeTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor);
    expect(activeBg).toBe(PRIMARY);

    // 2. Active tab text is white
    const activeColor = await activeTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).color);
    expect(activeColor).toBe(WHITE);

    // 3. No active bottom/inline indicator exists (pseudo-element is not generated or has no content)
    const indicatorContent = await activeTab.evaluate((el: HTMLElement) => {
      const after = window.getComputedStyle(el, "::after");
      return after.content;
    });
    expect(indicatorContent === "none" || indicatorContent === "normal").toBe(true);

    // Inactive tab is muted and not blue
    const inactiveBg = await inactiveTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor);
    const inactiveColor = await inactiveTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).color);
    expect(inactiveBg).not.toBe(PRIMARY);
    expect(inactiveColor).not.toBe(WHITE);

    // 4. Clicking inactive tab changes active appearance
    await inactiveTab.click();
    await expect(page).toHaveURL(`${DP}/mutasi-as`);
    await page.waitForTimeout(100);

    const newActiveBg = await inactiveTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor);
    const newActiveColor = await inactiveTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).color);
    expect(newActiveBg).toBe(PRIMARY);
    expect(newActiveColor).toBe(WHITE);

    // 5. URL-driven state remains correct
    await page.reload();
    await expect(page).toHaveURL(`${DP}/mutasi-as`);
    const reloadedBg = await inactiveTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor);
    expect(reloadedBg).toBe(PRIMARY);

    // Capture screenshot
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "phase85-active-tab-solid-blue.png"),
    });
  });

  test("6-9. Filter UX: Contained date control, no standalone date button, working filter & reset", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DP}/mutasi-ld`);
    await page.waitForLoadState("domcontentloaded");

    // 8. Verify NO duplicate standalone date button on the main toolbar
    // The main toolbar should only have: Tambah (optional), Filter, Pengaturan tabel, Search
    const toolbar = page.locator(".finance-table-container").first();
    const standaloneDateButtons = toolbar.locator("> div:first-child button:has-text('Pilih tanggal')");
    await expect(standaloneDateButtons).toHaveCount(0);

    // 6. Filter button opens the filter interaction
    const filterBtn = toolbar.locator("button[aria-label='Filter data tabel']");
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    // Filter popover is visible
    const filterPopover = page.locator("[data-slot='popover-content']").filter({ hasText: "Filter" });
    await expect(filterPopover).toBeVisible();

    // 7. Date control exists INSIDE the filter interaction
    const dateControlInsideFilter = filterPopover.locator("button:has-text('Pilih tanggal')");
    await expect(dateControlInsideFilter).toBeVisible();

    // 9. Existing filter behavior still works: verify category filter & apply/reset buttons
    const resetButton = filterPopover.locator("button:has-text('Reset')").last();
    const applyButton = filterPopover.locator("button:has-text('Terapkan')");
    await expect(resetButton).toBeVisible();
    await expect(applyButton).toBeVisible();

    // Clicking Terapkan closes the filter popover
    await applyButton.click();
    await expect(filterPopover).not.toBeVisible();

    // Reopen and check Reset
    await filterBtn.click();
    await expect(filterPopover).toBeVisible();
    await resetButton.click();
    await expect(filterPopover).not.toBeVisible();

    // Capture screenshot
    await filterBtn.click();
    await expect(filterPopover).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "phase85-filter-popover-with-date.png"),
    });
    await applyButton.click();
  });

  test("10-12. Table Settings & Export: Reachable through settings, retains all export features", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${DP}/mutasi-ld`);
    await page.waitForLoadState("domcontentloaded");

    // Verify standalone export button is NOT on the main toolbar
    const toolbar = page.locator(".finance-table-container").first();
    const standaloneExport = toolbar.locator("> div:first-child > div:first-child > button:has-text('Ekspor')");
    await expect(standaloneExport).toHaveCount(0);

    // 10. Table Settings opens successfully
    const settingsBtn = toolbar.locator("button[aria-label='Pengaturan tabel']");
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    const settingsPopover = page.locator("[data-slot='popover-content']").filter({ hasText: "Pengaturan tabel" });
    await expect(settingsPopover).toBeVisible();

    // Verify settings controls: font size, column checkboxes
    await expect(settingsPopover.locator("text=Ukuran teks")).toBeVisible();
    await expect(settingsPopover.locator("text=Kolom yang ditampilkan")).toBeVisible();

    // 11. Export remains reachable through Table Settings
    const exportBtnInsideSettings = settingsPopover.locator("button:has-text('Buka dialog ekspor')");
    await expect(exportBtnInsideSettings).toBeVisible();

    // 12. Existing export functionality works: clicking opens export dialog
    await exportBtnInsideSettings.click();

    // Export dialog should appear
    const exportDialog = page.locator("[data-slot='dialog-content']").filter({ hasText: "Ekspor Data" });
    await expect(exportDialog).toBeVisible();

    // Verify CSV / PDF options and period select exist
    await expect(exportDialog.locator("text=CSV / Excel")).toBeVisible();
    await expect(exportDialog.locator("text=PDF / Cetak")).toBeVisible();
    await expect(exportDialog.locator("text=Pilihan Periode")).toBeVisible();

    // Close export dialog
    await page.keyboard.press("Escape");
    await expect(exportDialog).not.toBeVisible();

    // Capture screenshot
    await settingsBtn.click();
    await expect(settingsPopover).toBeVisible();
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "phase85-table-settings-with-export.png"),
    });
    await page.keyboard.press("Escape");
  });

  test("13-15. Responsive at 320px: Toolbar, Filter with date, and Table Settings are all usable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${DP}/mutasi-ld`);
    await page.waitForLoadState("domcontentloaded");

    // 13. Toolbar is usable at 320px
    const toolbar = page.locator(".finance-table-container").first();
    const filterBtn = toolbar.locator("button[aria-label='Filter data tabel']");
    const settingsBtn = toolbar.locator("button[aria-label='Pengaturan tabel']");
    await expect(filterBtn).toBeVisible();
    await expect(settingsBtn).toBeVisible();

    // Verify no document horizontal overflow
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
    expect(overflow).toBe(false);

    // 14. Filter UI is usable at 320px
    await filterBtn.click();
    const filterPopover = page.locator("[data-slot='popover-content']").filter({ hasText: "Filter" });
    await expect(filterPopover).toBeVisible();
    const fBox = await filterPopover.boundingBox();
    expect(fBox).not.toBeNull();
    if (fBox) {
      expect(fBox.width).toBeLessThanOrEqual(320);
    }
    // Date control is inside and visible
    const dateBtn = filterPopover.locator("button:has-text('Pilih tanggal')");
    await expect(dateBtn).toBeVisible();
    await page.keyboard.press("Escape");

    // 15. Table Settings UI is usable at 320px
    await settingsBtn.click();
    const settingsPopover = page.locator("[data-slot='popover-content']").filter({ hasText: "Pengaturan tabel" });
    await expect(settingsPopover).toBeVisible();
    const sBox = await settingsPopover.boundingBox();
    expect(sBox).not.toBeNull();
    if (sBox) {
      expect(sBox.width).toBeLessThanOrEqual(320);
    }
    await page.keyboard.press("Escape");

    // Capture screenshot at 320px
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, "phase85-toolbar-320px.png"),
    });
  });

  test("16. Browser Zoom 200% & 300%: Toolbar, popovers, and tabs remain fully operational", async ({ browser }: { browser: Browser }) => {
    for (const z of [200, 300]) {
      const ctx = await browser.newContext({
        viewport: { width: Math.round((1440 * 100) / z), height: Math.round((900 * 100) / z) },
        deviceScaleFactor: z / 100,
      });
      const page = await ctx.newPage();
      await loginFinance(page);
      await page.goto(`${DP}/mutasi-ld`);
      await page.waitForLoadState("domcontentloaded");

      // Active tab check
      const activeTab = page.getByRole("tab", { name: "Mutasi LD", exact: true });
      await expect(activeTab).toBeVisible();
      const bg = await activeTab.evaluate((el: HTMLElement) => window.getComputedStyle(el).backgroundColor);
      expect(bg).toBe(PRIMARY);

      // Filter button check
      const filterBtn = page.locator("button[aria-label='Filter data tabel']");
      await expect(filterBtn).toBeVisible();
      await filterBtn.click();
      const filterPopover = page.locator("[data-slot='popover-content']").filter({ hasText: "Filter" });
      await expect(filterPopover).toBeVisible();
      await page.keyboard.press("Escape");

      // Settings button check
      const settingsBtn = page.locator("button[aria-label='Pengaturan tabel']");
      await expect(settingsBtn).toBeVisible();

      // Screenshot at zoom
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `phase85-zoom-${z}.png`),
      });

      await ctx.close();
    }
  });
});
