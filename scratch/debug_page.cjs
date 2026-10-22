const { chromium } = require('playwright');
const path = require('path');

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  console.log('Title:', await page.title());
  console.log('URL:', page.url());

  // Check buttons or texts on the page
  const text = await page.evaluate(() => document.body.innerText.substring(0, 500));
  console.log('Body start:\n', text);

  await browser.close();
}

test();
