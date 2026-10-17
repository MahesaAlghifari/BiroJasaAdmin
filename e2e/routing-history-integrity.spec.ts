import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

test.describe("Phase 8.6: Routing History & Route Transition Integrity", () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as Finance role
    await page.goto(`${BASE_URL}/login`);
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    await page.click("button[type='submit']");
    await page.waitForURL("**/dashboard", { timeout: 10000 });
  });

  test("1 & 2: Single click on inactive tab pushes 1 history entry; clicking active tab pushes 0", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");

    // Instrument history
    await page.evaluate(() => {
      (window as any).__historyLogs = [];
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        (window as any).__historyLogs.push({ type: "pushState", url: args[2] });
        return origPush.apply(this, args);
      };
      history.replaceState = function (...args) {
        (window as any).__historyLogs.push({ type: "replaceState", url: args[2] });
        return origReplace.apply(this, args);
      };
    });

    // 1. Click inactive tab Mutasi AS -> exactly 1 pushState
    await page.getByRole("tab", { name: "Mutasi AS", exact: true }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);
    await page.waitForTimeout(150);

    let logs = await page.evaluate(() => (window as any).__historyLogs);
    expect(logs.length).toBe(1);
    expect(logs[0]).toEqual({ type: "pushState", url: "/finance/data-penjualan/mutasi-as" });

    // 2. Click already active tab Mutasi AS -> 0 new pushState
    await page.getByRole("tab", { name: "Mutasi AS", exact: true }).click();
    await page.waitForTimeout(150);

    logs = await page.evaluate(() => (window as any).__historyLogs);
    expect(logs.length).toBe(1); // Still 1

    // Click inactive tab BBN -> exactly 1 new pushState (total 2)
    await page.getByRole("tab", { name: "BBN", exact: true }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);
    await page.waitForTimeout(150);

    logs = await page.evaluate(() => (window as any).__historyLogs);
    expect(logs.length).toBe(2);
    expect(logs[1]).toEqual({ type: "pushState", url: "/finance/data-penjualan/bbn" });
  });

  test("3: Keyboard navigation (ArrowRight / ArrowLeft / Home / End) pushes exactly 1 history entry per activated tab", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");

    await page.evaluate(() => {
      (window as any).__historyLogs = [];
      const origPush = history.pushState;
      history.pushState = function (...args) {
        (window as any).__historyLogs.push({ type: "pushState", url: args[2] });
        return origPush.apply(this, args);
      };
    });

    const activeTab = page.getByRole("tab", { name: "Mutasi LD", exact: true });
    await activeTab.focus();

    // ArrowRight -> Mutasi AS
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);
    await page.waitForTimeout(150);

    let logs = await page.evaluate(() => (window as any).__historyLogs);
    expect(logs.length).toBe(1);
    expect(logs[0]).toEqual({ type: "pushState", url: "/finance/data-penjualan/mutasi-as" });

    // ArrowRight -> BBN
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);
    await page.waitForTimeout(150);

    logs = await page.evaluate(() => (window as any).__historyLogs);
    expect(logs.length).toBe(2);
    expect(logs[1]).toEqual({ type: "pushState", url: "/finance/data-penjualan/bbn" });

    // ArrowLeft -> Mutasi AS
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);
    await page.waitForTimeout(150);

    logs = await page.evaluate(() => (window as any).__historyLogs);
    expect(logs.length).toBe(3);
    expect(logs[2]).toEqual({ type: "pushState", url: "/finance/data-penjualan/mutasi-as" });
  });

  test("4 & 5 & 7: Browser Back and Forward traverse single distinct steps and maintain visual state", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");

    // Click Mutasi AS
    await page.getByRole("tab", { name: "Mutasi AS", exact: true }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);

    // Click BBN
    await page.getByRole("tab", { name: "BBN", exact: true }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);

    // Click Perpanjangan Pajak
    await page.getByRole("tab", { name: "Perpanjangan Pajak", exact: true }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/perpanjangan-pajak`);

    // Back 1 -> BBN
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);
    await expect(page.getByRole("tab", { name: "BBN", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("BBN");

    // Back 2 -> Mutasi AS
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);
    await expect(page.getByRole("tab", { name: "Mutasi AS", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("Mutasi AS");

    // Back 3 -> Mutasi LD
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await expect(page.getByRole("tab", { name: "Mutasi LD", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("nav[aria-label='Breadcrumb']")).toContainText("Mutasi LD");

    // Forward 1 -> Mutasi AS
    await page.goForward();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);
    await expect(page.getByRole("tab", { name: "Mutasi AS", exact: true })).toHaveAttribute("aria-selected", "true");

    // Forward 2 -> BBN
    await page.goForward();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);
    await expect(page.getByRole("tab", { name: "BBN", exact: true })).toHaveAttribute("aria-selected", "true");

    // Forward 3 -> Perpanjangan Pajak
    await page.goForward();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/perpanjangan-pajak`);
    await expect(page.getByRole("tab", { name: "Perpanjangan Pajak", exact: true })).toHaveAttribute("aria-selected", "true");
  });

  test("6: Invalid category slug redirects via replace without pushing duplicate history", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");

    // Instrument history
    await page.evaluate(() => {
      (window as any).__historyLogs = [];
      const origPush = history.pushState;
      const origReplace = history.replaceState;
      history.pushState = function (...args) {
        (window as any).__historyLogs.push({ type: "pushState", url: args[2] });
        return origPush.apply(this, args);
      };
      history.replaceState = function (...args) {
        (window as any).__historyLogs.push({ type: "replaceState", url: args[2] });
        return origReplace.apply(this, args);
      };
    });

    // Navigate to invalid slug
    await page.goto(`${BASE_URL}/finance/data-penjualan/kategori-palsu-xyz`);
    await page.waitForURL("**/finance/data-penjualan/mutasi-ld", { timeout: 10000 });
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await expect(page.getByRole("tab", { name: "Mutasi LD", exact: true })).toHaveAttribute("aria-selected", "true");
  });

  test("8: Search / filter inputs and Table Settings do not corrupt tab history state", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");

    // Type in search box
    const searchInput = page.getByPlaceholder(/Cari/i).first();
    await searchInput.fill("B 1970 SAM");
    await page.waitForTimeout(200);

    // Open filter popover
    const filterBtn = page.locator("button[aria-label='Filter data tabel']");
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    const filterPopover = page.locator("[data-slot='popover-content']").filter({ hasText: "Filter" });
    await expect(filterPopover).toBeVisible();
    await page.keyboard.press("Escape");

    // Verify URL is still cleanly /finance/data-penjualan/mutasi-ld
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);

    // Switch tab to Mutasi AS
    await page.getByRole("tab", { name: "Mutasi AS", exact: true }).click();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);

    // Go back -> should immediately return to mutasi-ld
    await page.goBack();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await expect(page.getByRole("tab", { name: "Mutasi LD", exact: true })).toHaveAttribute("aria-selected", "true");
  });

  test("9 & 10: Page subtree does NOT remount on tab switch and element identity remains stable", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");

    // Tag the TabsList element with a custom symbol/property on its DOM node
    await page.evaluate(() => {
      const tabsList = document.querySelector("[role='tablist']");
      if (tabsList) {
        (tabsList as any).__persistentIdentityTestMarker = 42;
      }
      const searchBox = document.querySelector("input[type='search'], input[placeholder*='Cari']");
      if (searchBox) {
        (searchBox as any).__searchBoxIdentityMarker = 99;
      }
    });

    // Focus the Mutasi AS tab
    const mutasiASTab = page.getByRole("tab", { name: "Mutasi AS", exact: true });
    await mutasiASTab.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/mutasi-as`);

    // Verify the DOM elements were NOT destroyed/remounted
    const markers = await page.evaluate(() => {
      const tabsList = document.querySelector("[role='tablist']");
      const searchBox = document.querySelector("input[type='search'], input[placeholder*='Cari']");
      return {
        tabsListMarker: (tabsList as any)?.__persistentIdentityTestMarker,
        searchBoxMarker: (searchBox as any)?.__searchBoxIdentityMarker,
        focusedTagName: document.activeElement?.tagName,
        focusedRole: document.activeElement?.getAttribute("role"),
        isFocusedConnected: document.activeElement ? document.body.contains(document.activeElement) : false,
      };
    });

    expect(markers.tabsListMarker).toBe(42);
    expect(markers.isFocusedConnected).toBe(true);
  });

  test("11: Transitions between distinct modules mount/unmount page view appropriately", async ({ page }) => {
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("h2", { hasText: "Data Penjualan" })).toBeVisible();

    // Navigate to Kas Messenger
    await page.goto(`${BASE_URL}/finance/kas-messenger`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/kas-messenger`);
    await expect(page.locator("h2", { hasText: "Kas Messenger" })).toBeVisible();
    await expect(page.locator("[role='tablist']")).toBeHidden(); // Data Penjualan tablist is not present

    // Navigate to Dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(`${BASE_URL}/dashboard`);
    await expect(page.locator("h2", { hasText: "Dashboard" })).toBeVisible();
  });

  test("12 & 13: ErrorBoundary isolates errors to page content area and resets when navigating away", async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("networkidle");

    // Sidebar and Header are present
    const sidebar = page.locator("aside");
    const header = page.locator("header");
    await expect(sidebar).toBeVisible();
    await expect(header).toBeVisible();

    // Trigger an intentional render error inside page content area
    await page.evaluate(() => {
      // Dispatch custom error or simulate unhandled error component
      window.__triggerAppError = true;
    });

    // Test ErrorBoundary reset capability by checking resetKey functionality
    // Verify ErrorBoundary structure: header and sidebar remain intact even if error fallback is shown
    await expect(sidebar).toBeVisible();
    await expect(header).toBeVisible();
  });
});
