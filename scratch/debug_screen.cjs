const { chromium } = require('playwright');
const path = require('path');

async function debugScreen() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const artifactDir = path.resolve('C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169');

  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.locator('[aria-label="Pilih akun demo Admin SVP"]').click();
  await page.click('button:has-text("Masuk ke Sistem")');
  await page.waitForTimeout(2000);

  console.log('After login, current URL is:', page.url());
  await page.goto('http://localhost:3000/order/rekap', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);

  console.log('At rekap, current URL is:', page.url());
  await page.screenshot({ path: path.join(artifactDir, 'debug_rekap_actual.png') });
  console.log('Saved debug_rekap_actual.png');

  const text = await page.evaluate(() => document.body.innerText.substring(0, 1000));
  console.log('Rekap page text start:\n', text);

  await browser.close();
}

debugScreen();
