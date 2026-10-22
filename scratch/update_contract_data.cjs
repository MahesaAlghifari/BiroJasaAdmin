const fs = require('fs');
let code = fs.readFileSync('src/app/data/penjualanContractData.ts', 'utf8');

// 1. Update contracts to include "No HP" and "Metode Pembayaran"
const contracts = [
  'MUTASI_LD_COLUMNS_CONTRACT',
  'MUTASI_AS_COLUMNS_CONTRACT',
  'BBN_COLUMNS_CONTRACT',
  'PERPANJANGAN_PAJAK_COLUMNS_CONTRACT',
  'LAIN_LAIN_COLUMNS_CONTRACT'
];

for (const c of contracts) {
  // Add No HP after Nama Customer
  code = code.replace(
    `  "Nama Customer",\r\n  "Nama",`,
    `  "Nama Customer",\r\n  "No HP",\r\n  "Nama",`
  );
  // Add Metode Pembayaran after Jenis Bayar
  code = code.replace(
    `  "Jenis Bayar",\r\n  "Tanggal Uang Masuk",`,
    `  "Jenis Bayar",\r\n  "Metode Pembayaran",\r\n  "Tanggal Uang Masuk",`
  );
}

// 2. Update buildTableColumnsFromContract to format No HP and Metode Pembayaran
const targetColLogic = `    const isR4R2 = colName === "R4 / R2";
    const isJenisBayar = colName === "Jenis Bayar";`;

const replColLogic = `    const isR4R2 = colName === "R4 / R2";
    const isJenisBayar = colName === "Jenis Bayar";
    const isMetodeBayar = colName === "Metode Pembayaran";
    const isPhone = colName === "No HP" || colName === "Nomor HP";`;

code = code.replace(targetColLogic, replColLogic);

const targetColFilter = `    } else if (isJenisBayar) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Transfer", "Cash", "Tempo"];`;

const replColFilter = `    } else if (isPhone) {
      baseCol.filterable = true;
      baseCol.filterType = "text";
    } else if (isJenisBayar) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Bayar di Awal", "Bayar di Akhir", "Transfer", "Cash", "Tempo"];
    } else if (isMetodeBayar) {
      baseCol.filterable = true;
      baseCol.filterType = "select";
      baseCol.filterOptions = ["Transfer Bank BCA", "Transfer BCA", "Transfer Mandiri", "Transfer BRI", "Cash", "QRIS", "-"];`;

code = code.replace(targetColFilter, replColFilter);

// 3. Update projectOrderToContractRow
const targetProject = `  const totalBiaya = order.payment?.totalBiaya ?? invoice?.totalTagihan ?? order.totalEstimasi ?? 0;
  const uangMasuk = order.payment?.dibayar ?? invoice?.terbayar ?? 0;
  const jenisBayar = order.payment?.metodePembayaran || invoice?.metodePembayaran || "Transfer";

  const tanggalUangMasuk = uangMasuk > 0
    ? formatDateDDMMYYYY(order.payment?.tanggalBayar || (invoice as any)?.tanggalBayar || invoice?.tanggal || order.createdAt)
    : "-";

  const bankUangKeluar = order.payment?.namaBank || invoice?.bank || "BCA";
  const tanggalUangKeluar = formatDateDDMMYYYY(invoice?.tanggal || order.createdAt);`;

const replProject = `  // Tanggal Masuk Berkas: actual document intake date, NOT order creation date
  let tanggalBerkas = "-";
  if (order.tanggalMasukBerkas) {
    tanggalBerkas = formatDateDDMMYYYY(order.tanggalMasukBerkas);
  } else if (order.metodeLayanan === "Datang Langsung") {
    tanggalBerkas = formatDateDDMMYYYY(order.createdAt);
  } else if (order.currentStep >= 3) {
    tanggalBerkas = formatDateDDMMYYYY(order.pickupCompletedAt || (order as any).updatedAt || order.createdAt);
  }

  // Financial calculations
  const totalBiaya = order.payment?.totalBiaya ?? invoice?.totalTagihan ?? order.totalEstimasi ?? 0;
  const uangMasuk = order.payment?.dibayar ?? invoice?.terbayar ?? 0;
  
  // Distinguish payment scheme (Jenis Bayar) from payment method (Metode Pembayaran)
  const jenisBayar = order.payment?.tipePembayaran || (invoice as any)?.tipePembayaran || (invoice?.metodePembayaran === "Tempo" ? "Tempo" : "Bayar di Akhir");
  const metodePembayaran = order.payment?.metodePembayaran || invoice?.metodePembayaran || "-";
  const noHp = order.nomorHP || (invoice as any)?.phone || "-";

  // Tanggal Uang Masuk: based on actual payment timestamp, never order creation date if unpaid
  const tanggalUangMasuk = uangMasuk > 0
    ? formatDateDDMMYYYY(
        order.payment?.paymentVerifiedAt ||
        order.payment?.tanggalBayar ||
        (invoice as any)?.tanggalBayar ||
        (invoice?.status === "Lunas" ? invoice?.tanggal : null) ||
        order.createdAt
      )
    : "-";

  const bankUangKeluar = order.payment?.namaBank || invoice?.bank || "BCA";
  
  // Tanggal Uang Keluar: based on actual Samsat processing expenditure, NOT prematurely at Stage 1-3
  let tanggalUangKeluar = "-";
  if (order.tanggalPengeluaranSamsat) {
    tanggalUangKeluar = formatDateDDMMYYYY(order.tanggalPengeluaranSamsat);
  } else if (order.tanggalProsesSamsat) {
    tanggalUangKeluar = formatDateDDMMYYYY(order.tanggalProsesSamsat);
  } else if (order.currentStep >= 4) {
    tanggalUangKeluar = formatDateDDMMYYYY((order as any).samsatCompletedAt || (order as any).updatedAt || order.createdAt);
  } else if (invoice?.status === "Lunas" && invoice.billingStatus === "COMPLETED") {
    tanggalUangKeluar = formatDateDDMMYYYY(invoice.completedAt || invoice.tanggal);
  }`;

code = code.replace(targetProject, replProject);

// Update return object in projectOrderToContractRow
const targetReturn = `    "Tanggal Masuk Berkas": tanggalBerkas,
    "R4 / R2": r4r2,
    "Plat No": order.nopol,
    "Nama Customer": order.customer,
    "Nama": order.namaPemilik || order.customer,
    "Jenis Pengurusan": order.layanan,
    "Samsat": samsat,
    "Jenis Bayar": jenisBayar,
    "Tanggal Uang Masuk": tanggalUangMasuk,`;

const replReturn = `    "Tanggal Masuk Berkas": tanggalBerkas,
    "R4 / R2": r4r2,
    "Plat No": order.nopol,
    "Nama Customer": order.customer,
    "No HP": noHp,
    "Nomor HP": noHp,
    "Nama": order.namaPemilik || order.customer,
    "Jenis Pengurusan": order.layanan,
    "Samsat": samsat,
    "Jenis Bayar": jenisBayar,
    "Metode Pembayaran": metodePembayaran,
    "Tanggal Uang Masuk": tanggalUangMasuk,`;

code = code.replace(targetReturn, replReturn);

fs.writeFileSync('src/app/data/penjualanContractData.ts', code, 'utf8');
console.log('Successfully updated penjualanContractData.ts!');
