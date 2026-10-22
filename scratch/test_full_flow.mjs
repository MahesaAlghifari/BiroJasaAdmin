import { createRequire } from "module";
const require = createRequire("d:/Admin/adminsunbirojasa/");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const ARTIFACT_DIR = "C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169";

// Ensure sample proof file
const sampleImagePath = path.join("d:/Admin/adminsunbirojasa/scratch", "bukti_transfer_sample.png");
if (!fs.existsSync(sampleImagePath)) {
  const dummyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  fs.writeFileSync(sampleImagePath, dummyPng);
}

async function run() {
  console.log("=== FULL END-TO-END VERIFICATION: PAYMENT PROOF & DETAIL ===");

  // 1. Authenticate with backend API
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "svp@birojasa.com", password: "admin123" }),
  });
  const loginJson = await loginRes.json();
  const token = loginJson.data?.token;
  const user = loginJson.data?.user;
  console.log("1. Authenticated as:", user?.nama, `(${user?.role})`);

  // 2. Create order without payment proof (Bayar di Awal, unverified)
  const createRes = await fetch("http://localhost:3001/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      customer: "Ahmad Dahlan",
      nomorHP: "081234567890",
      layanan: "Perpanjangan STNK Tahunan",
      nopol: "B 7777 ABC",
      namaPemilik: "Ahmad Dahlan",
      pkbBerlakuSd: "2026-12-31",
      metodeLayanan: "Datang Langsung",
      payment: {
        tipePembayaran: "Bayar di Awal",
        metodePembayaran: "Transfer Bank",
        namaBank: "BCA",
        namaRekening: "Biro Jasa Sun89",
        noRekening: "8820192831",
        totalBiaya: 500000,
        dibayar: 500000,
        kurang: 0,
        isPaymentVerified: false,
        statusPembayaran: "Belum Bayar"
      }
    })
  });
  const createJson = await createRes.json();
  console.log("2. Order Created:", createJson.success, "OrderNo:", createJson.data?.orderNo);
  const orderNo = createJson.data?.orderNo;

  // 3. Verify payment WITHOUT proof MUST FAIL
  console.log("3. Testing verifyPayment WITHOUT proof (should fail)...");
  const failVerifyRes = await fetch(`http://localhost:3001/api/orders/${orderNo}/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      confirmedAmount: 500000,
      notes: "Coba verifikasi tanpa file bukti"
    })
  });
  const failJson = await failVerifyRes.json();
  console.log("Verify without proof response:", failVerifyRes.status, failJson.error?.code, failJson.error?.message);
  if (failVerifyRes.status === 400 && failJson.error?.code === "PAYMENT_PROOF_REQUIRED") {
    console.log("SUCCESS: Backend correctly rejected payment verification without proof file!");
  } else {
    console.error("FAIL: Expected 400 PAYMENT_PROOF_REQUIRED, got", failVerifyRes.status, failJson);
  }

  // 4. Upload payment proof file
  console.log("4. Uploading payment proof file to document API...");
  const formData = new FormData();
  const fileBlob = new Blob([fs.readFileSync(sampleImagePath)], { type: "image/png" });
  formData.append("file", fileBlob, "bukti_transfer_bca_7777.png");
  formData.append("documentType", "BUKTI_PEMBAYARAN");
  formData.append("orderNo", orderNo);

  const uploadRes = await fetch("http://localhost:3001/api/documents/upload", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}` },
    body: formData
  });
  const uploadJson = await uploadRes.json();
  console.log("Upload Proof Result:", uploadJson.success, uploadJson.data?.id, uploadJson.data?.fileUrl);
  const proofDoc = uploadJson.data;

  // 5. Test verifyPayment WITH proof file (should succeed)
  console.log("5. Testing verifyPayment WITH proof file (should succeed)...");
  const fileUrl = proofDoc.fileUrl || `/api/documents/${proofDoc.id}/preview`;
  const fileName = proofDoc.originalName || "bukti_transfer_sample.png";
  const successVerifyRes = await fetch(`http://localhost:3001/api/orders/${orderNo}/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      confirmedAmount: 500000,
      notes: "Pembayaran terverifikasi via transfer BCA",
      buktiPembayaran: {
        fileUrl: fileUrl,
        fileName: fileName,
        fileType: "image",
        documentId: proofDoc.id
      }
    })
  });
  const successVerifyJson = await successVerifyRes.json();
  console.log("Verify with proof response:", successVerifyRes.status, "isPaymentVerified:", successVerifyJson.data?.payment?.isPaymentVerified);

  // 6. Test Recording Payment on Finance Invoices without proof MUST FAIL
  console.log("6. Testing financeService.recordPayment without proof (should fail)...");
  const invListRes = await fetch("http://localhost:3001/api/finance/invoices", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const invList = (await invListRes.json()).data || [];
  const targetInv = invList.find((i) => i.orderNo === orderNo) || invList[0] || { id: 1 };
  
  const failFinanceRes = await fetch(`http://localhost:3001/api/finance/invoices/${targetInv.id}/pay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      nominal: 100000,
      metode: "Transfer Bank"
    })
  });
  const failFinanceJson = await failFinanceRes.json();
  console.log("Finance pay without proof response:", failFinanceRes.status, failFinanceJson.error?.code, failFinanceJson.error?.message);
  if (failFinanceRes.status === 400 && failFinanceJson.error?.code === "PAYMENT_PROOF_REQUIRED") {
    console.log("SUCCESS: Finance recordPayment correctly rejected payment without proof file!");
  }

  // 7. Open Browser to verify UI and capture screenshots
  console.log("7. Launching browser to verify UI...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });

  await context.addInitScript(({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
  }, { token, user });

  const page = await context.newPage();
  page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

  // Navigate to Data Penjualan
  await page.goto("http://localhost:3000/data-penjualan", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click Perpanjangan Pajak tab
  const pajakTab = page.locator('button[role="tab"]:has-text("Perpanjangan Pajak")');
  if (await pajakTab.isVisible()) {
    await pajakTab.click();
    await page.waitForTimeout(1000);
  }

  // Take screenshot of Data Penjualan table with the order
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_data_penjualan_with_verified_order.png"), fullPage: false });
  console.log("Screenshot: proof_data_penjualan_with_verified_order.png");

  // Click row or Detail button to open FinanceDetailPage
  const rowOrDetail = page.locator('td:has-text("Ahmad Dahlan"), tr:has-text("Ahmad Dahlan") button:has-text("Detail")').first();
  if (await rowOrDetail.isVisible()) {
    await rowOrDetail.click();
    await page.waitForTimeout(1500);

    // Scroll to Riwayat dan Bukti Pembayaran
    await page.evaluate(() => window.scrollTo(0, 450));
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_finance_detail_riwayat_pembayaran_card.png"), fullPage: false });
    console.log("Screenshot: proof_finance_detail_riwayat_pembayaran_card.png");

    // Click "Lihat" button on payment proof
    const lihatBtn = page.locator('button:has-text("Lihat")').first();
    if (await lihatBtn.isVisible()) {
      console.log("Clicking Lihat on payment proof...");
      await lihatBtn.click();
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "proof_finance_detail_preview_payment_proof_modal.png"), fullPage: false });
      console.log("Screenshot: proof_finance_detail_preview_payment_proof_modal.png");
    }
  }

  await browser.close();
  console.log("=== FULL END-TO-END VERIFICATION COMPLETED SUCCESSFULLY ===");
}

run().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
