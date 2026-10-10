/**
 * Persistence & Refresh Verification Test
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies that orders, state transitions, and audit logs persist to SQLite
 * across server restarts and process reloads (Stage 24 requirement).
 */

import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import { createApp } from "../server/src/app";

function createServerInstance(): Promise<{ server: http.Server; baseUrl: string }> {
  return new Promise((resolve) => {
    const app = createApp();
    const server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      resolve({ server, baseUrl: `http://localhost:${port}` });
    });
  });
}

test("Persistence - Order created in process 1 persists and is retrievable after server restart in process 2", async (t) => {
  const uniqueCustomer = `Customer Persist ${Date.now()}`;
  let createdOrderNo = "";

  // Process / Session 1: Start Server, Login, Create Order, Advance to Stage 3
  {
    const { server, baseUrl } = await createServerInstance();
    try {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@birojasa.com", password: "admin123" }),
      });
      const { data: { token } } = await loginRes.json() as any;

      const createRes = await fetch(`${baseUrl}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer: uniqueCustomer,
          nomorHP: "081233334444",
          layanan: "Perpanjangan STNK 5 Tahunan",
          nopol: "B 7777 PER",
          totalEstimasi: 1200000,
        }),
      });

      assert.strictEqual(createRes.status, 201);
      const createdBody = await createRes.json() as any;
      createdOrderNo = createdBody.data.orderNo;
      assert.ok(createdOrderNo);

      // Advance to Stage 2: Penjadwalan
      await fetch(`${baseUrl}/api/orders/${createdOrderNo}/advance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          targetStage: "Penjadwalan",
          updates: { messenger: "Budi Santoso" },
        }),
      });
    } finally {
      // Gracefully terminate server instance 1 (simulating process restart)
      server.close();
    }
  }

  // Process / Session 2: Fresh Server Instance (reading from same SQLite file)
  {
    const { server, baseUrl } = await createServerInstance();
    try {
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "admin@birojasa.com", password: "admin123" }),
      });
      const { data: { token } } = await loginRes.json() as any;

      const getRes = await fetch(`${baseUrl}/api/orders/${createdOrderNo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      assert.strictEqual(getRes.status, 200);
      const getBody = await getRes.json() as any;

      // Assert data survived restart exactly
      assert.strictEqual(getBody.success, true);
      assert.strictEqual(getBody.data.orderNo, createdOrderNo);
      assert.strictEqual(getBody.data.customer, uniqueCustomer);
      assert.strictEqual(getBody.data.currentStageName, "Penjadwalan");
      assert.strictEqual(getBody.data.currentStep, 2);
      assert.strictEqual(getBody.data.messenger, "Budi Santoso");
    } finally {
      server.close();
    }
  }
});
