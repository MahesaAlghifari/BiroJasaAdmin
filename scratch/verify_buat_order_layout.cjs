const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function getAuthSession() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'svp@birojasa.com', password: 'admin123' }),
  });
  const data = await res.json();
  if (!data.success) {
    throw new Error('Failed to login: ' + JSON.stringify(data));
  }
  return {
    token: data.data.token,
    user: data.data.user,
  };
}

async function run(prefix = 'before') {
  console.log('Authenticating with backend...');
  const { token, user } = await getAuthSession();

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: 'desktop_1600x900', width: 1600, height: 900 },
    { name: 'desktop_1440x900', width: 1440, height: 900 },
    { name: 'desktop_1280x800', width: 1280, height: 800 },
    { name: 'tablet_768x1024', width: 768, height: 1024 },
    { name: 'mobile_375x667', width: 375, height: 667 },
  ];

  for (const vp of viewports) {
    console.log(`\n=== Testing Viewport: ${vp.name} (${vp.width}x${vp.height}) ===`);
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });

    await context.addInitScript(
      ({ token, user }) => {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('auth_user', JSON.stringify(user));
      },
      { token, user }
    );

    const page = await context.newPage();

    console.log(`Navigating to /order/buat at ${vp.name}...`);
    await page.goto('http://localhost:3000/order/buat', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForSelector('#input-customer', { timeout: 15000 });
    await page.waitForTimeout(600);

    // Get dimensions of main content and buat order container
    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main');
      const pageShell = document.querySelector('.page-shell');
      const buatOrderRoot = pageShell ? pageShell.firstElementChild : null;
      const stepper = document.querySelector('[aria-current="step"]')?.closest('.grid');
      const card = document.querySelector('form')?.closest('.bg-card') || document.querySelector('form');

      return {
        viewportWidth: window.innerWidth,
        mainWidth: main?.getBoundingClientRect().width,
        pageShellWidth: pageShell?.getBoundingClientRect().width,
        pageShellPaddingLeft: pageShell ? window.getComputedStyle(pageShell).paddingLeft : null,
        pageShellPaddingRight: pageShell ? window.getComputedStyle(pageShell).paddingRight : null,
        buatOrderRootWidth: buatOrderRoot?.getBoundingClientRect().width,
        buatOrderRootClasses: buatOrderRoot?.className,
        cardWidth: card?.getBoundingClientRect().width,
        stepperWidth: stepper?.getBoundingClientRect().width,
        scrollWidth: document.documentElement.scrollWidth,
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    console.log('Metrics:', JSON.stringify(metrics, null, 2));

    const shotPath = path.join(ARTIFACT_DIR, `buat_order_${prefix}_${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`Screenshot saved: ${shotPath}`);

    if (vp.name === 'desktop_1440x900' && prefix === 'after') {
      console.log('Testing Step 2 & 3 navigation on 1440x900...');
      // Fill minimal required fields to proceed to Step 2
      await page.fill('#input-customer', 'PT Berkah Sentosa Abadi');
      await page.fill('#input-nomorHP', '081298765432');
      await page.fill('#input-plateNumber', '5432');
      await page.fill('#input-pkbBerlakuSd', '2026-12-31');

      // Select layanan
      const layananTrigger = page.locator('#field-layanan button').first();
      await layananTrigger.click();
      await page.waitForTimeout(300);
      const firstLayanan = page.locator('[role="option"]').first();
      await firstLayanan.click();
      await page.waitForTimeout(300);

      // Select "Datang Langsung" to skip pickup address validation
      await page.click('text="Datang Langsung"');
      await page.waitForTimeout(300);

      // Click "Berikutnya"
      const nextBtn1 = page.locator('button:has-text("Berikutnya")').first();
      await nextBtn1.click();
      await page.waitForTimeout(600);

      // Verify we are on Step 2
      const shotStep2 = path.join(ARTIFACT_DIR, 'buat_order_after_step2_desktop_1440x900.png');
      await page.screenshot({ path: shotStep2, fullPage: false });
      console.log(`Step 2 Screenshot saved: ${shotStep2}`);

      // Click "Berikutnya" to Step 3
      const nextBtn2 = page.locator('button:has-text("Berikutnya")').first();
      await nextBtn2.click();
      await page.waitForTimeout(600);

      // Verify we are on Step 3
      const shotStep3 = path.join(ARTIFACT_DIR, 'buat_order_after_step3_desktop_1440x900.png');
      await page.screenshot({ path: shotStep3, fullPage: false });
      console.log(`Step 3 Screenshot saved: ${shotStep3}`);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDone capturing!');
}

const prefixArg = process.argv[2] || 'before';
run(prefixArg).catch((err) => {
  console.error(err);
  process.exit(1);
});
