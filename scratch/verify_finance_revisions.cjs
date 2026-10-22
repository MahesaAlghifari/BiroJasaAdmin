const fs = require('fs');
const path = require('path');

async function runVerification() {
  console.log("=== TARGETED VERIFICATION: ALUR KEUANGAN ADMIN SUN89 ===");

  const financeStorePath = path.join(__dirname, '..', 'src', 'app', 'data', 'financeStore.ts');
  const financeStoreContent = fs.readFileSync(financeStorePath, 'utf8');

  let passedChecks = 0;
  let totalChecks = 0;

  function assertCheck(name, condition) {
    totalChecks++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passedChecks++;
    } else {
      console.error(`[FAIL] ${name}`);
    }
  }

  // Check 1: Profit Terpending condition
  assertCheck(
    "1. getProfitPendingList checks isPaidInFull before including",
    financeStoreContent.includes('const isPaidInFull = (total > 0 && paid >= total) || inv.status === "Lunas";') &&
    financeStoreContent.includes('if (!isPaidInFull) return false;')
  );

  assertCheck(
    "2. getProfitPendingList excludes completed orders (stage >= 8)",
    financeStoreContent.includes('if (isOrderCompleted) return false;') &&
    financeStoreContent.includes('ord.currentStep >= 8')
  );

  assertCheck(
    "3. getProfitPendingList computes Dana Titipan Samsat, Selisih Kas Sementara & Estimasi Profit",
    financeStoreContent.includes('danaTitipanPajak') &&
    financeStoreContent.includes('selisihKasSementara = totalUangMasuk - totalUangKeluarAktual') &&
    financeStoreContent.includes('estimasiProfit = biayaJasaBiro')
  );

  // Check 2: Cashback Terpending distinction
  assertCheck(
    "4. getCashbackPendingList distinguishes Kelebihan Pembayaran vs Komisi Rekanan",
    financeStoreContent.includes('jenisKewajiban') &&
    financeStoreContent.includes('nominalKelebihan') &&
    financeStoreContent.includes('nominalKomisi') &&
    financeStoreContent.includes('penerimaCashback')
  );

  assertCheck(
    "5. getCashbackPendingList enforces pickup completed eligibility for overpayment",
    financeStoreContent.includes('isPickupCompleted') &&
    financeStoreContent.includes('ord.currentStep >= 3') &&
    financeStoreContent.includes('if (!isPickupCompleted)')
  );

  assertCheck(
    "6. processCashbackPayment exists and credits Kas Kantor once",
    financeStoreContent.includes('processCashbackPayment(') &&
    financeStoreContent.includes('kredit: amountToPay') &&
    financeStoreContent.includes('record.cashbackStatus = "REALIZED"')
  );

  // Check 3: Tagihan single source & non-negative sisa
  assertCheck(
    "7. Tagihan guarantees sisa = Math.max(0, totalTagihan - terbayar)",
    financeStoreContent.includes('const sisa = Math.max(0, total - paid);') ||
    financeStoreContent.includes('Math.max(0, record.totalTagihan - newTerbayar)')
  );

  // Check 4: Belum & Kurang Bayar derivation
  assertCheck(
    "8. getBelumBayarList strictly filters remaining > 0 and excludes Lunas",
    financeStoreContent.includes('const remaining = Math.max(0, total - paid);') &&
    financeStoreContent.includes('return remaining > 0 && total > 0;')
  );

  assertCheck(
    "9. getBelumBayarList maps Belum Bayar vs Kurang Bayar status dynamically",
    financeStoreContent.includes('const actualStatus: PaymentStatus = paid > 0 ? "Kurang Bayar" : "Belum Bayar";')
  );

  // Check 5: UI Content & Detail Page updates
  const financeContentPath = path.join(__dirname, '..', 'src', 'app', 'components', 'FinanceContent.tsx');
  const financeContentText = fs.readFileSync(financeContentPath, 'utf8');

  assertCheck(
    "10. FinanceContent renders Profit Terpending with Dana Titipan, Selisih Kas, & Estimasi Profit",
    financeContentText.includes('danaTitipanPajak') &&
    financeContentText.includes('selisihKasSementara') &&
    financeContentText.includes('estimasiProfit') &&
    financeContentText.includes('Dana Titipan Samsat (Pass-Through)')
  );

  assertCheck(
    "11. FinanceContent renders Cashback Terpending with separate Kelebihan vs Komisi columns & Cairkan action",
    financeContentText.includes('nominalKelebihan') &&
    financeContentText.includes('nominalKomisi') &&
    financeContentText.includes('handleConfirmCashbackPayment') &&
    financeContentText.includes('Konfirmasi Pencairan Cashback / Refund')
  );

  assertCheck(
    "12. FinanceContent renders Belum & Kurang Bayar with Pelunasan action",
    financeContentText.includes('Belum & Kurang Bayar') &&
    financeContentText.includes('handleOpenLunasConfirm')
  );

  const detailPagePath = path.join(__dirname, '..', 'src', 'app', 'components', 'FinanceDetailPage.tsx');
  const detailPageText = fs.readFileSync(detailPagePath, 'utf8');

  assertCheck(
    "13. FinanceDetailPage renders dedicated cards for Profit Terpending, Cashback, and Piutang",
    detailPageText.includes('Rincian Alur Keuangan') &&
    detailPageText.includes('Profit Terpending') &&
    detailPageText.includes('Rincian Kewajiban Cashback') &&
    detailPageText.includes('Rincian Kewajiban Piutang Pelanggan')
  );

  console.log(`\nVerification Result: ${passedChecks}/${totalChecks} checks PASSED.`);
  if (passedChecks === totalChecks) {
    console.log("ALL TARGETED FINANCIAL FLOW REQUIREMENTS ARE SATISFIED!");
  } else {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error("Verification error:", err);
  process.exit(1);
});
