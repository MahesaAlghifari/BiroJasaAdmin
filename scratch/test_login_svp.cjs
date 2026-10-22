const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  console.log('Login page loaded');
  await page.click('div[role="button"]:has-text("Admin (SVP)")');
  await page.waitForTimeout(300);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('After login URL:', page.url());
  
  // Navigate to data penjualan
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld');
  await page.waitForTimeout(2000);
  console.log('Mutasi LD URL:', page.url());
  
  const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons:', buttons);
  
  await browser.close();
})();
