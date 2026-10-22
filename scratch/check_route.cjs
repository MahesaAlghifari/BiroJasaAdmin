const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000/login');
  console.log('Login page loaded');
  await page.fill('input[type="email"]', 'admin@birojasa.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log('After login URL:', page.url());
  
  // Navigate to data penjualan
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld');
  await page.waitForTimeout(2000);
  console.log('Mutasi LD URL:', page.url());
  
  const buttons = await page.$$eval('button', btns => btns.map(b => b.innerText.trim()).filter(Boolean));
  console.log('Buttons:', buttons);
  
  const textContent = await page.innerText('body');
  console.log('Page title / text snippet:', textContent.substring(0, 300));
  
  await browser.close();
})();
