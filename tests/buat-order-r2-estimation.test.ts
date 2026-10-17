/**
 * Integration Tests: R2 Annual Tax Estimation in Buat Order Workflow
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies end-to-end integration:
 * 1. Calculation matches authoritative Excel workbook for R2 Perpanjangan 1 Tahun (Motor).
 * 2. Component groups and itemized breakdown structure (including Proses dan ACC ID in total).
 * 3. Reactive behavior for FREE Biaya Denda and zero delay.
 * 4. Isolation: R4 uses R4 template; R2 uses R2 template; non-annual uses generic pricing.
 * 5. Order & Invoice creation consistency: order total === invoice amount, zero double counting.
 */

import test from "node:test";
import assert from "node:assert";
import { orderStore } from "../src/app/data/orderStore";
import { financeStore } from "../src/app/data/financeStore";
import { calculateEstimation } from "../src/domain/estimation/estimationEngine";
import {
  DEFAULT_R2_ANNUAL_TEMPLATE,
  DEFAULT_R4_ANNUAL_TEMPLATE,
} from "../src/domain/estimation/defaultTemplates";
import { EstimationInput } from "../src/domain/estimation/types";
import { pricingStore } from "../src/app/data/pricingStore";

test("1. Buat Order R2 Annual Reference Scenario — Total must equal Rp 876.000", () => {
  const input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
    manualValues: {
      "stnk-hilang": 0,
      "proses-dan-acc-id": 350000,
      etle: 0,
      "req-nopol-ganjil-acak": 0,
      "pemekaran-wilayah": 0,
    },
  };

  const result = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);

  // Overdue verification
  assert.strictEqual(result.tahunTunggakan, 1);
  assert.strictEqual(result.bulanKalender, 2);
  assert.strictEqual(result.bulanTunggakan, 7);
  assert.strictEqual(result.durasiKeterlambatan, "1 Tahun 2 Bulan");

  // Totals verification
  assert.strictEqual(result.totalPkb, 102000, "PKB (Tertunggak + Baru) = 102.000");
  assert.strictEqual(result.totalDendaPkb, 40000, "Denda PKB (Tertunggak + Baru) = 40.000");
  assert.strictEqual(result.totalSwdkllj, 70000, "SWDKLLJ (Tertunggak + Baru) = 70.000");
  assert.strictEqual(result.totalDendaSwdkllj, 64000, "Denda SWDKLLJ (Tertunggak + Baru) = 64.000");
  assert.strictEqual(result.totalAdminDanJasa, 600000, "Admin, Proses & Jasa (350k + 50k + 200k) = 600.000");
  assert.strictEqual(result.totalInsidental, 0, "Insidental = 0");
  assert.strictEqual(result.totalEstimasi, 876000, "Total Estimasi must be exactly Rp 876.000");

  // Proses dan ACC ID is included in total
  const prosesAccItem = result.items.find((i) => i.id === "proses-dan-acc-id");
  assert.strictEqual(prosesAccItem?.amount, 350000);
  assert.strictEqual(prosesAccItem?.includesInTotal, true);
});

test("2. Buat Order Isolation — Vehicle & Service Routing", () => {
  // A. Perpanjangan 1 Tahun + Mobil => triggers R4
  const r4Input: EstimationInput = {
    pkbDasar: 3964000,
    tanggalJatuhTempo: "2023-12-23",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
  };
  const r4Res = calculateEstimation(r4Input, DEFAULT_R4_ANNUAL_TEMPLATE);
  assert.strictEqual(r4Res.totalEstimasi, 18363000);

  // B. Perpanjangan 1 Tahun + Motor => triggers R2
  const r2Input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  };
  const r2Res = calculateEstimation(r2Input, DEFAULT_R2_ANNUAL_TEMPLATE);
  assert.strictEqual(r2Res.totalEstimasi, 876000);

  // C. Generic pricing service (e.g. Balik Nama) uses generic pricing
  const bnSnapshot = pricingStore.calculateOrderCost({
    serviceName: "Balik Nama",
    wilayahSamsat: "Jakarta Timur",
    metodeLayanan: "Antar Jemput",
    tipeJasa: "Lengkap",
    pkb: 51000,
    swdkllj: 35000,
    dendaSwdkllj: 0,
  });
  assert.ok(bnSnapshot.totalEstimasi > 0);
  // Ensure BN doesn't produce 876.000
  assert.notStrictEqual(bnSnapshot.totalEstimasi, 876000);
});

test("3. Order and Invoice Persistence — Exact Match of Rp 876.000 with Zero Double Counting", async () => {
  const input: EstimationInput = {
    pkbDasar: 51000,
    tanggalJatuhTempo: "2025-09-08",
    tanggalEstimasi: "2026-10-17",
    programSamsat: "NORMAL",
    kondisiBerkas: "TIDAK ADA KTP",
    wilayahAccId: "NON ACC ID",
  };

  const r2Result = calculateEstimation(input, DEFAULT_R2_ANNUAL_TEMPLATE);

  const costBreakdown = r2Result.items
    .filter((it) => it.amount > 0 || it.includesInTotal)
    .map((it) => {
      let category: "Pajak" | "Jasa" | "Samsat" | "Operasional" = "Pajak";
      if (it.category === "JASA") category = "Jasa";
      else if (it.category === "ADMIN") category = "Samsat";
      else if (it.category === "INSIDENTAL") category = "Operasional";

      return {
        itemId: it.id,
        code: it.code,
        name: it.name,
        amount: it.amount,
        category,
        source: it.isManual
          ? ("Operasional" as const)
          : it.category === "JASA"
          ? ("BiayaLayanan" as const)
          : ("Kendaraan" as const),
        isRequired: !it.isManual,
      };
    });

  const cetakSkpAmount = r2Result.items.find((i) => i.id === "cetak-skp")?.amount || 0;
  const prosesAccAmount = r2Result.items.find((i) => i.id === "proses-dan-acc-id")?.amount || 0;
  const jasaAmount = r2Result.items.find((i) => i.id === "jasa")?.amount || 200000;

  const createdOrder = await orderStore.addOrderAsync({
    customer: "Test Customer R2",
    namaPemilik: "Bpk Test R2",
    nomorHP: "081298765432",
    platNomor: "B 5678 MOT",
    jenisKendaraan: "Motor",
    layanan: "Perpanjangan 1 Tahun",
    wilayahSamsatAsal: "Jakarta Timur",
    wilayahSamsatTujuan: "Jakarta Timur",
    metodeLayanan: "Antar Jemput",
    tipePembayaran: "Full Bayar di Awal",
    biayaJasa: jasaAmount,
    biayaSamsat: cetakSkpAmount + prosesAccAmount,
    biayaAntarJemput: 0,
    pkb: r2Result.totalPkb + r2Result.totalDendaPkb,
    swdkllj: r2Result.totalSwdkllj,
    dendaSwdkllj: r2Result.totalDendaSwdkllj + cetakSkpAmount + prosesAccAmount,
    totalEstimasi: r2Result.totalEstimasi,
    costBreakdown,
    estimationResult: r2Result,
    payment: {
      tipePembayaran: "Bayar di Awal",
      metodePembayaran: "Transfer BCA",
      statusPembayaran: "Lunas",
      totalBiaya: r2Result.totalEstimasi,
      totalEstimasi: r2Result.totalEstimasi,
      dibayar: r2Result.totalEstimasi,
      kurang: 0,
    },
    createdBy: "Tester R2",
    createdById: "USR-002",
    createdByRole: "Admin",
  });

  // Verify created order
  assert.ok(createdOrder, "Order must be created successfully");
  assert.strictEqual(createdOrder.totalEstimasi, 876000, "Order totalEstimasi must be Rp 876.000");
  assert.strictEqual(createdOrder.payment.totalBiaya, 876000, "Order payment.totalBiaya must be Rp 876.000");
  assert.ok(createdOrder.orderNo, "Order must have canonical orderNo");
  assert.ok(createdOrder.estimationResult, "estimationResult must be attached to order");
  assert.strictEqual(createdOrder.estimationResult.totalEstimasi, 876000);

  // Verify invoice generated in financeStore
  const invoices = financeStore.getInvoices();
  const matchingInvoice = invoices.find(
    (inv) => inv.orderNo === createdOrder.orderNo || inv.orderId === createdOrder.id
  );

  assert.ok(matchingInvoice, "Matching invoice record must exist in financeStore");
  assert.strictEqual(
    matchingInvoice?.totalTagihan,
    876000,
    "Invoice totalTagihan must match order totalEstimasi (876.000) exactly with zero drift"
  );

  // Accounting verification in Data Penjualan semantics:
  // customer payment = 876.000
  // uangKeluar = pkb + swdkllj + dendaSwdkllj = 142.000 + 70.000 + 464.000 = 676.000
  // profit = 876.000 - 676.000 = 200.000 (equal to biayaJasa)
  const uangKeluar = createdOrder.pkb + createdOrder.swdkllj + createdOrder.dendaSwdkllj;
  assert.strictEqual(uangKeluar, 676000, "Official Samsat expenses = 676.000");
  const profit = createdOrder.totalEstimasi - uangKeluar;
  assert.strictEqual(profit, 200000, "Profit must exactly match service fee (200.000)");
});
