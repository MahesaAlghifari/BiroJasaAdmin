const { chromium } = require('playwright');

async function checkConsole() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'svp@birojasa.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  console.log('Navigating to mutasi-ld...');
  await page.goto('http://localhost:3000/finance/data-penjualan/mutasi-ld');
  await page.waitForTimeout(2500);

  const main = await page.locator('main, [role="main"], #root').first().innerHTML().catch(() => 'no root');
  console.log('Root HTML length:', main.length);
  if (main.length < 500) console.log('Root HTML:', main);

  await browser.close();
}

checkConsole();
