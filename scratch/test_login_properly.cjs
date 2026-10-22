const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const artifactDir = path.resolve('C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169');

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Directly fill inputs
  await page.locator('input[type="email"]').fill('svp@birojasa.com');
  await page.locator('input[type="password"]').fill('admin123');
  await page.locator('button[type="submit"]').click();

  // Wait for navigation away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  console.log('Successfully logged in! Current URL:', page.url());

  // Navigate to /order/rekap using internal sidebar click or in-app link
  const rekapLink = page.locator('a[href="/order/rekap"], button:has-text("Rekap Order")').first();
  if (await rekapLink.isVisible()) {
    await rekapLink.click();
    console.log('Clicked Rekap Order in sidebar');
  } else {
    // If inside a menu group
    const orderGroup = page.locator('button:has-text("Order")').first();
    if (await orderGroup.isVisible()) {
      await orderGroup.click();
      await page.waitForTimeout(300);
      await page.locator('a[href="/order/rekap"], button:has-text("Rekap Order")').first().click();
    }
  }

  await page.waitForTimeout(1500);
  console.log('Now at:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'proof_rekap_order_table_actual.png') });
  console.log('✓ Captured proof_rekap_order_table_actual.png');

  // Check Clear Rekap Order button
  const clearBtn = page.locator('button:has-text("Clear Rekap Order")');
  console.log('Clear button visible:', await clearBtn.isVisible(), 'enabled:', await clearBtn.isEnabled());

  if (await clearBtn.isVisible() && await clearBtn.isEnabled()) {
    await clearBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(artifactDir, 'proof_clear_rekap_dialog.png') });
    console.log('✓ Captured proof_clear_rekap_dialog.png successfully!');
    // Click "Batal"
    await page.locator('button:has-text("Batal")').click();
    await page.waitForTimeout(500);
  }

  await browser.close();
}

test().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
