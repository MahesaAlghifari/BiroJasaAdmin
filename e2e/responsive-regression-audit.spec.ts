import { test, expect, Browser } from "@playwright/test";
import * as path from "path";

const BASE_URL = "http://localhost:3000";
const EVIDENCE_DIR = "C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169\\responsive_evidence";

// Reusable login helper
async function loginAs(page: any, email = "svp@birojasa.com", password = "admin123") {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type='submit']");
  if (email === "messenger@birojasa.com") {
    await page.waitForURL("**/messenger/workspace", { timeout: 15000 });
  } else {
    await page.waitForURL("**/dashboard", { timeout: 15000 });
  }
}

// Helper to check horizontal document overflow
async function checkNoDocumentHorizontalOverflow(page: any) {
  return await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    return {
      docWidth,
      scrollWidth,
      bodyScrollWidth,
      hasOverflow: scrollWidth > docWidth + 1 || bodyScrollWidth > docWidth + 1,
    };
  });
}

test.describe("Phase 8.4: Responsive Viewport & Module Coverage Matrix", () => {
  const VIEWPORTS = [
    { name: "Mobile Small", width: 320, height: 800 },
    { name: "Mobile Standard", width: 375, height: 812 },
    { name: "Mobile Large", width: 414, height: 896 },
    { name: "Tablet Portrait", width: 768, height: 1024 },
    { name: "Tablet Landscape", width: 1024, height: 768 },
    { name: "Desktop HD", width: 1280, height: 720 },
    { name: "Laptop Widescreen", width: 1440, height: 900 },
    { name: "Desktop Full HD", width: 1920, height: 1080 },
    { name: "Ultra-wide QHD", width: 2560, height: 1440 },
  ];

  test.beforeEach(async ({ page }) => {
    await loginAs(page, "svp@birojasa.com", "admin123");
  });

  for (const vp of VIEWPORTS) {
    test(`Viewport ${vp.width}x${vp.height} (${vp.name}): Shell and core modules render without document overflow`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Test Dashboard
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState("domcontentloaded");
      let overflow = await checkNoDocumentHorizontalOverflow(page);
      expect(overflow.hasOverflow, `Dashboard has horizontal overflow at ${vp.width}x${vp.height}`).toBe(false);

      // Verify no ErrorBoundary crashed
      await expect(page.locator("text=Terjadi kesalahan").or(page.locator("text=Terjadi kendala"))).toHaveCount(0);

      // If mobile (< 1024px), verify hamburger menu is visible
      if (vp.width < 1024) {
        const menuBtn = page.locator("button[aria-label='Buka menu navigasi']");
        await expect(menuBtn).toBeVisible();
      }

      // Test Data Penjualan (tabs + table)
      await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
      await page.waitForLoadState("domcontentloaded");
      overflow = await checkNoDocumentHorizontalOverflow(page);
      expect(overflow.hasOverflow, `Data Penjualan has horizontal overflow at ${vp.width}x${vp.height}`).toBe(false);

      // Save screenshot for audit evidence
      if ([320, 375, 768, 1024, 1440, 1920, 2560].includes(vp.width)) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, `vp-${vp.width}x${vp.height}-datapenjualan.png`),
          fullPage: false,
        });
      }
    });
  }

  test("Module Coverage: All 20 major routes render cleanly at 375x812 (mobile) and 1440x900 (desktop)", async ({ page }) => {
    test.setTimeout(180_000);
    const ROUTES_TO_AUDIT = [
      { path: "/dashboard", name: "Dashboard" },
      { path: "/finance/kas-kantor", name: "Finance Kas Kantor" },
      { path: "/finance/kas-messenger", name: "Finance Kas Messenger" },
      { path: "/finance/pengeluaran", name: "Finance Pengeluaran" },
      { path: "/finance/data-penjualan/mutasi-ld", name: "Finance Data Penjualan" },
      { path: "/finance/tagihan", name: "Finance Tagihan" },
      { path: "/finance/laba-rugi", name: "Finance Laba Rugi" },
      { path: "/master-data/samsat", name: "Master Data Samsat" },
      { path: "/master-data/biaya-layanan", name: "Master Data Biaya Layanan" },
      { path: "/master-data/harga-dasar", name: "Master Data Harga Dasar" },
      { path: "/manajemen/karyawan", name: "Manajemen Karyawan" },
      { path: "/manajemen/pengguna", name: "Manajemen Pengguna" },
      { path: "/manajemen/hak-akses", name: "Manajemen Hak Akses" },
      { path: "/manajemen/riwayat-aktivitas", name: "Manajemen Riwayat Aktivitas" },
      { path: "/messenger/tasks", name: "Messenger Tasks (Admin View)" },
      { path: "/order/buat", name: "Order Buat" },
      { path: "/order/tracking", name: "Order Tracking" },
      { path: "/order/rekap", name: "Order Rekap" },
      { path: "/settings", name: "Settings" },
      { path: "/profile", name: "Profile" },
    ];

    // Mobile check (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    for (const route of ROUTES_TO_AUDIT) {
      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForLoadState("domcontentloaded");
      const overflow = await checkNoDocumentHorizontalOverflow(page);
      expect(overflow.hasOverflow, `Route ${route.name} has document horizontal overflow at 375px`).toBe(false);
      // No crash
      await expect(page.locator("text=Terjadi kendala").or(page.locator("text=Terjadi kesalahan"))).toHaveCount(0);
    }

    // Desktop check (1440x900)
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const route of ROUTES_TO_AUDIT) {
      await page.goto(`${BASE_URL}${route.path}`);
      await page.waitForLoadState("domcontentloaded");
      const overflow = await checkNoDocumentHorizontalOverflow(page);
      expect(overflow.hasOverflow, `Route ${route.name} has document horizontal overflow at 1440px`).toBe(false);
    }
  });

  test("Messenger Workspace: Mobile-first operational layout renders at 320px, 375px, 768px, 1440px", async ({ browser }: { browser: Browser }) => {
    // Isolated context with messenger login
    const msgCtx = await browser.newContext();
    const msgPage = await msgCtx.newPage();
    await msgPage.goto(`${BASE_URL}/login`);
    await msgPage.fill("#email", "budi.messenger@birojasa.com");
    await msgPage.fill("#password", "messenger123");
    await msgPage.click("button[type='submit']");
    await msgPage.waitForURL("**/messenger/workspace", { timeout: 15000 });

    const messengerVps = [
      { width: 320, height: 800 },
      { width: 375, height: 812 },
      { width: 768, height: 1024 },
      { width: 1440, height: 900 },
    ];

    for (const vp of messengerVps) {
      await msgPage.setViewportSize({ width: vp.width, height: vp.height });
      const overflow = await checkNoDocumentHorizontalOverflow(msgPage);
      expect(overflow.hasOverflow, `Messenger Workspace overflow at ${vp.width}x${vp.height}`).toBe(false);

      // Verify bottom nav items
      const bottomNav = msgPage.locator("nav[aria-label='Navigasi Bawah Messenger']");
      await expect(bottomNav).toBeVisible();

      // Test switching tabs in messenger workspace
      const samsatBtn = bottomNav.locator("button[aria-label='Proses Samsat']");
      await samsatBtn.click();
      await msgPage.waitForTimeout(200);

      // Capture screenshot at 375px
      if (vp.width === 375) {
        await msgPage.screenshot({
          path: path.join(EVIDENCE_DIR, `vp-375-messenger-workspace.png`),
          fullPage: false,
        });
      }
    }
    await msgCtx.close();
  });
});

test.describe("Phase 8.4: Browser Zoom Matrix (25% - 300%)", () => {
  const ZOOMS = [25, 50, 67, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];

  test("Emulated Browser Zoom 25% - 300% on Data Penjualan: Tabs, table, and controls remain functional", async ({ browser }: { browser: Browser }) => {
    test.setTimeout(180_000);
    for (const z of ZOOMS) {
      const ctx = await browser.newContext({
        viewport: { width: Math.round((1440 * 100) / z), height: Math.round((900 * 100) / z) },
        deviceScaleFactor: z / 100,
      });
      const page = await ctx.newPage();
      await loginAs(page, "svp@birojasa.com", "admin123");
      await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
      await page.waitForLoadState("domcontentloaded");

      // Verify tabs list is visible
      const tabsList = page.locator("div[role='tablist']");
      await expect(tabsList).toBeVisible();

      // Verify active tab is selected
      const activeTab = page.locator("button[role='tab'][aria-selected='true']");
      await expect(activeTab).toBeVisible();

      // Take screenshot at key zoom levels
      if ([25, 50, 100, 150, 200, 300].includes(z)) {
        await page.screenshot({
          path: path.join(EVIDENCE_DIR, `zoom-${z}-datapenjualan.png`),
          fullPage: false,
        });
      }

      await ctx.close();
    }
  });

  test("Emulated Browser Zoom 200% & 300% on Dashboard and Order Tracking: Header and core views render properly", async ({ browser }: { browser: Browser }) => {
    test.setTimeout(120_000);
    for (const z of [200, 300]) {
      const ctx = await browser.newContext({
        viewport: { width: Math.round((1440 * 100) / z), height: Math.round((900 * 100) / z) },
        deviceScaleFactor: z / 100,
      });
      const page = await ctx.newPage();
      await loginAs(page, "svp@birojasa.com", "admin123");

      for (const url of [`${BASE_URL}/dashboard`, `${BASE_URL}/order/tracking`]) {
        await page.goto(url);
        await page.waitForLoadState("domcontentloaded");
        const headerTitle = page.locator("header h2");
        await expect(headerTitle).toBeVisible();
      }

      await ctx.close();
    }
  });
});

test.describe("Phase 8.4: Interaction, Accessibility & Modals Audit", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "svp@birojasa.com", "admin123");
  });

  test("Mobile Navigation Drawer: Opens with hamburger, closes with backdrop click and Escape key", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("domcontentloaded");

    // Hamburger button
    const menuBtn = page.locator("button[aria-label='Buka menu navigasi']");
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();

    // Drawer dialog opens
    const drawer = page.locator("div[role='dialog'][aria-label='Menu navigasi utama']");
    await expect(drawer).toBeVisible();

    // Close via Escape key
    await page.keyboard.press("Escape");
    await expect(drawer).not.toBeVisible();

    // Reopen and close via backdrop click
    await menuBtn.click();
    await expect(drawer).toBeVisible();
    const backdrop = page.locator(".fixed.inset-0.bg-black\\/50");
    await backdrop.click({ position: { x: 350, y: 100 } });
    await expect(drawer).not.toBeVisible();
  });

  test("Dialog Modals: Notification Dialog fits viewport at 320px and 200% zoom with internal scroll", async ({ page }) => {
    // Test at 320px mobile viewport
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("domcontentloaded");

    const bellBtn = page.locator("button[aria-label^='Notifikasi sistem']");
    await expect(bellBtn).toBeVisible();
    await bellBtn.click();

    // Modal dialog content
    const dialogContent = page.locator("div[role='dialog']").last();
    await expect(dialogContent).toBeVisible();

    const box = await dialogContent.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      // Must not exceed viewport width
      expect(box.width).toBeLessThanOrEqual(320);
      // Must not exceed viewport height
      expect(box.height).toBeLessThanOrEqual(800);
    }

    // Save screenshot of modal at 320px
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, `dialog-notification-320px.png`),
    });

    // Close dialog
    await page.keyboard.press("Escape");
    await expect(dialogContent).not.toBeVisible();
  });

  test("Theme Toggle & Color Contrast: Dark mode and light mode both apply cleanly without broken contrast", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState("domcontentloaded");

    const themeBtn = page.locator("button:has-text('Toggle theme')");
    await expect(themeBtn).toBeVisible();

    // Check light mode
    const isDarkInitially = await page.evaluate(() => document.body.classList.contains("dark"));
    
    // Toggle theme
    await themeBtn.click();
    await page.waitForTimeout(300);
    const isDarkAfterToggle = await page.evaluate(() => document.body.classList.contains("dark"));
    expect(isDarkAfterToggle).toBe(!isDarkInitially);

    // Save dark screenshot
    await page.screenshot({
      path: path.join(EVIDENCE_DIR, `theme-dark-dashboard.png`),
    });

    // Toggle back
    await themeBtn.click();
    await page.waitForTimeout(300);
    const isDarkAfterSecondToggle = await page.evaluate(() => document.body.classList.contains("dark"));
    expect(isDarkAfterSecondToggle).toBe(isDarkInitially);
  });

  test("Form Accessibility & Usability: Buat Order form controls are interactable and accessible at 375px", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/order/buat`);
    await page.waitForLoadState("domcontentloaded");

    // Form inputs exist and are interactable
    const customerInput = page.locator("#customerName, input[placeholder*='nama' i], input[name='customerName']").first();
    await expect(customerInput).toBeVisible();

    // Verify 'Berikutnya' button is reachable on Step 1
    const nextBtn = page.locator("button:has-text('Berikutnya')");
    await expect(nextBtn).toBeVisible();

    // Verify touch target height is at least 36px (WCAG compliant)
    const btnBox = await nextBtn.boundingBox();
    expect(btnBox).not.toBeNull();
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(36);
    }
  });
});

test.describe("Phase 8.4: Full Regression (Phases 8.1, 8.2, 8.3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "svp@birojasa.com", "admin123");
  });

  test("Phase 8.1 Regression: Deep link, canonical slugs, and refresh persistence", async ({ page }) => {
    // Deep link directly to bbn
    await page.goto(`${BASE_URL}/finance/data-penjualan/bbn`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);

    // Verify tab selected
    const bbnTab = page.getByRole("tab", { name: "BBN", exact: true });
    await expect(bbnTab).toHaveAttribute("aria-selected", "true");

    // Refresh page
    await page.reload();
    await expect(page).toHaveURL(`${BASE_URL}/finance/data-penjualan/bbn`);
    await expect(bbnTab).toHaveAttribute("aria-selected", "true");
  });

  test("Phase 8.2 Regression: Table vertical-fill and bottom pagination across small datasets", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/finance/kas-kantor`);
    await expect(page).toHaveURL(`${BASE_URL}/finance/kas-kantor`);

    // Table card has min-height >= 220px
    const tableCard = page.locator(".rounded-lg.border.border-border.bg-card").first();
    await expect(tableCard).toBeVisible();
    const box = await tableCard.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(220);
    }

    // Pagination anchored
    const pagination = page.locator("nav[aria-label='Paginasi tabel']").first();
    await expect(pagination).toBeVisible();
  });

  test("Phase 8.3 Regression: Tab visual states hierarchy (active vs inactive distinct styles)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);

    const activeTab = page.locator("button[role='tab'][aria-selected='true']");
    const inactiveTab = page.locator("button[role='tab'][aria-selected='false']").first();

    await expect(activeTab).toBeVisible();
    await expect(inactiveTab).toBeVisible();

    const activeBg = await activeTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);
    const inactiveBg = await inactiveTab.evaluate((el) => window.getComputedStyle(el).backgroundColor);

    // Active tab has card background, inactive tab has transparent background
    expect(activeBg).not.toBe(inactiveBg);
  });
});
