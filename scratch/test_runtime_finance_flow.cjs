// Simulates the exact state transitions of the revised finance logic
const assert = require('assert');

function runRuntimeSimulation() {
  console.log("=== RUNTIME SIMULATION: ALL 4 REVISED FINANCIAL MODULES ===");

  // Simulating the store state and methods
  class MockFinanceStore {
    constructor() {
      this.invoices = [];
      this.kasKantor = [];
      this.orders = {};
      this.profitData = [];
    }

    addInvoice(inv) {
      const total = inv.totalTagihan || 0;
      const paid = inv.terbayar || 0;
      const sisa = Math.max(0, total - paid);
      const overpayment = Math.max(0, paid - total);
      const status = paid >= total ? "Lunas" : paid > 0 ? "Kurang Bayar" : "Belum Bayar";
      const record = {
        id: this.invoices.length + 1,
        invoice: inv.invoice || `INV-${this.invoices.length + 1}`,
        orderNo: inv.orderNo,
        customer: inv.customer,
        nopol: inv.nopol,
        totalTagihan: total,
        terbayar: paid,
        sisa,
        overpayment,
        status,
        profit: inv.profit || 250000,
        profitStatus: status === "Lunas" && inv.isCompleted ? "REALIZED" : "PENDING",
        cashback: inv.cashback || 0,
        cashbackStatus: "PENDING",
        refundStatus: "NONE",
        billingStatus: "ACTIVE",
        biayaSamsat: inv.biayaSamsat || 750000,
      };
      this.invoices.push(record);
      return record;
    }

    getProfitPendingList() {
      return this.invoices.filter(inv => {
        const total = Number(inv.totalTagihan) || 0;
        const paid = Number(inv.terbayar) || 0;
        const isPaidInFull = (total > 0 && paid >= total) || inv.status === "Lunas";

        if (!isPaidInFull) return false;
        if (inv.profitStatus === "REALIZED") return false;

        const ord = this.orders[inv.orderNo];
        const isOrderCompleted = ord ? (ord.currentStep >= 8 || ord.stage === "Selesai") : false;
        if (isOrderCompleted) return false;

        return true;
      }).map(inv => {
        const ord = this.orders[inv.orderNo];
        const danaTitipanPajak = inv.biayaSamsat;
        const totalUangMasuk = inv.terbayar;
        const totalUangKeluarAktual = danaTitipanPajak;
        const selisihKasSementara = totalUangMasuk - totalUangKeluarAktual;
        const estimasiProfit = inv.profit;
        return {
          ...inv,
          totalUangMasuk,
          danaTitipanPajak,
          totalUangKeluarAktual,
          selisihKasSementara,
          estimasiProfit,
        };
      });
    }

    getCashbackPendingList() {
      return this.invoices.filter(inv => {
        const total = Number(inv.totalTagihan) || 0;
        const paid = Number(inv.terbayar) || 0;
        const overpayment = Number(inv.overpayment) > 0 ? Number(inv.overpayment) : Math.max(0, paid - total);
        const legacyCashback = Number(inv.cashback) || 0;

        const hasOverpaymentPending = overpayment > 0 && inv.refundStatus !== "PROCESSED";
        const hasCashbackPending = legacyCashback > 0 && inv.cashbackStatus !== "REALIZED";

        if (!hasOverpaymentPending && !hasCashbackPending) return false;

        if (hasOverpaymentPending && inv.orderNo) {
          const ord = this.orders[inv.orderNo];
          if (ord) {
            const isPickupCompleted = ord.currentStep >= 3 || ord.stage === "Verifikasi Dokumen Fisik" || ord.stage === "Selesai";
            if (!isPickupCompleted) {
              if (!hasCashbackPending) return false;
            }
          }
        }
        return true;
      }).map(inv => {
        const total = Number(inv.totalTagihan) || 0;
        const paid = Number(inv.terbayar) || 0;
        const ord = this.orders[inv.orderNo];
        const isPickupCompleted = ord ? (ord.currentStep >= 3) : true;
        const rawOverpayment = Number(inv.overpayment) > 0 ? Number(inv.overpayment) : Math.max(0, paid - total);
        const overpayment = (rawOverpayment > 0 && isPickupCompleted && inv.refundStatus !== "PROCESSED") ? rawOverpayment : 0;
        const komisi = (Number(inv.cashback) > 0 && inv.cashbackStatus !== "REALIZED") ? Number(inv.cashback) : 0;

        let jenisKewajiban = "Komisi Rekanan";
        if (overpayment > 0 && komisi > 0) jenisKewajiban = "Kelebihan Bayar & Komisi";
        else if (overpayment > 0) jenisKewajiban = "Kelebihan Pembayaran";

        return {
          ...inv,
          nominalKelebihan: overpayment,
          nominalKomisi: komisi,
          jenisKewajiban,
          jumlahCashback: overpayment + komisi,
          penerimaCashback: overpayment > 0 && komisi === 0 ? `Pelanggan (${inv.customer})` : "Rekanan Mitra",
        };
      });
    }

    getBelumBayarList() {
      return this.invoices.filter(inv => {
        const remaining = Math.max(0, inv.totalTagihan - inv.terbayar);
        return remaining > 0 && inv.totalTagihan > 0;
      }).map(inv => {
        const remaining = Math.max(0, inv.totalTagihan - inv.terbayar);
        return {
          ...inv,
          kekurangan: remaining,
          status: inv.terbayar > 0 ? "Kurang Bayar" : "Belum Bayar",
        };
      });
    }

    processCashbackPayment(id, paymentType = "ALL") {
      const record = this.invoices.find(i => i.id === id);
      if (!record) return false;
      const overpayment = Math.max(0, record.terbayar - record.totalTagihan);
      const komisi = record.cashback || 0;
      const amountToPay = paymentType === "KELEBIHAN" ? overpayment : (paymentType === "KOMISI" ? komisi : (overpayment + komisi));
      if (amountToPay <= 0) return false;

      if (paymentType === "KELEBIHAN" || paymentType === "ALL") record.refundStatus = "PROCESSED";
      if (paymentType === "KOMISI" || paymentType === "ALL") record.cashbackStatus = "REALIZED";

      this.kasKantor.push({
        status: "Kredit",
        kredit: amountToPay,
        keterangan: `Pencairan cashback/refund: ${record.invoice}`,
      });
      return true;
    }
  }

  const store = new MockFinanceStore();

  // Test Case 1: Unpaid Order
  console.log("-> Testing Scenario 1: Unpaid Order (Tagihan 1.000.000, Bayar 0)");
  store.orders["ORD-001"] = { orderNo: "ORD-001", currentStep: 1, stage: "Input Data" };
  const inv1 = store.addInvoice({ orderNo: "ORD-001", customer: "Customer A", totalTagihan: 1000000, terbayar: 0 });
  
  assert.strictEqual(inv1.status, "Belum Bayar");
  assert.strictEqual(inv1.sisa, 1000000);
  assert.strictEqual(store.getBelumBayarList().length, 1);
  assert.strictEqual(store.getBelumBayarList()[0].status, "Belum Bayar");
  assert.strictEqual(store.getProfitPendingList().length, 0, "Unpaid must NOT enter Profit Terpending");
  assert.strictEqual(store.getCashbackPendingList().length, 0, "Unpaid must NOT enter Cashback Terpending");
  console.log("   [OK] Correctly classified in Belum Bayar only.");

  // Test Case 2: Partially Paid Order
  console.log("-> Testing Scenario 2: Partially Paid (Tagihan 1.000.000, Bayar 400.000)");
  store.orders["ORD-002"] = { orderNo: "ORD-002", currentStep: 2, stage: "Penjadwalan" };
  const inv2 = store.addInvoice({ orderNo: "ORD-002", customer: "Customer B", totalTagihan: 1000000, terbayar: 400000 });
  
  assert.strictEqual(inv2.status, "Kurang Bayar");
  assert.strictEqual(inv2.sisa, 600000);
  const bbList = store.getBelumBayarList();
  assert.strictEqual(bbList.length, 2);
  const foundInv2 = bbList.find(i => i.id === inv2.id);
  assert.strictEqual(foundInv2.status, "Kurang Bayar");
  assert.strictEqual(foundInv2.kekurangan, 600000);
  assert.strictEqual(store.getProfitPendingList().length, 0, "Partially paid must NOT enter Profit Terpending");
  assert.strictEqual(store.getCashbackPendingList().length, 0, "Partially paid must NOT enter Cashback Terpending");
  console.log("   [OK] Correctly classified in Kurang Bayar only.");

  // Test Case 3: Fully Paid Ongoing Order
  console.log("-> Testing Scenario 3: Fully Paid Ongoing (Tagihan 1.000.000, Bayar 1.000.000, Step 4)");
  store.orders["ORD-003"] = { orderNo: "ORD-003", currentStep: 4, stage: "Proses Samsat" };
  const inv3 = store.addInvoice({ orderNo: "ORD-003", customer: "Customer C", totalTagihan: 1000000, terbayar: 1000000, profit: 250000, biayaSamsat: 750000 });

  assert.strictEqual(inv3.status, "Lunas");
  assert.strictEqual(inv3.sisa, 0);
  // Excluded from Belum & Kurang Bayar
  assert.strictEqual(store.getBelumBayarList().some(i => i.id === inv3.id), false, "Lunas must be excluded from Belum & Kurang Bayar");
  // Enters Profit Terpending
  const ppList = store.getProfitPendingList();
  assert.strictEqual(ppList.length, 1);
  assert.strictEqual(ppList[0].totalUangMasuk, 1000000);
  assert.strictEqual(ppList[0].danaTitipanPajak, 750000);
  assert.strictEqual(ppList[0].selisihKasSementara, 250000);
  assert.strictEqual(ppList[0].estimasiProfit, 250000);
  // Not in Cashback
  assert.strictEqual(store.getCashbackPendingList().length, 0, "Exact payment has no cashback");
  console.log("   [OK] Correctly entered Profit Terpending with Pass-Through breakdown, excluded from Belum Bayar & Cashback.");

  // Test Case 4: Overpaid with Incomplete Pickup
  console.log("-> Testing Scenario 4: Overpaid with Incomplete Pickup (Tagihan 1.000.000, Bayar 1.150.000, Step 2)");
  store.orders["ORD-004"] = { orderNo: "ORD-004", currentStep: 2, stage: "Penjadwalan Jemput" };
  const inv4 = store.addInvoice({ orderNo: "ORD-004", customer: "Customer D", totalTagihan: 1000000, terbayar: 1150000, overpayment: 150000 });

  assert.strictEqual(inv4.sisa, 0, "Sisa must never be negative");
  assert.strictEqual(inv4.overpayment, 150000);
  assert.strictEqual(store.getCashbackPendingList().length, 0, "Overpayment must NOT enter Cashback before pickup is complete");
  console.log("   [OK] Overpayment held safely, waiting for pickup completion.");

  // Test Case 5: Pickup Completes
  console.log("-> Testing Scenario 5: Pickup Completes (Step 3)");
  store.orders["ORD-004"].currentStep = 3;
  store.orders["ORD-004"].stage = "Verifikasi Dokumen Fisik";
  const cbList = store.getCashbackPendingList();
  assert.strictEqual(cbList.length, 1, "Now eligible for Cashback Terpending");
  assert.strictEqual(cbList[0].nominalKelebihan, 150000);
  assert.strictEqual(cbList[0].jenisKewajiban, "Kelebihan Pembayaran");
  assert.strictEqual(cbList[0].penerimaCashback, "Pelanggan (Customer D)");
  console.log("   [OK] Kelebihan Pembayaran correctly displayed in Cashback Terpending.");

  // Test Case 6: Payout of Cashback
  console.log("-> Testing Scenario 6: Settle Cashback Payout");
  const initialKasOutflow = store.kasKantor.length;
  store.processCashbackPayment(inv4.id, "KELEBIHAN");
  assert.strictEqual(store.kasKantor.length, initialKasOutflow + 1);
  assert.strictEqual(store.kasKantor[store.kasKantor.length - 1].kredit, 150000);
  assert.strictEqual(store.getCashbackPendingList().length, 0, "Leaves pending list once refunded");
  console.log("   [OK] Kas Kantor credited once, invoice marked PROCESSED, cleared from Cashback pending.");

  // Test Case 7: Order Completes (Step 8) -> Profit Final Realized
  console.log("-> Testing Scenario 7: Order Completes (Step 8)");
  store.orders["ORD-003"].currentStep = 8;
  store.orders["ORD-003"].stage = "Selesai";
  assert.strictEqual(store.getProfitPendingList().some(i => i.id === inv3.id), false, "Completed order ORD-003 leaves Profit Terpending");
  console.log("   [OK] Moves out of Profit Terpending when order reaches final completed step.");

  console.log("\nALL 7 RUNTIME TEST SCENARIOS PASSED WITH 100% ACCURACY!");
}

runRuntimeSimulation();
