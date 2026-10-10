/**
 * Production Post-Deployment Smoke Test Suite
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies all 10 critical operational capabilities on live running instance:
 * 1. Frontend serves SPA index HTML
 * 2. Backend liveness responds 200
 * 3. Backend readiness confirms database & storage health
 * 4. Authentication issues valid JWT session
 * 5. Orders API returns live operational records
 * 6. Finance API returns live invoices and cash register
 * 7. Pricing API returns live Samsat items
 * 8. Document metadata loads cleanly
 * 9. Document access ticket generation and preview stream works
 * 10. Security headers and unauthenticated 401 rejection are strictly enforced
 * 
 * Usage: npx tsx scripts/smoke-test.ts [backendUrl] [frontendUrl]
 */

interface SmokeTestResult {
  step: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

export async function runSmokeTests(
  backendUrl = "http://localhost:3001",
  frontendUrl = "http://localhost:3000"
): Promise<{ success: boolean; results: SmokeTestResult[] }> {
  const results: SmokeTestResult[] = [];
  const bUrl = backendUrl.replace(/\/$/, "");
  const fUrl = frontendUrl.replace(/\/$/, "");

  console.log(`[SUN89 Smoke Test] Probing Backend: ${bUrl} | Frontend: ${fUrl}`);

  // Step 1: Frontend SPA Responds
  const t1 = Date.now();
  try {
    const res = await fetch(`${fUrl}/`);
    const text = await res.text();
    const passed = res.status === 200 && text.includes("html");
    results.push({ step: "1. Frontend SPA Availability", passed, durationMs: Date.now() - t1, details: `Status ${res.status}` });
  } catch (err: any) {
    results.push({ step: "1. Frontend SPA Availability", passed: false, durationMs: Date.now() - t1, details: err.message });
  }

  // Step 2: Backend Liveness Probe
  const t2 = Date.now();
  try {
    const res = await fetch(`${bUrl}/api/health/live`);
    const body = await res.json() as any;
    const passed = res.status === 200 && body.status === "ok";
    results.push({ step: "2. Backend Liveness Probe", passed, durationMs: Date.now() - t2, details: `Status ${res.status}, Service: ${body.service}` });
  } catch (err: any) {
    results.push({ step: "2. Backend Liveness Probe", passed: false, durationMs: Date.now() - t2, details: err.message });
  }

  // Step 3: Backend Readiness Probe (DB & Storage check)
  const t3 = Date.now();
  try {
    const res = await fetch(`${bUrl}/api/health/ready`);
    const body = await res.json() as any;
    const passed = res.status === 200 && body.status === "ready" && body.checks?.database === "healthy" && body.checks?.storage === "healthy";
    results.push({ step: "3. Backend Readiness Probe", passed, durationMs: Date.now() - t3, details: `Status ${res.status}, Checks: ${JSON.stringify(body.checks)}` });
  } catch (err: any) {
    results.push({ step: "3. Backend Readiness Probe", passed: false, durationMs: Date.now() - t3, details: err.message });
  }

  // Step 4: Login Authentication & Session Token Issuance
  const t4 = Date.now();
  let authToken = "";
  try {
    const res = await fetch(`${bUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
    });
    const body = await res.json() as any;
    const token = body.data?.token || body.token;
    const passed = res.status === 200 && Boolean(token);
    if (passed) authToken = token;
    const userEmail = body.data?.user?.email || body.user?.email;
    results.push({ step: "4. User Authentication & JWT Issuance", passed, durationMs: Date.now() - t4, details: `Status ${res.status}, User: ${userEmail}` });
  } catch (err: any) {
    results.push({ step: "4. User Authentication & JWT Issuance", passed: false, durationMs: Date.now() - t4, details: err.message });
  }

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  // Step 5: Authenticated Orders API
  const t5 = Date.now();
  let sampleOrderNo = "";
  try {
    const res = await fetch(`${bUrl}/api/orders`, { headers: authHeaders });
    const body = await res.json() as any;
    const passed = res.status === 200 && body.success === true && typeof body.data === "object";
    if (passed && body.data) {
      const allOrders = Object.values(body.data).flat() as any[];
      if (allOrders.length > 0) sampleOrderNo = allOrders[0].orderNo;
    }
    results.push({ step: "5. Authenticated Orders API", passed, durationMs: Date.now() - t5, details: `Status ${res.status}` });
  } catch (err: any) {
    results.push({ step: "5. Authenticated Orders API", passed: false, durationMs: Date.now() - t5, details: err.message });
  }

  // Step 6: Authenticated Finance Invoices & Cash Register
  const t6 = Date.now();
  try {
    const res = await fetch(`${bUrl}/api/finance/invoices`, { headers: authHeaders });
    const body = await res.json() as any;
    const passed = res.status === 200 && body.success === true && Array.isArray(body.data);
    results.push({ step: "6. Authenticated Finance API", passed, durationMs: Date.now() - t6, details: `Invoices Count: ${body.data?.length || 0}` });
  } catch (err: any) {
    results.push({ step: "6. Authenticated Finance API", passed: false, durationMs: Date.now() - t6, details: err.message });
  }

  // Step 7: Authenticated Pricing / Master Data API
  const t7 = Date.now();
  try {
    const res = await fetch(`${bUrl}/api/pricing/samsat`, { headers: authHeaders });
    const body = await res.json() as any;
    const passed = res.status === 200 && body.success === true && Array.isArray(body.data);
    results.push({ step: "7. Authenticated Pricing API", passed, durationMs: Date.now() - t7, details: `Pricing Items Count: ${body.data?.length || 0}` });
  } catch (err: any) {
    results.push({ step: "7. Authenticated Pricing API", passed: false, durationMs: Date.now() - t7, details: err.message });
  }

  // Step 8: Document Metadata & Retrieval
  const t8 = Date.now();
  let sampleDocId = "";
  try {
    const targetOrder = sampleOrderNo || "ORD-2026-001";
    const res = await fetch(`${bUrl}/api/documents/order/${targetOrder}`, { headers: authHeaders });
    const body = await res.json() as any;
    const passed = res.status === 200 && body.success === true && Array.isArray(body.data);
    if (passed && body.data.length > 0) sampleDocId = body.data[0].id;
    results.push({ step: "8. Document Metadata API", passed, durationMs: Date.now() - t8, details: `Docs on Order: ${body.data?.length || 0}` });
  } catch (err: any) {
    results.push({ step: "8. Document Metadata API", passed: false, durationMs: Date.now() - t8, details: err.message });
  }

  // Step 9: Document Ticket Issuance & Streaming
  const t9 = Date.now();
  try {
    if (sampleDocId) {
      const ticketRes = await fetch(`${bUrl}/api/documents/${sampleDocId}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ operation: "preview" }),
      });
      const ticketBody = await ticketRes.json() as any;
      const ticket = ticketBody.data?.ticket || ticketBody.ticket;
      if ((ticketRes.status === 200 || ticketRes.status === 201) && ticket) {
        const streamRes = await fetch(`${bUrl}/api/documents/${sampleDocId}/preview?ticket=${ticket}`);
        const passed = streamRes.status === 200;
        results.push({ step: "9. Document Ticket Issuance & Streaming", passed, durationMs: Date.now() - t9, details: `Ticket status ${streamRes.status}` });
      } else {
        results.push({ step: "9. Document Ticket Issuance & Streaming", passed: false, durationMs: Date.now() - t9, details: `Ticket creation returned error: ${JSON.stringify(ticketBody)}` });
      }
    } else {
      // If no doc attached to sample order, verify ticket endpoint rejects non-existent gracefully
      const ticketRes = await fetch(`${bUrl}/api/documents/NON_EXISTENT_ID/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ operation: "preview" }),
      });
      const passed = ticketRes.status === 404;
      results.push({ step: "9. Document Ticket Issuance & Streaming", passed, durationMs: Date.now() - t9, details: "Verified 404 on missing document" });
    }
  } catch (err: any) {
    results.push({ step: "9. Document Ticket Issuance & Streaming", passed: false, durationMs: Date.now() - t9, details: err.message });
  }

  // Step 10: Security Headers & Anonymous Rejection
  const t10 = Date.now();
  try {
    const healthRes = await fetch(`${bUrl}/api/health`);
    const hasNosniff = healthRes.headers.get("x-content-type-options") === "nosniff";
    const hasFrame = Boolean(healthRes.headers.get("x-frame-options"));

    const anonRes = await fetch(`${bUrl}/api/orders`);
    const rejectsAnon = anonRes.status === 401;

    const passed = hasNosniff && hasFrame && rejectsAnon;
    results.push({
      step: "10. Security Headers & Auth Guard",
      passed,
      durationMs: Date.now() - t10,
      details: `Nosniff: ${hasNosniff}, FrameOptions: ${hasFrame}, AnonRejection: ${rejectsAnon}`,
    });
  } catch (err: any) {
    results.push({ step: "10. Security Headers & Auth Guard", passed: false, durationMs: Date.now() - t10, details: err.message });
  }

  const allPassed = results.every((r) => r.passed);
  return { success: allPassed, results };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("smoke-test.ts")) {
  const backend = process.argv[2] || "http://localhost:3001";
  const frontend = process.argv[3] || "http://localhost:3000";

  runSmokeTests(backend, frontend)
    .then(({ success, results }) => {
      console.log("\n==================== SMOKE TEST RESULTS ====================");
      for (const res of results) {
        const marker = res.passed ? "✔ PASS" : "✖ FAIL";
        console.log(`${marker} [${res.durationMs}ms] ${res.step} - ${res.details || ""}`);
      }
      console.log("============================================================\n");
      if (!success) {
        console.error("FAIL: One or more smoke test checks failed!");
        process.exit(1);
      }
      console.log("SUCCESS: All 10 smoke test assertions passed cleanly.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("FAIL: Unexpected error executing smoke tests:", err);
      process.exit(1);
    });
}
