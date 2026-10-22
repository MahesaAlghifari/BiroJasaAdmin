const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\mahes\\.gemini\\antigravity\\brain\\4869b8c1-4be9-45c8-ac32-b2a933495169';

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1. Mobile Messenger Workspace
  const mobileCtx = await browser.newContext({
    viewport: { width: 412, height: 915 }
  });
  const mPage = await mobileCtx.newPage();
  await mPage.goto('http://localhost:3000/login');
  await mPage.waitForLoadState('networkidle');
  await mPage.fill('input[type="email"]', 'messenger@birojasa.com');
  await mPage.fill('input[type="password"]', 'messenger123');
  await mPage.click('button[type="submit"]');
  await mPage.waitForURL('**/messenger/workspace', { timeout: 10000 });
  await mPage.waitForTimeout(2000);

  const mScreenshot = path.join(ARTIFACT_DIR, 'final_workspace_messenger_mobile_412x915.png');
  await mPage.screenshot({ path: mScreenshot, fullPage: true });
  console.log('Saved final mobile screenshot:', mScreenshot);

  // 2. Desktop Admin SUN89 Messenger Task
  const deskCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const dPage = await deskCtx.newPage();
  await dPage.goto('http://localhost:3000/login');
  await dPage.waitForLoadState('networkidle');
  await dPage.fill('input[type="email"]', 'admin@birojasa.com');
  await dPage.fill('input[type="password"]', 'admin123');
  await dPage.click('button[type="submit"]');
  await dPage.waitForURL('**/dashboard', { timeout: 10000 });
  await dPage.goto('http://localhost:3000/messenger/tasks');
  await dPage.waitForTimeout(2000);

  const dScreenshot = path.join(ARTIFACT_DIR, 'final_admin_messenger_task_desktop_1440x900.png');
  await dPage.screenshot({ path: dScreenshot, fullPage: true });
  console.log('Saved final desktop screenshot:', dScreenshot);

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
