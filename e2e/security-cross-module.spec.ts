import { test, expect } from "@playwright/test";

test.describe("E2E Tests 8, 11, 12: Security Enforcement & Cross-Module Synchronization", () => {
  test("E2E Test 8: Cross-Module Payment Synchronization across Finance and Order", async ({ page }) => {
    // 1. Login as Finance user (authorized for invoices & payments)
    await page.goto("http://localhost:3000");
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    const loginPromise = page.waitForResponse(r => r.url().includes("/api/auth/login") && r.status() === 200);
    await page.click("button[type='submit']");
    await loginPromise;
    await page.waitForTimeout(500);

    // Retrieve token
    const token = await page.evaluate(() => window.localStorage.getItem("auth_token"));
    expect(token).toBeTruthy();

    // 2. Query initial invoice & linked order via API
    const invRes = await page.request.get("http://localhost:3001/api/finance/invoices", {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(invRes.ok()).toBeTruthy();
    const invoices = (await invRes.json()).data;
    expect(invoices.length).toBeGreaterThan(0);

    // Pick an invoice with linked order
    const targetInvoice = invoices.find((inv: any) => inv.orderNo);
    expect(targetInvoice).toBeTruthy();

    // 3. Record payment on target invoice
    const payRes = await page.request.post(`http://localhost:3001/api/finance/invoices/${targetInvoice.id}/pay`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: { amount: targetInvoice.sisa > 0 ? targetInvoice.sisa : 50000, metode: "Transfer Bank" },
    });
    expect(payRes.ok()).toBeTruthy();

    // 4. Verify linked order updated atomically in SQLite
    const orderRes = await page.request.get(`http://localhost:3001/api/orders/${targetInvoice.orderNo}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(orderRes.ok()).toBeTruthy();
    const orderData = (await orderRes.json()).data;
    expect(orderData.payment.dibayar).toBeGreaterThan(0);
  });

  test("E2E Test 11: Role Security Matrix strictly enforced by Express server", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Messenger token
    await page.goto("http://localhost:3000");
    await page.fill("#email", "budi.messenger@birojasa.com");
    await page.fill("#password", "messenger123");
    const msgLoginPromise = page.waitForResponse(r => r.url().includes("/api/auth/login") && r.status() === 200);
    await page.click("button[type='submit']");
    await msgLoginPromise;
    await page.waitForTimeout(500);
    const messengerToken = await page.evaluate(() => window.localStorage.getItem("auth_token"));
    expect(messengerToken).toBeTruthy();

    // Messenger attempting back-office order creation -> 403 Forbidden
    const msgOrderRes = await page.request.post("http://localhost:3001/api/orders", {
      headers: {
        Authorization: `Bearer ${messengerToken}`,
      },
      data: { customer: "Illegal", nomorHP: "081234567890", layanan: "Pajak", nopol: "B 123 ILL" },
    });
    expect(msgOrderRes.status()).toBe(403);

    // 2. Finance token
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("http://localhost:3000");
    await page.fill("#email", "finance@birojasa.com");
    await page.fill("#password", "finance123");
    const finLoginPromise = page.waitForResponse(r => r.url().includes("/api/auth/login") && r.status() === 200);
    await page.click("button[type='submit']");
    await finLoginPromise;
    await page.waitForTimeout(500);
    const financeToken = await page.evaluate(() => window.localStorage.getItem("auth_token"));
    expect(financeToken).toBeTruthy();

    // Finance attempting operational stage advance (Stage 2 Penjadwalan) -> 403 Forbidden
    const finAdvanceRes = await page.request.post("http://localhost:3001/api/orders/ORD-0101/advance", {
      headers: {
        Authorization: `Bearer ${financeToken}`,
      },
      data: { targetStage: "Penjadwalan", updates: {} },
    });
    expect(finAdvanceRes.status()).toBe(403);

    // 3. Admin token
    await page.evaluate(() => window.localStorage.clear());
    await page.goto("http://localhost:3000");
    await page.fill("#email", "admin@birojasa.com");
    await page.fill("#password", "admin123");
    const admLoginPromise = page.waitForResponse(r => r.url().includes("/api/auth/login") && r.status() === 200);
    await page.click("button[type='submit']");
    await admLoginPromise;
    await page.waitForTimeout(500);
    const adminToken = await page.evaluate(() => window.localStorage.getItem("auth_token"));
    expect(adminToken).toBeTruthy();

    // Admin attempting Stage 6 Supervisi -> 403 Forbidden (SVP only)
    const adminSupervisiRes = await page.request.post("http://localhost:3001/api/orders/ORD-0101/advance", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
      data: { targetStage: "Supervisi", updates: {} },
    });
    expect(adminSupervisiRes.status()).toBe(403);
  });

  test("E2E Test 12: Security Headers and CORS Policy enforced on Browser Requests", async ({ page }) => {
    // Query health endpoint from browser context
    const response = await page.request.get("http://localhost:3001/api/health", {
      headers: { Origin: "http://localhost:3000" }
    });
    expect(response.status()).toBe(200);

    const headers = response.headers();
    // Security headers verified in actual HTTP response
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-powered-by"]).toBeUndefined();

    // CORS headers
    expect(headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(headers["access-control-allow-credentials"]).toBe("true");
  });
});
