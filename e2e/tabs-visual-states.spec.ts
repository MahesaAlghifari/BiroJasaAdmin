import { test, expect, Page, Locator, Browser } from "@playwright/test";
import * as path from "path";

/**
 * Phase 8.3 — Tab ACTIVE / INACTIVE / HOVER / FOCUS-VISIBLE / DISABLED visual system.
 *
 * Asserts real computed styles in the browser (not source inspection), URL-driven
 * tab state integrity (Phase 8.1), responsive behaviour, and emulated zoom levels.
 *
 * Optional: set TAB_EVIDENCE_DIR to write evidence screenshots.
 */

const BASE_URL = "http://localhost:3000";
const DP = `${BASE_URL}/finance/data-penjualan`;
const EVIDENCE_DIR = process.env.TAB_EVIDENCE_DIR;

// Live light-theme tokens (src/styles/globals.css)
const PRIMARY = "rgb(37, 99, 235)"; // --primary #2563eb
const MUTED_FG = "rgb(100, 116, 139)"; // --muted-foreground #64748b
const FOREGROUND = "rgb(15, 23, 42)"; // --foreground #0f172a
const WHITE = "rgb(255, 255, 255)"; // --primary-foreground / white text

const DP_TABS = [
  "Mutasi LD",
  "Mutasi AS",
  "BBN",
  "Perpanjangan Pajak",
  "Lain-Lain",
  "Belum & Kurang Bayar",
  "Profit Terpending",
  "Cashback Terpending",
];

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click("button[type='submit']");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

const loginFinance = (page: Page) => login(page, "finance@birojasa.com", "finance123");
const loginSvp = (page: Page) => login(page, "svp@birojasa.com", "admin123");

async function shot(target: Page | Locator, name: string) {
  if (!EVIDENCE_DIR) return;
  await target.screenshot({ path: path.join(EVIDENCE_DIR, `${name}.png`) });
}

type TabStyle = {
  color: string;
  bg: string;
  borderColor: string;
  shadow: string;
  opacity: string;
  indicator: string;
  fontWeight: string;
  ariaSelected: string | null;
  state: string | null;
  tabIndex: number;
};

function readStyle(loc: Locator): Promise<TabStyle> {
  return loc.evaluate((el) => {
    const cs = getComputedStyle(el);
    const after = getComputedStyle(el, "::after");
    const hasIndicator = after.content !== "none" && after.content !== "normal" && after.content !== '""';
    return {
      color: cs.color,
      bg: cs.backgroundColor,
      borderColor: cs.borderTopColor,
      shadow: cs.boxShadow,
      opacity: cs.opacity,
      indicator: hasIndicator ? after.opacity : "0",
      fontWeight: cs.fontWeight,
      ariaSelected: el.getAttribute("aria-selected"),
      state: el.getAttribute("data-state"),
      tabIndex: (el as HTMLElement).tabIndex,
    };
  });
}

const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });

/** Waits for colour/opacity transitions to settle on the given tab. */
async function settledStyle(loc: Locator, predicate: (s: TabStyle) => boolean): Promise<TabStyle> {
  let last!: TabStyle;
  await expect
    .poll(async () => {
      last = await readStyle(loc);
      return predicate(last);
    }, { timeout: 3000 })
    .toBe(true);
  return last;
}

/** Geometry checks for a tab list: clipping, overlap, container overflow. */
async function measureTabList(page: Page) {
  return page.getByRole("tablist").first().evaluate((list) => {
    const triggers = Array.from(list.querySelectorAll<HTMLElement>("[role='tab']"));
    const rects = triggers.map((t) => t.getBoundingClientRect());
    const clipped = triggers
      .filter((t) => t.offsetParent !== null && t.scrollWidth > t.clientWidth + 1)
      .map((t) => t.textContent?.trim());
    const overlaps: string[] = [];
    for (let i = 1; i < rects.length; i++) {
      const sameRow = Math.abs(rects[i].top - rects[i - 1].top) < 2;
      if (sameRow && rects[i].left < rects[i - 1].right - 0.5) {
        overlaps.push(`${triggers[i - 1].textContent?.trim()} | ${triggers[i].textContent?.trim()}`);
      }
    }
    // The nearest scrolling ancestor is the intended horizontal-scroll host for tabs.
    let host: HTMLElement | null = list.parentElement;
    while (host && host !== document.body) {
      const ox = getComputedStyle(host).overflowX;
      if (ox === "auto" || ox === "scroll" || ox === "hidden") break;
      host = host.parentElement;
    }
    const hostRect = (host ?? list).getBoundingClientRect();
    const active = list.querySelector<HTMLElement>("[role='tab'][data-state='active']");
    const activeAfter = active ? getComputedStyle(active, "::after") : null;
    const hasActiveIndicator = activeAfter && activeAfter.content !== "none" && activeAfter.content !== "normal" && activeAfter.content !== '""';
    return {
      count: triggers.length,
      clipped,
      overlaps,
      hostRight: hostRect.right,
      viewport: window.innerWidth,
      docOverflowPx: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
      listScrolls: (host?.scrollWidth ?? 0) > (host?.clientWidth ?? 0) + 1,
      activeIndicator: active ? (hasActiveIndicator ? activeAfter.opacity : "0") : null,
      activeHeight: active ? active.getBoundingClientRect().height : 0,
    };
  });
}

test.describe("Phase 8.3: Tab visual-state system", () => {
  test.describe.configure({ mode: "serial" });

  test("1. Data Penjualan: default tab, active vs inactive computed styles", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginFinance(page);
    await page.goto(DP);
    await page.waitForURL("**/finance/data-penjualan/mutasi-ld");

    const active = tab(page, "Mutasi LD");
    const inactive = tab(page, "Mutasi AS");

    const a = await settledStyle(active, (s) => s.bg === PRIMARY);
    const i = await readStyle(inactive);

    // Semantics
    expect(a.ariaSelected).toBe("true");
    expect(a.state).toBe("active");
    expect(i.ariaSelected).toBe("false");
    expect(i.state).toBe("inactive");
    // Roving focus (Radix): before any trigger is focused, the tablist itself is the
    // single tab stop and forwards focus to the active trigger; triggers stay -1.
    const listTabIndex = await page.getByRole("tablist").evaluate((el) => (el as HTMLElement).tabIndex);
    expect(listTabIndex === 0 || a.tabIndex === 0).toBe(true);
    expect(i.tabIndex).toBe(-1);

    // ACTIVE: solid blue background, white text, shadow, no bottom indicator
    expect(a.color).toBe(WHITE);
    expect(a.bg).toBe(PRIMARY);
    expect(a.shadow).not.toBe("none");
    expect(a.indicator).toBe("0");

    // INACTIVE: muted text at FULL opacity (interactive, not disabled), no indicator
    expect(i.color).toBe(MUTED_FG);
    expect(i.opacity).toBe("1");
    expect(i.indicator).toBe("0");
    expect(i.shadow).toBe("none");

    // Non-colour cues differ (surface/border/shadow/indicator), weight constant (no jitter)
    expect(a.bg).not.toBe(i.bg);
    expect(a.fontWeight).toBe(i.fontWeight);

    await shot(page.getByRole("tablist"), "dp-1440-default-active");
  });

  test("2. Data Penjualan: hover communicates interactivity but never looks selected", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginFinance(page);
    await page.goto(`${DP}/mutasi-ld`);

    const inactive = tab(page, "BBN");
    const before = await readStyle(inactive);
    await inactive.hover();
    const hovered = await settledStyle(inactive, (s) => s.color === FOREGROUND);

    expect(hovered.color).toBe(FOREGROUND); // stronger than resting inactive
    expect(hovered.bg).not.toBe(before.bg); // subtle tint
    expect(hovered.indicator).toBe("0"); // no active indicator
    expect(hovered.shadow).toBe("none"); // no active elevation
    expect(hovered.color).not.toBe(PRIMARY); // never adopts the active accent
    expect(hovered.ariaSelected).toBe("false");
    await shot(page.getByRole("tablist"), "dp-1440-hover-inactive");

    // Hovering the active tab keeps it in the active treatment
    const active = tab(page, "Mutasi LD");
    await active.hover();
    const activeHovered = await settledStyle(active, (s) => s.bg === PRIMARY);
    expect(activeHovered.color).toBe(WHITE);
    expect(activeHovered.bg).toBe(PRIMARY);
  });

  test("3. Routing integrity: click → URL, refresh, deep link, Back/Forward", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginFinance(page);
    await page.goto(`${DP}/mutasi-ld`);

    // Click → URL changes → visual active state follows
    await tab(page, "Perpanjangan Pajak").click();
    await expect(page).toHaveURL(`${DP}/perpanjangan-pajak`);
    await settledStyle(tab(page, "Perpanjangan Pajak"), (s) => s.color === WHITE && s.bg === PRIMARY);
    await settledStyle(tab(page, "Mutasi LD"), (s) => s.color === MUTED_FG && s.bg !== PRIMARY);

    await tab(page, "Profit Terpending").click();
    await expect(page).toHaveURL(`${DP}/profit-terpending`);

    // Refresh preserves selection
    await page.reload();
    await expect(page).toHaveURL(`${DP}/profit-terpending`);
    await expect(tab(page, "Profit Terpending")).toHaveAttribute("aria-selected", "true");
    await settledStyle(tab(page, "Profit Terpending"), (s) => s.color === WHITE && s.bg === PRIMARY);

    // Back / Forward: at EVERY history step the selected tab must match the URL slug.
    // NOTE (pre-existing, Phase 8.1): a mouse click pushes the same URL twice (Radix fires
    // onValueChange on mousedown and on focus; handleTabChange navigates unconditionally),
    // so consecutive duplicate entries are expected and recorded, not hidden.
    const SLUG_LABEL: Record<string, string> = {
      "mutasi-ld": "Mutasi LD",
      "perpanjangan-pajak": "Perpanjangan Pajak",
      "profit-terpending": "Profit Terpending",
    };
    const assertTabMatchesUrl = async () => {
      const slug = new URL(page.url()).pathname.split("/").pop()!;
      const label = SLUG_LABEL[slug];
      expect(label, `unexpected slug ${slug}`).toBeTruthy();
      await expect(tab(page, label)).toHaveAttribute("aria-selected", "true");
      await expect(page.locator("[role='tab'][aria-selected='true']")).toHaveCount(1);
      await settledStyle(tab(page, label), (s) => s.color === WHITE && s.bg === PRIMARY);
      return slug;
    };
    const dedupe = (xs: string[]) => xs.filter((x, i) => i === 0 || x !== xs[i - 1]);

    const backSeq: string[] = [await assertTabMatchesUrl()];
    while (backSeq[backSeq.length - 1] !== "mutasi-ld" || dedupe(backSeq).length < 3) {
      await page.goBack();
      await page.waitForTimeout(200);
      backSeq.push(await assertTabMatchesUrl());
      if (backSeq.length > 8) break;
    }
    expect(dedupe(backSeq)).toEqual(["profit-terpending", "perpanjangan-pajak", "mutasi-ld"]);

    const fwdSeq: string[] = [backSeq[backSeq.length - 1]];
    while (fwdSeq[fwdSeq.length - 1] !== "perpanjangan-pajak") {
      await page.goForward();
      await page.waitForTimeout(200);
      fwdSeq.push(await assertTabMatchesUrl());
      if (fwdSeq.length > 8) break;
    }
    expect(dedupe(fwdSeq)).toEqual(["mutasi-ld", "perpanjangan-pajak"]);
    test.info().annotations.push({
      type: "history-traversal",
      description: `back=${JSON.stringify(backSeq)} forward=${JSON.stringify(fwdSeq)}`,
    });

    // Direct deep link selects the correct tab (fresh navigation)
    await page.goto(`${DP}/cashback-terpending`);
    await expect(tab(page, "Cashback Terpending")).toHaveAttribute("aria-selected", "true");
    await settledStyle(tab(page, "Cashback Terpending"), (s) => s.color === WHITE && s.bg === PRIMARY);
    // Exactly one selected tab
    await expect(page.locator("[role='tab'][aria-selected='true']")).toHaveCount(1);
  });

  test("4. Keyboard navigation and focus-visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginFinance(page);
    await page.goto(`${DP}/mutasi-ld`);

    // Focus the active tab via keyboard Tab / Shift+Tab without triggering value change
    const focused = tab(page, "Mutasi LD");
    await focused.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(focused).toBeFocused();

    expect(await focused.evaluate((el) => el.matches(":focus-visible"))).toBe(true);
    // ring-coloured border (--ring = #2563eb), polled past the 150ms border-color transition
    const focusState = await settledStyle(focused, (s) => s.borderColor === PRIMARY);
    expect(focusState.shadow).not.toBe("none"); // 3px ring halo
    expect(focusState.bg).toBe(PRIMARY); // still reads as active while focused
    expect(focusState.color).toBe(WHITE);
    expect(focusState.indicator).toBe("0");
    await shot(page.getByRole("tablist"), "dp-1440-focus-visible-active");

    // ArrowRight activates and updates the URL to the next tab
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(`${DP}/mutasi-as`);
    await expect(tab(page, "Mutasi AS")).toHaveAttribute("aria-selected", "true");
    await settledStyle(tab(page, "Mutasi AS"), (s) => s.color === WHITE && s.bg === PRIMARY);

    // Arrow navigation on the active tab updates URL to subsequent tab
    await tab(page, "Mutasi AS").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page).toHaveURL(`${DP}/bbn`);
    await expect(tab(page, "BBN")).toHaveAttribute("aria-selected", "true");
    await settledStyle(tab(page, "BBN"), (s) => s.color === WHITE && s.bg === PRIMARY);

    // ArrowLeft navigates backward
    await tab(page, "BBN").focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page).toHaveURL(`${DP}/mutasi-as`);
    await expect(tab(page, "Mutasi AS")).toHaveAttribute("aria-selected", "true");

    // Mouse click must not trigger focus-visible ring
    await tab(page, "BBN").click();
    const mouseFv = await tab(page, "BBN").evaluate((el) => el.matches(":focus-visible"));
    expect(mouseFv).toBe(false);
  });

  test("5. Disabled treatment (synthetic — no disabled tabs exist in the app)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginSvp(page);
    await page.goto(`${BASE_URL}/settings`);
    const target = page.getByRole("tab").nth(1);
    await expect(target).toHaveAttribute("data-state", "inactive");

    const inactiveStyle = await readStyle(target);
    await target.evaluate((el) => el.setAttribute("disabled", ""));
    const disabled = await settledStyle(target, (s) => s.opacity === "0.5");
    const pe = await target.evaluate((el) => getComputedStyle(el).pointerEvents);
    await target.evaluate((el) => el.removeAttribute("disabled"));

    expect(inactiveStyle.opacity).toBe("1");
    expect(disabled.opacity).toBe("0.5"); // visibly distinct from inactive
    expect(disabled.indicator).toBe("0");
    expect(pe).toBe("none");
  });

  test("6. Dark theme keeps active/inactive distinction", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginFinance(page);
    await page.goto(`${DP}/mutasi-ld`);
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    });
    const PRIMARY_DARK = "rgb(59, 130, 246)"; // #3b82f6 from globals.css .dark
    const a = await settledStyle(tab(page, "Mutasi LD"), (s) => (s.bg === PRIMARY_DARK || s.bg === PRIMARY) && s.color === WHITE);
    const i = await readStyle(tab(page, "Mutasi AS"));
    expect(a.color).toBe(WHITE);
    expect(a.bg === PRIMARY_DARK || a.bg === PRIMARY).toBe(true);
    expect(a.color).not.toBe(i.color);
    expect(a.bg).not.toBe(i.bg);
    expect(i.indicator).toBe("0");
    expect(i.opacity).toBe("1");
    await shot(page.getByRole("tablist"), "dp-1440-dark");
  });

  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    test(`7. Responsive @ ${width}px: no clipping/overlap, tabs remain reachable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginFinance(page);
      await page.goto(`${DP}/belum-kurang-bayar`);
      await expect(tab(page, "Belum & Kurang Bayar")).toHaveAttribute("aria-selected", "true");

      const m = await measureTabList(page);
      test.info().annotations.push({ type: `viewport-${width}`, description: JSON.stringify(m) });

      expect(m.count).toBe(DP_TABS.length); // no tabs hidden/removed
      expect(m.clipped).toEqual([]);
      expect(m.overlaps).toEqual([]);
      expect(m.hostRight).toBeLessThanOrEqual(m.viewport + 1); // tab strip does not push the page
      expect(m.activeIndicator).toBe("0");

      // Every tab reachable (scroll into view) and clickable at this width
      for (const name of ["Cashback Terpending", "Mutasi LD"]) {
        await tab(page, name).scrollIntoViewIfNeeded();
        await tab(page, name).click();
        await expect(tab(page, name)).toHaveAttribute("aria-selected", "true");
      }
      await shot(page, `dp-viewport-${width}`);
    });
  }

  const ZOOMS = [25, 50, 67, 80, 90, 100, 110, 125, 150, 175, 200, 250, 300];
  test("8. Emulated browser zoom 25%–300% (1440×900 window)", async ({ browser }: { browser: Browser }) => {
    test.setTimeout(300_000);
    const results: Record<string, unknown> = {};
    for (const z of ZOOMS) {
      // Browser zoom Z% on a 1440×900 window ≡ CSS viewport (1440/Z)×(900/Z) at DPR Z/100.
      const ctx = await browser.newContext({
        viewport: { width: Math.round((1440 * 100) / z), height: Math.round((900 * 100) / z) },
        deviceScaleFactor: z / 100,
      });
      const page = await ctx.newPage();
      await loginFinance(page);
      await page.goto(`${DP}/perpanjangan-pajak`);
      await expect(tab(page, "Perpanjangan Pajak")).toHaveAttribute("aria-selected", "true");
      const m = await measureTabList(page);
      results[`${z}%`] = m;
      expect(m.count, `zoom ${z}%`).toBe(DP_TABS.length);
      expect(m.clipped, `zoom ${z}%`).toEqual([]);
      expect(m.overlaps, `zoom ${z}%`).toEqual([]);
      expect(m.hostRight, `zoom ${z}%`).toBeLessThanOrEqual(m.viewport + 1);
      expect(m.activeIndicator, `zoom ${z}%`).toBe("0");
      if ([25, 100, 200, 300].includes(z)) await shot(page, `dp-zoom-${z}`);
      await ctx.close();
    }
    test.info().annotations.push({ type: "zoom-results", description: JSON.stringify(results) });
  });

  test("9. Consistency across other tab groups (Harga Dasar, Biaya Layanan, Settings)", async ({ page }) => {
    await loginSvp(page);
    const groups = [
      { url: `${BASE_URL}/master-data/harga-dasar`, name: "harga-dasar" },
      { url: `${BASE_URL}/master-data/biaya-layanan`, name: "biaya-layanan" },
      { url: `${BASE_URL}/settings`, name: "settings" },
    ];
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const g of groups) {
        await page.goto(g.url);
        const list = page.getByRole("tablist").first();
        await expect(list).toBeVisible();
        const active = list.locator("[role='tab'][data-state='active']");
        const inactive = list.locator("[role='tab'][data-state='inactive']").first();
        const a = await settledStyle(active, (s) => s.bg === PRIMARY && s.color === WHITE);
        const i = await readStyle(inactive);
        expect(a.color, `${g.name}@${width}`).toBe(WHITE);
        expect(a.bg, `${g.name}@${width}`).toBe(PRIMARY);
        expect(a.ariaSelected).toBe("true");
        expect(i.color, `${g.name}@${width}`).toBe(MUTED_FG);
        expect(i.opacity).toBe("1");
        expect(i.indicator).toBe("0");

        const m = await measureTabList(page);
        expect(m.clipped, `${g.name}@${width}`).toEqual([]);
        expect(m.overlaps, `${g.name}@${width}`).toEqual([]);

        // Clicking an inactive tab moves the active treatment to the clicked tab
        await inactive.click();
        const nowActive = list.locator("[role='tab'][data-state='active']");
        await settledStyle(nowActive, (s) => s.color === WHITE && s.bg === PRIMARY);
        await shot(list, `${g.name}-${width}`);
      }
    }
  });
});
