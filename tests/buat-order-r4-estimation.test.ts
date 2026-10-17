/**
 * Integration Tests: R4 Annual Tax Estimation in Buat Order Workflow
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies end-to-end integration:
 * 1. Calculation matches authoritative Excel workbook for R4 Perpanjangan 1 Tahun.
 * 2. Component groups and itemized breakdown structure.
 * 3. Reactive behavior for FREE Biaya Denda and zero delay.
 * 4. Isolation: Other services (BBN, Mutasi) & vehicle types (Motor) do not trigger R4 engine.
 * 5. Order & Invoice creation consistency: order total === invoice amount, zero double counting.
 */

import test from "node:test";
import assert from "node:assert";
import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";
import { calculateEstimation } from "../src/domain/estimation/estimationEngine";
import { DEFAULT_R4_ANNUAL_TEMPLATE } from "../src/domain/estimation/defaultTemplates";
import { EstimationInput } from "../src/domain/estimation/types";
import { pricingStore } from "../src/app/data/pricingStore";

test("1. R4 Annual Reference Scenario — Total must equal Rp 18.363.000", () => {
  const input: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "LENGKAP",
    wilayahAccId: "DKI Jakarta",
    manualValues: {
      jr: 0,
      etle: 0,
      "pnbp-nopil": 0,
      "stnk-hilang": 0,
      "pemekaran-wilayah": 0,
    },
  };

  const result = calculateEstimation(input, DEFAULT_R4_ANNUAL_TEMPLATE);

  // Overdue verification
  assert.strictEqual(result.tahunTunggakan, 2);
  assert.strictEqual(result.bulanTunggakan, 10);
  assert.strictEqual(result.durasiKeterlambatan, "2 Tahun 10 Bulan");

  // Totals verification
  assert.strictEqual(result.totalPkb, 11892000, "PKB (Tertunggak + Baru) = 11.892.000");
  assert.strictEqual(result.totalDendaPkb, 5392000, "Denda PKB (Tertunggak + Baru) = 5.392.000");
  assert.strictEqual(result.totalSwdkllj, 429000, "SWDKLLJ (Tertunggak + Baru) = 429.000");
  assert.strictEqual(result.totalDendaSwdkllj, 300000, "Denda SWDKLLJ (Tertunggak + Baru) = 300.000");
  assert.strictEqual(result.totalAdminDanJasa, 350000, "Admin & Jasa (Cetak SKP + Jasa) = 350.000");
  assert.strictEqual(result.totalInsidental, 0, "Insidental = 0");
  assert.strictEqual(result.totalEstimasi, 18363000, "Total Estimasi must be exactly Rp 18.363.000");

  // ACC ID separation
  assert.strictEqual(result.accIdAmount, 0, "ACC ID for LENGKAP is 0");
});

test("2. ACC ID Calculation — Excluded from Grand Total", () => {
  const inputTanpaKtp: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "DKI Jakarta",
  };

  const result = calculateEstimation(inputTanpaKtp, DEFAULT_R4_ANNUAL_TEMPLATE);
  assert.strictEqual(result.accIdAmount, 750000, "ACC ID rate for DKI Jakarta is 750.000");
  // Total must NOT include ACC ID
  assert.strictEqual(result.totalEstimasi, 18363000, "Grand total must NOT include ACC ID");
});

test("3. FREE Biaya Denda Program — Zero PKB Penalty, SWDKLLJ Penalty Retained", () => {
  const inputFreeDenda: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "FREE Biaya Denda",
  };

  const result = calculateEstimation(inputFreeDenda, DEFAULT_R4_ANNUAL_TEMPLATE);
  assert.strictEqual(result.totalDendaPkb, 0, "Denda PKB must be 0 in FREE Biaya Denda program");
  assert.strictEqual(result.totalDendaSwdkllj, 300000, "Denda SWDKLLJ must remain active per workbook rules");
  assert.strictEqual(result.totalEstimasi, 12971000, "Total must be 18.363.000 - 5.392.000 = 12.971.000");
});

test("4. Zero Delay Scenario — On-Time Renewal", () => {
  const inputOnTime: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2026-11-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  };

  const result = calculateEstimation(inputOnTime, DEFAULT_R4_ANNUAL_TEMPLATE);
  assert.strictEqual(result.tahunTunggakan, 0);
  assert.strictEqual(result.bulanTunggakan, 0);
  assert.strictEqual(result.totalDendaPkb, 0);
  assert.strictEqual(result.totalDendaSwdkllj, 0);
  assert.strictEqual(result.items.find((i) => i.id === "cetak-skp")?.amount, 0, "Cetak SKP is 0 when on-time");
  assert.strictEqual(
    result.totalEstimasi,
    3964000 + 143000 + 250000,
    "On-time total = PKB Baru + SWDKLLJ Baru + Jasa (4.357.000)"
  );
});

test("5. Incidental Manual Adjustments Integration", () => {
  const inputIncidental: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    manualValues: {
      jr: 50000,
      etle: 250000,
      "pnbp-nopil": 0,
      "stnk-hilang": 0,
      "pemekaran-wilayah": 0,
    },
  };

  const result = calculateEstimation(inputIncidental, DEFAULT_R4_ANNUAL_TEMPLATE);
  assert.strictEqual(result.totalInsidental, 250000, "ETLE 250.000 in insidental group");
  assert.strictEqual(result.items.find((i) => i.id === "jr")?.amount, 50000, "JR 50.000 in admin group");
  assert.strictEqual(result.totalEstimasi, 18363000 + 300000, "Total increases by exactly 300.000");
});

test("6. Non-R4 Service and Vehicle Isolation — No Penalty Leakage", () => {
  // Test generic service configuration
  const config = pricingStore.getServiceFeeConfig("perpanjangan-1-tahun", "samsat-jakarta-timur");
  assert.ok(config, "Config exists");
  assert.strictEqual(config?.biayaJasa, 250000);

  // Test calculateOrderCost with generic parameters (not R4 annual engine)
  const snapshot = pricingStore.calculateOrderCost({
    serviceId: "perpanjangan-1-tahun",
    samsatId: "samsat-jakarta-timur",
    metodeLayanan: "Datang Langsung",
    pkb: 2000000,
    swdkllj: 143000,
  });

  // Zero penalty in generic calculation unless explicitly provided
  assert.strictEqual(snapshot.dendaSwdkllj, 0, "No auto-penalty in generic calculation");
  assert.strictEqual(snapshot.biayaSamsat, 0, "No auto Cetak SKP in generic calculation");
  assert.strictEqual(snapshot.totalEstimasi, 2000000 + 143000 + 250000);
});

test("7. End-to-End Order Creation and Invoice Generation Synchronization", async () => {
  const r4Input: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "LENGKAP",
    wilayahAccId: "DKI Jakarta",
  };

  const r4Result = calculateEstimation(r4Input, DEFAULT_R4_ANNUAL_TEMPLATE);
  const cetakSkpAmount = r4Result.items.find((i) => i.id === "cetak-skp")?.amount || 0;
  const jasaAmount = r4Result.items.find((i) => i.id === "jasa")?.amount || 250000;

  const costBreakdown = r4Result.items
    .filter((it) => it.amount > 0 || it.includesInTotal)
    .map((it) => ({
      itemId: it.id,
      code: it.code,
      name: it.name,
      amount: it.amount,
      category: it.category === "JASA" ? ("Jasa" as const) : it.category === "ADMIN" ? ("Samsat" as const) : ("Pajak" as const),
      source: it.category === "JASA" ? ("BiayaLayanan" as const) : ("Kendaraan" as const),
      isRequired: true,
    }));

  // Create order via orderStore.addOrderAsync
  const createdOrder = await orderStore.addOrderAsync({
    customer: "Test Customer R4",
    namaPemilik: "Bpk Test R4",
    nomorHP: "081234567890",
    platNomor: "B 1234 SUN",
    jenisKendaraan: "Mobil",
    layanan: "Perpanjangan 1 Tahun",
    wilayahSamsatAsal: "Jakarta Timur",
    wilayahSamsatTujuan: "Jakarta Timur",
    metodeLayanan: "Antar Jemput",
    tipePembayaran: "Full Bayar di Awal",
    biayaJasa: jasaAmount,
    biayaSamsat: cetakSkpAmount,
    biayaAntarJemput: 0,
    pkb: r4Result.totalPkb + r4Result.totalDendaPkb,
    swdkllj: r4Result.totalSwdkllj,
    dendaSwdkllj: r4Result.totalDendaSwdkllj + cetakSkpAmount,
    totalEstimasi: r4Result.totalEstimasi,
    costBreakdown,
    estimationResult: r4Result,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer Mandiri",
      statusPembayaran: "Lunas",
      totalBiaya: r4Result.totalEstimasi,
      totalEstimasi: r4Result.totalEstimasi,
      dibayar: r4Result.totalEstimasi,
      kurang: 0,
    },
    createdBy: "Tester",
    createdById: "USR-001",
    createdByRole: "Admin",
  });

  // Verify created order
  assert.ok(createdOrder, "Order must be created successfully");
  assert.strictEqual(createdOrder.totalEstimasi, 18363000, "Order totalEstimasi must be Rp 18.363.000");
  assert.strictEqual(createdOrder.payment.totalBiaya, 18363000, "Order payment.totalBiaya must be Rp 18.363.000");
  assert.ok(createdOrder.orderNo, "Order must have canonical orderNo");
  assert.ok(createdOrder.estimationResult, "estimationResult must be attached to order");
  assert.strictEqual(createdOrder.estimationResult.totalEstimasi, 18363000);

  // Verify invoice generated in financeStore
  const invoices = financeStore.getInvoices();
  const matchingInvoice = invoices.find(
    (inv) => inv.orderNo === createdOrder.orderNo || inv.orderId === createdOrder.id
  );

  assert.ok(matchingInvoice, "Matching invoice record must exist in financeStore");
  assert.strictEqual(
    matchingInvoice?.totalTagihan,
    18363000,
    "Invoice totalTagihan must match order totalEstimasi (18.363.000) exactly with zero drift"
  );

  // Accounting verification in Data Penjualan semantics:
  // uangKeluar = pkb + swdkllj + dendaSwdkllj = 17.284.000 + 429.000 + 400.000 = 18.113.000
  // customer payment = 18.363.000
  // profit = 18.363.000 - 18.113.000 = 250.000 (equal to biayaJasa)
  const uangKeluar = createdOrder.pkb + createdOrder.swdkllj + createdOrder.dendaSwdkllj;
  assert.strictEqual(uangKeluar, 18113000, "Official Samsat expenses = 18.113.000");
  const profit = createdOrder.totalEstimasi - uangKeluar;
  assert.strictEqual(profit, 250000, "Profit must exactly match service fee (250.000)");
});
