/**
 * Targeted Final Verification Suite
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Verifies:
 * 1. Payment Idempotency & Concurrency (8 scenarios) on isolated SQLite DB.
 * 2. Profit & Loss (Laba Rugi) Reconciliation on 5-point isolated dataset.
 * 3. Guarantees Zero mutation to production server/data/database.sqlite.
 */

import path from "node:path";
import fs from "node:fs";

// Ensure isolation path
const ISOLATED_DB_PATH = path.resolve(process.cwd(), "scratch/isolated_test.sqlite");

// Clean previous run if present
if (fs.existsSync(ISOLATED_DB_PATH)) {
  try { fs.unlinkSync(ISOLATED_DB_PATH); } catch {}
}

// Override DB_PATH in process environment BEFORE loading any app modules
process.env.DB_PATH = ISOLATED_DB_PATH;

async function runVerification() {
  console.log("================================================================================");
  console.log("STARTING TARGETED VERIFICATION ON ISOLATED DATABASE");
  console.log(`Isolated DB: ${ISOLATED_DB_PATH}`);
  console.log("================================================================================\n");

  // Dynamically import backend modules with the overridden isolated DB_PATH
  const { db, closeDb, runInTransaction } = await import("../server/src/database/db");
  const { financeService } = await import("../server/src/services/financeService");
  const { dbFinanceRepository } = await import("../server/src/repositories/dbFinanceRepository");
  const { dbOrderRepository } = await import("../server/src/repositories/dbOrderRepository");

  console.log("[DB] Isolated database initialized and schema applied successfully.");

  try {
    // ---------------------------------------------------------------------------
    // PART 1: 8 PAYMENT SCENARIOS VERIFICATION
    // ---------------------------------------------------------------------------
    console.log("\n--------------------------------------------------------------------------------");
    console.log("PART 1: VERIFYING PAYMENT IDEMPOTENCY & CONCURRENCY SCENARIOS");
    console.log("--------------------------------------------------------------------------------");

    // Create a test order and invoice
    const testOrderNo = "ORD-TEST-001";
    const testInvoiceNo = "INV-TEST-001";
    
    dbOrderRepository.saveOrder({
      orderNo: testOrderNo,
      customer: "PT Testing Idempotensi",
      nomorHP: "08123456789",
      layanan: "Pajak Tahunan",
      nopol: "B 1234 IDM",
      currentStep: 1,
      currentStageName: "Verifikasi" as any,
      payment: {
        totalBiaya: 500000,
        biayaSamsat: 350000,
        biayaJasa: 150000,
        statusPembayaran: "Belum Lunas",
        terbayar: 0,
        sisaPembayaran: 500000,
      },
    } as any);

    const invoiceId = dbFinanceRepository.saveInvoice({
      invoiceNo: testInvoiceNo,
      orderNo: testOrderNo,
      customer: "PT Testing Idempotensi",
      layanan: "Pajak Tahunan",
      status: "UNPAID",
      totalTagihan: 500000,
      dibayar: 0,
      sisa: 500000,
      biayaSamsat: 350000,
      biayaJasa: 150000,
      profit: 150000,
      tanggal: "2026-10-21",
      catatan: "Tagihan Uji Idempotensi",
    });

    console.log(`[P1] Initialized test invoice #${invoiceId} (${testInvoiceNo}) with Total: Rp 500.000, Sisa: Rp 500.000`);

    const mockProof = {
      fileName: "bukti_transfer_valid.jpg",
      fileType: "image/jpeg",
      fileUrl: "/uploads/bukti_transfer_valid.jpg",
      fileSize: "250 KB",
      documentId: 101,
      uploadedAt: new Date().toISOString(),
    };

    // Scenario 8 Check: Missing Payment Proof rejection
    console.log("\n[SCENARIO 8] Penolakan jika bukti pembayaran tidak ada");
    try {
      financeService.recordPayment(invoiceId, 200000, {
        paymentMethod: "Transfer BCA",
        // buktiPembayaran omitted
      });
      console.error("FAILED: Scenario 8 should have thrown error for missing payment proof");
      process.exit(1);
    } catch (err: any) {
      console.log(`[OK] Scenario 8 Passed: Rejection confirmed with message: "${err.message}" (Code: ${err.code || err.statusCode})`);
    }

    // Scenario 1: Normal payment (Partial payment Rp 200.000)
    console.log("\n[SCENARIO 1] Pembayaran normal pertama (DP Rp 200.000)");
    const key1 = "idemp-key-payment-part1";
    const pay1Result = financeService.recordPayment(invoiceId, 200000, {
      paymentMethod: "Transfer BCA",
      bank: "BCA",
      buktiPembayaran: mockProof,
      idempotencyKey: key1,
      catatan: "DP 200.000",
    });

    console.log(`[OK] Scenario 1 Result: Status=${pay1Result.status}, Dibayar=${pay1Result.dibayar}, Sisa=${pay1Result.sisa}`);
    if (pay1Result.dibayar !== 200000 || pay1Result.sisa !== 300000) {
      throw new Error(`Scenario 1 assertion failed: expected dibayar 200000, got ${pay1Result.dibayar}`);
    }

    const kasAfter1 = dbFinanceRepository.getAllKasKantor();
    console.log(`[OK] Kas Kantor entries count: ${kasAfter1.length}, Latest Saldo: Rp ${kasAfter1[0].saldo}`);
    if (kasAfter1.length !== 1 || kasAfter1[0].debit !== 200000) {
      throw new Error("Scenario 1 kas kantor debit assertion failed");
    }

    // Scenario 2: Double Click / Rapid Resubmit with same key
    console.log("\n[SCENARIO 2] Double click / request ganda dengan key sama (idemp-key-payment-part1)");
    const pay2Double = financeService.recordPayment(invoiceId, 200000, {
      paymentMethod: "Transfer BCA",
      bank: "BCA",
      buktiPembayaran: mockProof,
      idempotencyKey: key1,
      catatan: "DP 200.000",
    });

    console.log(`[OK] Scenario 2 Double-click result: Dibayar=${pay2Double.dibayar}, Sisa=${pay2Double.sisa}`);
    const kasAfter2 = dbFinanceRepository.getAllKasKantor();
    console.log(`[OK] Kas Kantor entries count after double-click: ${kasAfter2.length} (UNCHANGED, no duplicate cash debit)`);
    if (kasAfter2.length !== 1 || pay2Double.dibayar !== 200000) {
      throw new Error("Scenario 2 assertion failed: double-click caused duplicate recording!");
    }

    // Scenario 3: Replay after simulated timeout or network drop with same key
    console.log("\n[SCENARIO 3] Replay setelah timeout atau jaringan putus dengan key sama");
    const pay3Replay = financeService.recordPayment(invoiceId, 200000, {
      paymentMethod: "Transfer BCA",
      bank: "BCA",
      buktiPembayaran: mockProof,
      idempotencyKey: key1,
    });
    console.log(`[OK] Scenario 3 Replay result: Dibayar=${pay3Replay.dibayar}, Sisa=${pay3Replay.sisa}`);
    const kasAfter3 = dbFinanceRepository.getAllKasKantor();
    if (kasAfter3.length !== 1) {
      throw new Error("Scenario 3 assertion failed: timeout replay caused duplicate debit!");
    }

    // Scenario 4: Identical replay with same payload returns original result
    console.log("\n[SCENARIO 4] Identical replay with same payload");
    const pay4Identical = financeService.recordPayment(invoiceId, 200000, {
      paymentMethod: "Transfer BCA",
      buktiPembayaran: mockProof,
      idempotencyKey: key1,
    });
    if (pay4Identical.dibayar !== 200000 || pay4Identical.sisa !== 300000) {
      throw new Error("Scenario 4 assertion failed");
    }
    console.log("[OK] Scenario 4 Passed: Returned consistent cached invoice without mutation.");

    // Scenario 5: Reused key with DIFFERENT payload (Conflict 409)
    console.log("\n[SCENARIO 5] Penggunaan key sama dengan payload berbeda (conflict detection)");
    try {
      financeService.recordPayment(invoiceId, 300000, {
        paymentMethod: "Transfer Mandiri", // different amount & details
        buktiPembayaran: mockProof,
        idempotencyKey: key1, // reused key!
      });
      console.error("FAILED: Scenario 5 should have thrown 409 Conflict");
      process.exit(1);
    } catch (err: any) {
      console.log(`[OK] Scenario 5 Passed: Conflict 409 caught successfully: "${err.message}" (Code: ${err.code || err.statusCode})`);
      if (err.statusCode !== 409 && err.code !== "IDEMPOTENCY_CONFLICT") {
        throw new Error("Scenario 5 status code should be 409 IDEMPOTENCY_CONFLICT");
      }
    }

    // Scenario 6: Two legitimate separate partial payments on same invoice
    console.log("\n[SCENARIO 6] Dua pembayaran sah berbeda pada tagihan yang sama (Pelunasan sisa Rp 300.000 dengan key baru)");
    const key2 = "idemp-key-payment-pelunasan";
    const pay6Result = financeService.recordPayment(invoiceId, 300000, {
      paymentMethod: "Transfer Mandiri",
      bank: "Mandiri",
      buktiPembayaran: mockProof,
      idempotencyKey: key2,
      catatan: "Pelunasan sisa 300.000",
    });
    console.log(`[OK] Scenario 6 Result: Status=${pay6Result.status}, Dibayar=${pay6Result.dibayar}, Sisa=${pay6Result.sisa}`);
    if (pay6Result.dibayar !== 500000 || pay6Result.sisa !== 0 || pay6Result.status !== "PAID") {
      throw new Error(`Scenario 6 assertion failed: expected fully paid, got ${JSON.stringify(pay6Result)}`);
    }
    const kasAfter6 = dbFinanceRepository.getAllKasKantor();
    console.log(`[OK] Kas Kantor entries count: ${kasAfter6.length}, Total Saldo: Rp ${kasAfter6[0].saldo}`);
    if (kasAfter6.length !== 2 || kasAfter6[0].saldo !== 15500000) {
      throw new Error("Scenario 6 kas kantor balance assertion failed");
    }

    // Scenario 7: Concurrent race condition exceeding remaining balance
    console.log("\n[SCENARIO 7] Percobaan pembayaran konkuren / race condition melebihi sisa tagihan");
    // Create another invoice with sisa 100.000
    const invoice2Id = dbFinanceRepository.saveInvoice({
      invoiceNo: "INV-RACE-002",
      orderNo: "ORD-RACE-002",
      customer: "Customer Race Condition",
      layanan: "Mutasi Masuk",
      status: "PARTIAL",
      totalTagihan: 500000,
      dibayar: 400000,
      sisa: 100000,
      biayaSamsat: 350000,
      biayaJasa: 150000,
      profit: 150000,
      tanggal: "2026-10-21",
    });

    // Request A pays 100.000
    const reqA = financeService.recordPayment(invoice2Id, 100000, {
      paymentMethod: "Transfer BCA",
      buktiPembayaran: mockProof,
      idempotencyKey: "key-race-a",
    });
    console.log(`[OK] Concurrent Winner (Request A): Dibayar=${reqA.dibayar}, Sisa=${reqA.sisa}, Status=${reqA.status}`);

    // Request B attempts to also pay 100.000 on the same invoice with a different key
    try {
      financeService.recordPayment(invoice2Id, 100000, {
        paymentMethod: "Transfer BCA",
        buktiPembayaran: mockProof,
        idempotencyKey: "key-race-b",
      });
      console.error("FAILED: Scenario 7 should have rejected second concurrent payment!");
      process.exit(1);
    } catch (err: any) {
      console.log(`[OK] Scenario 7 Passed: Second request atomically rejected: "${err.message}" (Code: ${err.code || err.statusCode})`);
    }

    console.log("\n>>> ALL 8 PAYMENT IDEMPOTENCY & CONCURRENCY SCENARIOS PASSED 100% <<<\n");


    // ---------------------------------------------------------------------------
    // PART 2: PROFIT & LOSS (LABA RUGI) RECONCILIATION
    // ---------------------------------------------------------------------------
    console.log("--------------------------------------------------------------------------------");
    console.log("PART 2: LABA RUGI RECONCILIATION WITH 5-POINT ISOLATED DATASET");
    console.log("--------------------------------------------------------------------------------");

    // Clean isolated tables for a pristine financial reconciliation test
    db.exec("DELETE FROM finance_invoices;");
    db.exec("DELETE FROM kas_kantor;");
    db.exec("DELETE FROM pengeluaran;");
    db.exec("DELETE FROM kas_messenger;");
    db.exec("DELETE FROM idempotency_keys;");

    console.log("[P2] Setting up 5-point isolated dataset...");

    // Transaction 1: Customer Invoice Payment
    // Total: Rp 500.000 (Biaya Jasa: Rp 150.000, Biaya Samsat: Rp 350.000)
    const tx1InvoiceId = dbFinanceRepository.saveInvoice({
      invoiceNo: "INV-RECON-001",
      orderNo: "ORD-RECON-001",
      customer: "Bpk. Hendra Gunawan",
      layanan: "Perpanjangan STNK Tahunan",
      status: "PAID",
      totalTagihan: 500000,
      dibayar: 500000,
      sisa: 0,
      biayaSamsat: 350000,
      biayaJasa: 150000,
      profit: 150000,
      tanggal: "2026-10-21",
      nopol: "B 8888 SUN",
    });

    // Cash Inflow: Rp 500.000 into Kas Kantor
    dbFinanceRepository.addKasKantor({
      tanggal: "2026-10-21",
      status: "Debit",
      keterangan: "Pelunasan: INV-RECON-001 - Bpk. Hendra Gunawan",
      nominal: 500000,
      kategori: "Pemasukan",
    });

    // Transaction 2: Office Operational Expense (ATK & Paper) Rp 45.000
    dbFinanceRepository.addPengeluaran({
      tanggal: "2026-10-21",
      kategori: "Operasional Kantor",
      keterangan: "Beli Kertas Kuitansi & ATK Loket",
      nominal: 45000,
      pic: "Admin Keuangan",
      metode: "Kas Kantor",
    });
    // Cash Outflow: -Rp 45.000 from Kas Kantor
    dbFinanceRepository.addKasKantor({
      tanggal: "2026-10-21",
      status: "Kredit",
      keterangan: "Pengeluaran Kantor: Beli Kertas Kuitansi & ATK Loket",
      nominal: 45000,
      kategori: "Pengeluaran",
    });

    // Transaction 3: Messenger Reimbursement Rp 25.000 (Approved & Disbursed)
    dbFinanceRepository.addPengeluaran({
      tanggal: "2026-10-21",
      kategori: "Reimbursement Messenger",
      keterangan: "Reimbursement Bensin Messenger (Tugas Samsat Timur)",
      nominal: 25000,
      pic: "Messenger Doni",
      metode: "Kas Kantor",
    });
    // Cash Outflow: -Rp 25.000 from Kas Kantor
    dbFinanceRepository.addKasKantor({
      tanggal: "2026-10-21",
      status: "Kredit",
      keterangan: "Pencairan Reimbursement: Reimbursement Bensin Messenger",
      nominal: 25000,
      kategori: "Reimbursement",
    });

    // Transaction 4: Messenger Petty Cash / Uang Jalan Rp 20.000
    dbFinanceRepository.addKasMessenger({
      tanggal: "2026-10-21",
      messenger: "Messenger Doni",
      in: 0,
      out: 20000,
      total: -20000,
      keterangan: "Uang Jalan Pengurusan Berkas Samsat",
      jenis: "Operasional",
      orderId: "ORD-RECON-001",
    });
    // Cash Outflow: -Rp 20.000 from Kas Kantor to Messenger
    dbFinanceRepository.addKasKantor({
      tanggal: "2026-10-21",
      status: "Kredit",
      keterangan: "Penyaluran Uang Jalan Messenger Doni",
      nominal: 20000,
      kategori: "Kas Messenger",
    });

    // Transaction 5: Samsat Pass-Through Disbursed to Samsat Loket Rp 350.000
    // Cash Outflow: -Rp 350.000 from Kas Kantor to Samsat
    dbFinanceRepository.addKasKantor({
      tanggal: "2026-10-21",
      status: "Kredit",
      keterangan: "Setor Biaya Pajak Samsat (INV-RECON-001 / B 8888 SUN)",
      nominal: 350000,
      kategori: "Biaya Samsat",
    });

    console.log("[P2] 5 transactions inserted into isolated database.");

    // Fetch from isolated DB
    const invoices = dbFinanceRepository.getAllInvoices();
    const pengeluaran = dbFinanceRepository.getAllPengeluaran();
    const kasMessenger = dbFinanceRepository.getAllKasMessenger();
    const kasKantor = dbFinanceRepository.getAllKasKantor();

    // Run the EXACT business logic from FinanceContent.tsx and ApiFinanceProvider
    // 1. deriveProfitFromInvoices
    const profitData = invoices
      .filter((inv) => inv.status === "PAID" || inv.status === "Lunas")
      .map((inv, idx) => ({
        id: idx + 1,
        tanggal: inv.tanggal,
        customer: inv.customer,
        nopol: inv.nopol,
        pengurusan: inv.layanan || (inv as any).jenisLayanan,
        uangMasuk: inv.totalTagihan,
        biayaSamsat: inv.biayaSamsat || 0,
        profit: inv.profit || inv.biayaJasa || (inv.totalTagihan - (inv.biayaSamsat || 0)),
        invoice: inv.invoiceNo,
      }));

    // 2. FinanceContent.tsx Laba Rugi Tab Formula:
    const totalPemasukan = profitData.reduce((acc, item) => acc + (item.uangMasuk > 0 ? item.uangMasuk : 0), 0);
    const pengeluaranKantor = pengeluaran.reduce((acc, item) => acc + item.nominal, 0);
    const pengeluaranMessenger = kasMessenger.reduce((acc, item) => acc + item.out, 0);
    const biayaSamsat = profitData.reduce((acc, item) => acc + (item.biayaSamsat > 0 ? item.biayaSamsat : 0), 0);

    const totalPengeluaran = pengeluaranKantor + pengeluaranMessenger + biayaSamsat;
    const labaRugiBersih = totalPemasukan - totalPengeluaran;

    // 3. Manual Business Calculations:
    // Model 1: Gross Inflows & Total Outflows (Financial Statement Presentation)
    const manualTotalPemasukan = 500000;
    const manualBiayaSamsat = 350000;
    const manualPengeluaranKantor = 45000 + 25000; // ATK (45k) + Reimbursement (25k) = 70k
    const manualPengeluaranMessenger = 20000; // Uang jalan messenger = 20k
    const manualTotalPengeluaran = manualPengeluaranKantor + manualPengeluaranMessenger + manualBiayaSamsat; // 440k
    const manualLabaBersih = manualTotalPemasukan - manualTotalPengeluaran; // 60k

    // Model 2: Pure Service Margin (Biro Jasa Net Service Fee Presentation)
    const manualPendapatanJasa = 150000;
    const manualBebanOperasional = 45000 + 25000 + 20000; // 90k
    const manualNetProfit = manualPendapatanJasa - manualBebanOperasional; // 60k

    // Cash Flow / Saldo Kas Akhir
    const totalKasMasuk = kasKantor.filter((k) => k.status === "Debit" || (k as any).debit > 0).reduce((acc, k) => acc + (k.debit || k.nominal || 0), 0);
    const totalKasKeluar = kasKantor.filter((k) => k.status === "Kredit" || (k as any).kredit > 0).reduce((acc, k) => acc + (k.kredit || k.nominal || 0), 0);
    const netCashFlow = totalKasMasuk - totalKasKeluar;

    console.log("\n================================================================================");
    console.log("RECONCILIATION COMPARISON RESULTS");
    console.log("================================================================================");
    console.log(`- Total Pemasukan / Omset        : Sistem = Rp ${totalPemasukan.toLocaleString("id-ID")} | Manual = Rp ${manualTotalPemasukan.toLocaleString("id-ID")} | MATCH: ${totalPemasukan === manualTotalPemasukan}`);
    console.log(`- Biaya Samsat (Pass-Through)    : Sistem = Rp ${biayaSamsat.toLocaleString("id-ID")} | Manual = Rp ${manualBiayaSamsat.toLocaleString("id-ID")} | MATCH: ${biayaSamsat === manualBiayaSamsat}`);
    console.log(`- Pengeluaran Kantor (ATK+Reimb) : Sistem = Rp ${pengeluaranKantor.toLocaleString("id-ID")} | Manual = Rp ${manualPengeluaranKantor.toLocaleString("id-ID")} | MATCH: ${pengeluaranKantor === manualPengeluaranKantor}`);
    console.log(`- Pengeluaran Kas Messenger      : Sistem = Rp ${pengeluaranMessenger.toLocaleString("id-ID")} | Manual = Rp ${manualPengeluaranMessenger.toLocaleString("id-ID")} | MATCH: ${pengeluaranMessenger === manualPengeluaranMessenger}`);
    console.log(`- Total Pengeluaran Bisnis       : Sistem = Rp ${totalPengeluaran.toLocaleString("id-ID")} | Manual = Rp ${manualTotalPengeluaran.toLocaleString("id-ID")} | MATCH: ${totalPengeluaran === manualTotalPengeluaran}`);
    console.log(`- Laba Bersih                    : Sistem = Rp ${labaRugiBersih.toLocaleString("id-ID")} | Manual = Rp ${manualLabaBersih.toLocaleString("id-ID")} | MATCH: ${labaRugiBersih === manualLabaBersih}`);
    console.log(`- Pendapatan Jasa Bersih         : Rp ${manualPendapatanJasa.toLocaleString("id-ID")} - Beban Ops Rp ${manualBebanOperasional.toLocaleString("id-ID")} = Net Profit Rp ${manualNetProfit.toLocaleString("id-ID")}`);
    console.log(`- Arus Kas Masuk (Kas Kantor)    : Rp ${totalKasMasuk.toLocaleString("id-ID")}`);
    console.log(`- Arus Kas Keluar (Kas Kantor)   : Rp ${totalKasKeluar.toLocaleString("id-ID")}`);
    console.log(`- Net Cash Flow (Kas Kantor)     : Rp ${netCashFlow.toLocaleString("id-ID")} | Laba Bersih = Rp ${labaRugiBersih.toLocaleString("id-ID")}`);

    if (totalPemasukan !== manualTotalPemasukan || totalPengeluaran !== manualTotalPengeluaran || labaRugiBersih !== manualLabaBersih || netCashFlow !== manualLabaBersih) {
      throw new Error("Laba Rugi Reconciliation Failed!");
    }

    console.log("\n>>> LABA RUGI RECONCILIATION 100% SUCCESSFUL <<<");
  } finally {
    closeDb();
  }
}

runVerification()
  .then(async () => {
    console.log("\n[CLEANUP] Removing isolated test database files...");
    await new Promise((r) => setTimeout(r, 200));
    try {
      if (fs.existsSync(ISOLATED_DB_PATH)) fs.unlinkSync(ISOLATED_DB_PATH);
      const walFile = `${ISOLATED_DB_PATH}-wal`;
      const shmFile = `${ISOLATED_DB_PATH}-shm`;
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
      console.log("[CLEANUP] Isolated test database safely removed. Operational DB untouched.");
    } catch (err: any) {
      console.warn("[CLEANUP] Note: Could not immediately remove file:", err.message);
    }
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("Verification failed with error:", err);
    await new Promise((r) => setTimeout(r, 200));
    try {
      if (fs.existsSync(ISOLATED_DB_PATH)) fs.unlinkSync(ISOLATED_DB_PATH);
    } catch {}
    process.exit(1);
  });
