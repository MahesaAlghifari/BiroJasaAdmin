export interface ProfitItem {
  id: number;
  tanggal: string;
  nopol: string;
  customer: string;
  namaBerkas: string;
  pengurusan: string;
  uangMasuk: number;
  biayaSamsat: number;
  profit: number;
  rekening: string;
  invoice: string;
  tanggalTTB: string;
  ttb: string;
  jemputDokumen?: string;
  prosesSamsat?: string;
  pengantaranKembali?: string;
}

export interface KasMessengerItem {
  id: number;
  tanggal: string;
  jenis: string;
  messenger: string;
  keterangan: string;
  in: number;
  out: number;
  total: number;
}

export interface KasKantorItem {
  id: number;
  tanggal: string;
  status: string;
  keterangan: string;
  debit: number;
  kredit: number;
  total: number;
  invoiceRef?: string;
}

export interface PengeluaranItem {
  id: number;
  tanggal: string;
  keterangan: string;
  nominal: number;
}

export interface BelumKurangBayarItem {
  id: number;
  tanggal: string;
  nopol: string;
  customer: string;
  namaBerkas: string;
  pengurusan: string;
  uangMasuk: number;
  biayaSamsat: number;
  profit: number;
  status: string;
  invoice: string;
  kekurangan: number;
}

export interface ProfitTerpendingItem {
  id: number;
  tanggal: string;
  nopol: string;
  customer: string;
  namaBerkas: string;
  pengurusan: string;
  uangMasuk: number;
  biayaSamsat: number;
  profit: number;
  status: string;
  invoice: string;
  alasan: string;
}

export interface CashbackTerpendingItem {
  id: number;
  tanggal: string;
  nopol: string;
  customer: string;
  namaBerkas: string;
  pengurusan: string;
  uangMasuk: number;
  profit: number;
  status: string;
  invoice: string;
  jumlahCashback: number;
  cashbackPersen: string | number;
}

export interface TagihanItem {
  id: number;
  tanggal: string;
  customer: string;
  nopol: string;
  jenisLayanan: string;
  totalTagihan: number;
  terbayar: number;
  sisa: number;
  status: string;
  jatuhTempo: string;
}

export interface LabaRugiMonthlyItem {
  bulan: string;
  pendapatan: number;
  pengeluaran: number;
  laba: number;
}

export interface PenjualanItem {
  id: number;
  tglMasuk: string;
  r4r2: string;
  nopol: string;
  customer: string;
  namaSesuaiBPKB: string;
  jenisPengurusan: string;
  jenisBayar: string;
  tglUangMasuk: string;
  uangMasuk: number;
  bank: string;
  uangKeluar: number;
  tglUangKeluar: string;
  uangKeluarDari: string;
  profit: number;
  status: string;
  noInvoice: string;
  tglInvoice: string;
  tandaTerima: string;
  bpkb?: string;
  statusBPKB?: string;
  ttbBPKB?: string;
}

export const profitData: ProfitItem[] = [
  { id: 1, tanggal: "20 Agustus 2025", nopol: "B 1970 SAM", customer: "CNAF KEL. GADING", namaBerkas: "AHMAD YUSUF AL MAJID", pengurusan: "Pajak tahunan", uangMasuk: -795000, biayaSamsat: 0, profit: 0, rekening: "CIMB", invoice: "BJ_25-08_1687", tanggalTTB: "14 Agustus 2025", ttb: "TTB_25_08_2035", jemputDokumen: "Ahmad", prosesSamsat: "Budi", pengantaranKembali: "Ahmad" },
  { id: 2, tanggal: "21 Agustus 2025", nopol: "B 2345 XYZ", customer: "PT. MAJU JAYA", namaBerkas: "BUDI SANTOSO", pengurusan: "Mutasi LD", uangMasuk: 5000000, biayaSamsat: 3500000, profit: 1500000, rekening: "BCA", invoice: "BJ_25-08_1688", tanggalTTB: "22 Agustus 2025", ttb: "TTB_25_08_2036", jemputDokumen: "Budi", prosesSamsat: "Candra", pengantaranKembali: "Budi" },
  { id: 3, tanggal: "22 Agustus 2025", nopol: "D 5678 EFG", customer: "JOHN DOE", namaBerkas: "JOHN DOE", pengurusan: "Balik nama", uangMasuk: 4500000, biayaSamsat: 3000000, profit: 1500000, rekening: "Mandiri", invoice: "BJ_25-08_1689", tanggalTTB: "23 Agustus 2025", ttb: "TTB_25_08_2037", jemputDokumen: "Candra", prosesSamsat: "Ahmad", pengantaranKembali: "Candra" },
  { id: 4, tanggal: "23 Agustus 2025", nopol: "F 9012 HIJ", customer: "SITI RAHAYU", namaBerkas: "SITI RAHAYU", pengurusan: "BBN 1", uangMasuk: 6000000, biayaSamsat: 4200000, profit: 1800000, rekening: "BRI", invoice: "BJ_25-08_1690", tanggalTTB: "24 Agustus 2025", ttb: "TTB_25_08_2038", jemputDokumen: "Ahmad", prosesSamsat: "Budi", pengantaranKembali: "Ahmad" },
  { id: 5, tanggal: "24 Agustus 2025", nopol: "B 3456 DEF", customer: "AHMAD RIZKI", namaBerkas: "AHMAD RIZKI", pengurusan: "Pajak 5 tahunan", uangMasuk: 2500000, biayaSamsat: 1800000, profit: 700000, rekening: "BCA", invoice: "BJ_25-08_1691", tanggalTTB: "25 Agustus 2025", ttb: "TTB_25_08_2039", jemputDokumen: "Budi", prosesSamsat: "Candra", pengantaranKembali: "Budi" },
  { id: 6, tanggal: "25 Agustus 2025", nopol: "D 7890 KLM", customer: "DEWI LESTARI", namaBerkas: "DEWI LESTARI", pengurusan: "Duplikat STNK", uangMasuk: 800000, biayaSamsat: 500000, profit: 300000, rekening: "Cash", invoice: "BJ_25-08_1692", tanggalTTB: "26 Agustus 2025", ttb: "TTB_25_08_2040", jemputDokumen: "Candra", prosesSamsat: "Ahmad", pengantaranKembali: "Candra" },
  { id: 7, tanggal: "26 Agustus 2025", nopol: "B 5678 NOP", customer: "PT. GLOBAL", namaBerkas: "PT. GLOBAL INDONESIA", pengurusan: "Mutasi AS", uangMasuk: 4800000, biayaSamsat: 3200000, profit: 1600000, rekening: "Mandiri", invoice: "BJ_25-08_1693", tanggalTTB: "27 Agustus 2025", ttb: "TTB_25_08_2041", jemputDokumen: "Ahmad", prosesSamsat: "Budi", pengantaranKembali: "Ahmad" },
  { id: 8, tanggal: "27 Agustus 2025", nopol: "F 1234 QRS", customer: "ANDI WIJAYA", namaBerkas: "ANDI WIJAYA", pengurusan: "Perpanjangan STNK", uangMasuk: 1500000, biayaSamsat: 800000, profit: 700000, rekening: "BCA", invoice: "BJ_25-08_1694", tanggalTTB: "28 Agustus 2025", ttb: "TTB_25_08_2042", jemputDokumen: "Budi", prosesSamsat: "Candra", pengantaranKembali: "Budi" },
  { id: 9, tanggal: "28 Agustus 2025", nopol: "D 9876 TUV", customer: "CITRA DEWI", namaBerkas: "CITRA DEWI", pengurusan: "BBN 2", uangMasuk: 5500000, biayaSamsat: 3800000, profit: 1700000, rekening: "BRI", invoice: "BJ_25-08_1695", tanggalTTB: "29 Agustus 2025", ttb: "TTB_25_08_2043", jemputDokumen: "Candra", prosesSamsat: "Ahmad", pengantaranKembali: "Candra" },
  { id: 10, tanggal: "29 Agustus 2025", nopol: "B 1111 WXY", customer: "RUDI HARTONO", namaBerkas: "RUDI HARTONO", pengurusan: "Pajak tahunan", uangMasuk: 1200000, biayaSamsat: 600000, profit: 600000, rekening: "CIMB", invoice: "BJ_25-08_1696", tanggalTTB: "30 Agustus 2025", ttb: "TTB_25_08_2044", jemputDokumen: "Ahmad", prosesSamsat: "Budi", pengantaranKembali: "Ahmad" },
  { id: 11, tanggal: "30 Agustus 2025", nopol: "D 2222 ZAB", customer: "MAYA SARI", namaBerkas: "MAYA SARI", pengurusan: "Mutasi LD", uangMasuk: 4700000, biayaSamsat: 3100000, profit: 1600000, rekening: "BCA", invoice: "BJ_25-08_1697", tanggalTTB: "31 Agustus 2025", ttb: "TTB_25_08_2045", jemputDokumen: "Budi", prosesSamsat: "Candra", pengantaranKembali: "Budi" },
  { id: 12, tanggal: "31 Agustus 2025", nopol: "F 3333 CDE", customer: "TONO SUSANTO", namaBerkas: "TONO SUSANTO", pengurusan: "Ganti plat", uangMasuk: 900000, biayaSamsat: 550000, profit: 350000, rekening: "Mandiri", invoice: "BJ_25-08_1698", tanggalTTB: "01 September 2025", ttb: "TTB_25_08_2046", jemputDokumen: "Candra", prosesSamsat: "Ahmad", pengantaranKembali: "Candra" },
  { id: 13, tanggal: "01 September 2025", nopol: "B 4444 FGH", customer: "LINDA PERMATA", namaBerkas: "LINDA PERMATA", pengurusan: "BBN 1", uangMasuk: 5800000, biayaSamsat: 4000000, profit: 1800000, rekening: "BRI", invoice: "BJ_25-09_1699", tanggalTTB: "02 September 2025", ttb: "TTB_25_09_2047", jemputDokumen: "Ahmad", prosesSamsat: "Budi", pengantaranKembali: "Ahmad" },
  { id: 14, tanggal: "02 September 2025", nopol: "D 5555 IJK", customer: "HENDRA WIJAYA", namaBerkas: "HENDRA WIJAYA", pengurusan: "Pajak 5 tahunan", uangMasuk: 2800000, biayaSamsat: 2000000, profit: 800000, rekening: "BCA", invoice: "BJ_25-09_1700", tanggalTTB: "03 September 2025", ttb: "TTB_25_09_2048", jemputDokumen: "Budi", prosesSamsat: "Candra", pengantaranKembali: "Budi" },
  { id: 15, tanggal: "03 September 2025", nopol: "F 6666 LMN", customer: "PUTRI AMANDA", namaBerkas: "PUTRI AMANDA", pengurusan: "Mutasi AS", uangMasuk: 4900000, biayaSamsat: 3300000, profit: 1600000, rekening: "Mandiri", invoice: "BJ_25-09_1701", tanggalTTB: "04 September 2025", ttb: "TTB_25_09_2049", jemputDokumen: "Candra", prosesSamsat: "Ahmad", pengantaranKembali: "Candra" },
];

export const kasMessengerData: KasMessengerItem[] = [
  { id: 1, tanggal: "01 November 2024", jenis: "Petty cash", messenger: "Ahmad", keterangan: "Top up kas awal bulan", in: 5000000, out: 0, total: 5000000 },
  { id: 2, tanggal: "01 November 2024", jenis: "Operasional", messenger: "Ahmad", keterangan: "Bensin + parkir", in: 0, out: 150000, total: 4850000 },
  { id: 3, tanggal: "02 November 2024", jenis: "Operasional", messenger: "Budi", keterangan: "Makan siang + tol", in: 0, out: 180000, total: 4670000 },
  { id: 4, tanggal: "03 November 2024", jenis: "Petty cash", messenger: "Ahmad", keterangan: "Top up tambahan", in: 2000000, out: 0, total: 6670000 },
  { id: 5, tanggal: "03 November 2024", jenis: "Operasional", messenger: "Candra", keterangan: "Bensin motor", in: 0, out: 100000, total: 6570000 },
  { id: 6, tanggal: "04 November 2024", jenis: "Biaya Samsat", messenger: "Ahmad", keterangan: "Bayar di Samsat", in: 0, out: 850000, total: 5720000 },
  { id: 7, tanggal: "05 November 2024", jenis: "Operasional", messenger: "Budi", keterangan: "Parkir + makan", in: 0, out: 120000, total: 5600000 },
  { id: 8, tanggal: "06 November 2024", jenis: "Biaya Samsat", messenger: "Candra", keterangan: "Pengurusan BBN", in: 0, out: 1500000, total: 4100000 },
  { id: 9, tanggal: "07 November 2024", jenis: "Petty cash", messenger: "Ahmad", keterangan: "Refund dari customer", in: 500000, out: 0, total: 4600000 },
  { id: 10, tanggal: "08 November 2024", jenis: "Operasional", messenger: "Ahmad", keterangan: "Bensin + tol", in: 0, out: 170000, total: 4430000 },
  { id: 11, tanggal: "09 November 2024", jenis: "Biaya Samsat", messenger: "Budi", keterangan: "Pajak tahunan", in: 0, out: 650000, total: 3780000 },
  { id: 12, tanggal: "10 November 2024", jenis: "Operasional", messenger: "Candra", keterangan: "Makan + parkir", in: 0, out: 95000, total: 3685000 },
];

export const kasKantorData: KasKantorItem[] = [
  { id: 1, tanggal: "01 November 2024", status: "Debit", keterangan: "Pembayaran dari PT. Maju Jaya", debit: 5000000, kredit: 0, total: 5000000 },
  { id: 2, tanggal: "01 November 2024", status: "Kredit", keterangan: "Bayar sewa kantor", debit: 0, kredit: 3000000, total: 2000000 },
  { id: 3, tanggal: "02 November 2024", status: "Debit", keterangan: "Pembayaran dari John Doe", debit: 4500000, kredit: 0, total: 6500000 },
  { id: 4, tanggal: "03 November 2024", status: "Kredit", keterangan: "Bayar listrik & air", debit: 0, kredit: 500000, total: 6000000 },
  { id: 5, tanggal: "04 November 2024", status: "Debit", keterangan: "Transfer dari Siti Rahayu", debit: 6000000, kredit: 0, total: 12000000 },
  { id: 6, tanggal: "05 November 2024", status: "Kredit", keterangan: "Gaji karyawan", debit: 0, kredit: 8000000, total: 4000000 },
  { id: 7, tanggal: "06 November 2024", status: "Debit", keterangan: "Pembayaran cash Ahmad Rizki", debit: 2500000, kredit: 0, total: 6500000 },
  { id: 8, tanggal: "07 November 2024", status: "Kredit", keterangan: "Internet bulanan", debit: 0, kredit: 300000, total: 6200000 },
  { id: 9, tanggal: "08 November 2024", status: "Debit", keterangan: "Transfer dari PT. Global", debit: 4800000, kredit: 0, total: 11000000 },
  { id: 10, tanggal: "09 November 2024", status: "Kredit", keterangan: "ATK dan supplies", debit: 0, kredit: 750000, total: 10250000 },
  { id: 11, tanggal: "10 November 2024", status: "Debit", keterangan: "Pembayaran dari Andi Wijaya", debit: 1500000, kredit: 0, total: 11750000 },
  { id: 12, tanggal: "11 November 2024", status: "Kredit", keterangan: "Maintenance AC", debit: 0, kredit: 450000, total: 11300000 },
];

export const pengeluaranKantorData: PengeluaranItem[] = [
  { id: 1, tanggal: "01 November 2024", keterangan: "Sewa kantor", nominal: 3000000 },
  { id: 2, tanggal: "01 November 2024", keterangan: "Listrik bulan Oktober", nominal: 450000 },
  { id: 3, tanggal: "01 November 2024", keterangan: "Air PDAM Oktober", nominal: 150000 },
  { id: 4, tanggal: "02 November 2024", keterangan: "Internet & telepon", nominal: 300000 },
  { id: 5, tanggal: "03 November 2024", keterangan: "ATK dan supplies", nominal: 750000 },
  { id: 6, tanggal: "05 November 2024", keterangan: "Gaji karyawan November", nominal: 8000000 },
  { id: 7, tanggal: "07 November 2024", keterangan: "Service AC kantor", nominal: 450000 },
  { id: 8, tanggal: "08 November 2024", keterangan: "Kebersihan kantor", nominal: 400000 },
  { id: 9, tanggal: "10 November 2024", keterangan: "Makan siang tim", nominal: 350000 },
  { id: 10, tanggal: "12 November 2024", keterangan: "Bensin operasional", nominal: 500000 },
  { id: 11, tanggal: "15 November 2024", keterangan: "Toner printer", nominal: 280000 },
  { id: 12, tanggal: "18 November 2024", keterangan: "Parkir bulanan", nominal: 200000 },
  { id: 13, tanggal: "20 November 2024", keterangan: "Materai dan administrasi", nominal: 150000 },
  { id: 14, tanggal: "25 November 2024", keterangan: "Service komputer", nominal: 350000 },
  { id: 15, tanggal: "28 November 2024", keterangan: "Biaya tak terduga", nominal: 500000 },
];

export const belumKurangBayarData: BelumKurangBayarItem[] = [
  { id: 1, tanggal: "15 Oktober 2024", nopol: "B 1111 AAA", customer: "TOKO SEJAHTERA", namaBerkas: "BAMBANG S", pengurusan: "Mutasi LD", uangMasuk: 3000000, biayaSamsat: 3500000, profit: -500000, status: "Kurang bayar", invoice: "BJ_24-10_1500", kekurangan: 500000 },
  { id: 2, tanggal: "18 Oktober 2024", nopol: "D 2222 BBB", customer: "CV. MANDIRI", namaBerkas: "SUSAN TAN", pengurusan: "BBN 1", uangMasuk: 0, biayaSamsat: 4200000, profit: -4200000, status: "Belum bayar", invoice: "BJ_24-10_1523", kekurangan: 6000000 },
  { id: 3, tanggal: "20 Oktober 2024", nopol: "F 3333 CCC", customer: "PT. SENTOSA", namaBerkas: "AGUS SALIM", pengurusan: "Pajak 5 tahunan", uangMasuk: 2000000, biayaSamsat: 2300000, profit: -300000, status: "Kurang bayar", invoice: "BJ_24-10_1545", kekurangan: 300000 },
  { id: 4, tanggal: "22 Oktober 2024", nopol: "B 4444 DDD", customer: "TOKO ELEKTRONIK", namaBerkas: "LIA KUSUMA", pengurusan: "Mutasi AS", uangMasuk: 0, biayaSamsat: 3200000, profit: -3200000, status: "Belum bayar", invoice: "BJ_24-10_1567", kekurangan: 4800000 },
  { id: 5, tanggal: "25 Oktober 2024", nopol: "D 5555 EEE", customer: "WARUNG MAKAN", namaBerkas: "SAMSUL HADI", pengurusan: "Perpanjangan STNK", uangMasuk: 1000000, biayaSamsat: 1300000, profit: -300000, status: "Kurang bayar", invoice: "BJ_24-10_1589", kekurangan: 300000 },
  { id: 6, tanggal: "27 Oktober 2024", nopol: "F 6666 FFF", customer: "BENGKEL MOTOR", namaBerkas: "JOKO SANTOSO", pengurusan: "Ganti plat", uangMasuk: 0, biayaSamsat: 550000, profit: -550000, status: "Belum bayar", invoice: "BJ_24-10_1601", kekurangan: 900000 },
  { id: 7, tanggal: "28 Oktober 2024", nopol: "B 7777 GGG", customer: "SALON CANTIK", namaBerkas: "RATNA SARI", pengurusan: "BBN 2", uangMasuk: 4500000, biayaSamsat: 5200000, profit: -700000, status: "Kurang bayar", invoice: "BJ_24-10_1612", kekurangan: 700000 },
  { id: 8, tanggal: "29 Oktober 2024", nopol: "D 8888 HHH", customer: "FOTOCOPY 24 JAM", namaBerkas: "DEDI SURYADI", pengurusan: "Pajak tahunan", uangMasuk: 0, biayaSamsat: 800000, profit: -800000, status: "Belum bayar", invoice: "BJ_24-10_1625", kekurangan: 1500000 },
  { id: 9, tanggal: "30 Oktober 2024", nopol: "F 9999 III", customer: "LAUNDRY EXPRESS", namaBerkas: "WATI LESTARI", pengurusan: "Duplikat STNK", uangMasuk: 600000, biayaSamsat: 850000, profit: -250000, status: "Kurang bayar", invoice: "BJ_24-10_1638", kekurangan: 250000 },
  { id: 10, tanggal: "31 Oktober 2024", nopol: "B 1010 JJJ", customer: "TOKO KELONTONG", namaBerkas: "HASAN BASRI", pengurusan: "Mutasi LD", uangMasuk: 0, biayaSamsat: 3500000, profit: -3500000, status: "Belum bayar", invoice: "BJ_24-10_1649", kekurangan: 5000000 },
];

export const profitTerpendingData: ProfitTerpendingItem[] = [
  { id: 1, tanggal: "05 November 2024", nopol: "B 1234 PPP", customer: "TOKO BAJU", namaBerkas: "SANTI DEWI", pengurusan: "Balik nama", uangMasuk: 4000000, biayaSamsat: 2800000, profit: 1200000, status: "Profit pending", invoice: "BJ_24-11_1700", alasan: "Menunggu proses selesai" },
  { id: 2, tanggal: "06 November 2024", nopol: "D 5678 QQQ", customer: "RESTORAN PADANG", namaBerkas: "YUSUF HAKIM", pengurusan: "Mutasi LD", uangMasuk: 5200000, biayaSamsat: 3600000, profit: 1600000, status: "Profit pending", invoice: "BJ_24-11_1711", alasan: "Konfirmasi customer" },
  { id: 3, tanggal: "07 November 2024", nopol: "F 9012 RRR", customer: "MINIMARKET", namaBerkas: "RINA OKTAVIA", pengurusan: "BBN 1", uangMasuk: 6200000, biayaSamsat: 4400000, profit: 1800000, status: "Profit pending", invoice: "BJ_24-11_1722", alasan: "Dokumen kurang" },
  { id: 4, tanggal: "08 November 2024", nopol: "B 3456 SSS", customer: "COUNTER HP", namaBerkas: "IWAN SETIAWAN", pengurusan: "Pajak 5 tahunan", uangMasuk: 2700000, biayaSamsat: 1900000, profit: 800000, status: "Profit pending", invoice: "BJ_24-11_1733", alasan: "Verifikasi data" },
  { id: 5, tanggal: "09 November 2024", nopol: "D 7890 TTT", customer: "APOTEK SEHAT", namaBerkas: "DWI ANGGRAENI", pengurusan: "Mutasi AS", uangMasuk: 4600000, biayaSamsat: 3000000, profit: 1600000, status: "Profit pending", invoice: "BJ_24-11_1744", alasan: "Proses administrasi" },
  { id: 6, tanggal: "10 November 2024", nopol: "F 2468 UUU", customer: "PERCETAKAN", namaBerkas: "HADI PURNOMO", pengurusan: "Perpanjangan STNK", uangMasuk: 1400000, biayaSamsat: 750000, profit: 650000, status: "Profit pending", invoice: "BJ_24-11_1755", alasan: "Tunggu TTB" },
  { id: 7, tanggal: "11 November 2024", nopol: "B 1357 VVV", customer: "TOKO SEMBAKO", namaBerkas: "NURUL HIDAYAH", pengurusan: "Ganti plat", uangMasuk: 950000, biayaSamsat: 600000, profit: 350000, status: "Profit pending", invoice: "BJ_24-11_1766", alasan: "Koordinasi samsat" },
  { id: 8, tanggal: "12 November 2024", nopol: "D 2468 WWW", customer: "WARUNG KOPI", namaBerkas: "TRI WAHYUDI", pengurusan: "BBN 2", uangMasuk: 5400000, biayaSamsat: 3700000, profit: 1700000, status: "Profit pending", invoice: "BJ_24-11_1777", alasan: "Cek fisik pending" },
  { id: 9, tanggal: "13 November 2024", nopol: "F 3579 XXX", customer: "BENGKEL LAS", namaBerkas: "SUMANTO", pengurusan: "Pajak tahunan", uangMasuk: 1350000, biayaSamsat: 680000, profit: 670000, status: "Profit pending", invoice: "BJ_24-11_1788", alasan: "Konfirmasi biaya" },
  { id: 10, tanggal: "14 November 2024", nopol: "B 4680 YYY", customer: "LAUNDRY KILOAN", namaBerkas: "ANI SUSILOWATI", pengurusan: "Duplikat STNK", uangMasuk: 850000, biayaSamsat: 520000, profit: 330000, status: "Profit pending", invoice: "BJ_24-11_1799", alasan: "Proses duplikat" },
];

export const cashbackTerpendingData: CashbackTerpendingItem[] = [
  { id: 1, tanggal: "01 November 2024", nopol: "B 1111 CBA", customer: "PT. BERKAH JAYA", namaBerkas: "DIREKTUR UTAMA", pengurusan: "Mutasi LD", uangMasuk: 5500000, profit: 1800000, status: "Cashback pending", invoice: "BJ_24-11_1800", jumlahCashback: 200000, cashbackPersen: "3.6%" },
  { id: 2, tanggal: "02 November 2024", nopol: "D 2222 CBA", customer: "CV. SENTOSA", namaBerkas: "PEMILIK CV", pengurusan: "BBN 1", uangMasuk: 6800000, profit: 2200000, status: "Cashback pending", invoice: "BJ_24-11_1811", jumlahCashback: 250000, cashbackPersen: "3.7%" },
  { id: 3, tanggal: "03 November 2024", nopol: "F 3333 CBA", customer: "TOKO BANGUNAN", namaBerkas: "BAMBANG W", pengurusan: "Pajak 5 tahunan", uangMasuk: 2900000, profit: 900000, status: "Cashback pending", invoice: "BJ_24-11_1822", jumlahCashback: 100000, cashbackPersen: "3.4%" },
  { id: 4, tanggal: "04 November 2024", nopol: "B 4444 CBA", customer: "RUMAH MAKAN", namaBerkas: "SUTRISNO", pengurusan: "Mutasi AS", uangMasuk: 4900000, profit: 1700000, status: "Cashback pending", invoice: "BJ_24-11_1833", jumlahCashback: 180000, cashbackPersen: "3.7%" },
  { id: 5, tanggal: "05 November 2024", nopol: "D 5555 CBA", customer: "SALON KECANTIKAN", namaBerkas: "RATIH KUSUMA", pengurusan: "Perpanjangan STNK", uangMasuk: 1600000, profit: 750000, status: "Cashback pending", invoice: "BJ_24-11_1844", jumlahCashback: 75000, cashbackPersen: "4.7%" },
  { id: 6, tanggal: "06 November 2024", nopol: "F 6666 CBA", customer: "BENGKEL MOBIL", namaBerkas: "TEGUH SUSILO", pengurusan: "Ganti plat", uangMasuk: 1050000, profit: 420000, status: "Cashback pending", invoice: "BJ_24-11_1855", jumlahCashback: 50000, cashbackPersen: "4.8%" },
  { id: 7, tanggal: "07 November 2024", nopol: "B 7777 CBA", customer: "FOTOKOPI & PRINTING", namaBerkas: "YUNI SAFITRI", pengurusan: "BBN 2", uangMasuk: 5900000, profit: 2000000, status: "Cashback pending", invoice: "BJ_24-11_1866", jumlahCashback: 220000, cashbackPersen: "3.7%" },
  { id: 8, tanggal: "08 November 2024", nopol: "D 8888 CBA", customer: "WARUNG NASI", namaBerkas: "SLAMET RIYADI", pengurusan: "Pajak tahunan", uangMasuk: 1450000, profit: 720000, status: "Cashback pending", invoice: "BJ_24-11_1877", jumlahCashback: 70000, cashbackPersen: "4.8%" },
  { id: 9, tanggal: "09 November 2024", nopol: "F 9999 CBA", customer: "APOTEK 24 JAM", namaBerkas: "dr. FAISAL", pengurusan: "Balik nama", uangMasuk: 4200000, profit: 1400000, status: "Cashback pending", invoice: "BJ_24-11_1888", jumlahCashback: 150000, cashbackPersen: "3.6%" },
  { id: 10, tanggal: "10 November 2024", nopol: "B 1010 CBA", customer: "TOKO ROTI", namaBerkas: "HENDRA TAN", pengurusan: "Duplikat STNK", uangMasuk: 920000, profit: 380000, status: "Cashback pending", invoice: "BJ_24-11_1899", jumlahCashback: 45000, cashbackPersen: "4.9%" },
];

export const tagihanData: TagihanItem[] = [
  { id: 1, tanggal: "01 November 2024", customer: "PT. MAJU JAYA", nopol: "B 1234 ABC", jenisLayanan: "Mutasi LD", totalTagihan: 5000000, terbayar: 5000000, sisa: 0, status: "Lunas", jatuhTempo: "05 November 2024" },
  { id: 2, tanggal: "02 November 2024", customer: "TOKO SEJAHTERA", nopol: "D 5678 DEF", jenisLayanan: "BBN 1", totalTagihan: 6000000, terbayar: 3000000, sisa: 3000000, status: "Belum lunas", jatuhTempo: "10 November 2024" },
  { id: 3, tanggal: "03 November 2024", customer: "CV. MANDIRI", nopol: "F 9012 GHI", jenisLayanan: "Pajak tahunan", totalTagihan: 1500000, terbayar: 1500000, sisa: 0, status: "Lunas", jatuhTempo: "08 November 2024" },
  { id: 4, tanggal: "04 November 2024", customer: "WARUNG MAKAN", nopol: "B 3456 JKL", jenisLayanan: "Mutasi AS", totalTagihan: 4800000, terbayar: 2000000, sisa: 2800000, status: "Belum lunas", jatuhTempo: "12 November 2024" },
  { id: 5, tanggal: "05 November 2024", customer: "SALON CANTIK", nopol: "D 7890 MNO", jenisLayanan: "Perpanjangan 5 tahun", totalTagihan: 2500000, terbayar: 2500000, sisa: 0, status: "Lunas", jatuhTempo: "10 November 2024" },
  { id: 6, tanggal: "06 November 2024", customer: "BENGKEL MOTOR", nopol: "F 2468 PQR", jenisLayanan: "Ganti plat", totalTagihan: 900000, terbayar: 0, sisa: 900000, status: "Belum bayar", jatuhTempo: "11 November 2024" },
  { id: 7, tanggal: "07 November 2024", customer: "TOKO BANGUNAN", nopol: "B 1357 STU", jenisLayanan: "BBN 2", totalTagihan: 5500000, terbayar: 5500000, sisa: 0, status: "Lunas", jatuhTempo: "15 November 2024" },
  { id: 8, tanggal: "08 November 2024", customer: "FOTOCOPY 24 JAM", nopol: "D 9753 VWX", jenisLayanan: "Duplikat STNK", totalTagihan: 800000, terbayar: 500000, sisa: 300000, status: "Belum lunas", jatuhTempo: "13 November 2024" },
  { id: 9, tanggal: "09 November 2024", customer: "LAUNDRY KILOAN", nopol: "F 8642 YZA", jenisLayanan: "Pajak tahunan", totalTagihan: 1200000, terbayar: 1200000, sisa: 0, status: "Lunas", jatuhTempo: "14 November 2024" },
  { id: 10, tanggal: "10 November 2024", customer: "RUMAH MAKAN PADANG", nopol: "B 7531 BCD", jenisLayanan: "Mutasi LD", totalTagihan: 4700000, terbayar: 1000000, sisa: 3700000, status: "Belum lunas", jatuhTempo: "18 November 2024" },
  { id: 11, tanggal: "11 November 2024", customer: "APOTEK SEHAT", nopol: "D 8520 EFG", jenisLayanan: "Balik nama", totalTagihan: 4000000, terbayar: 4000000, sisa: 0, status: "Lunas", jatuhTempo: "16 November 2024" },
  { id: 12, tanggal: "12 November 2024", customer: "COUNTER HP", nopol: "F 9630 HIJ", jenisLayanan: "Perpanjangan STNK", totalTagihan: 1400000, terbayar: 700000, sisa: 700000, status: "Belum lunas", jatuhTempo: "20 November 2024" },
];

export const labaRugiData: LabaRugiMonthlyItem[] = [
  { bulan: "Januari", pendapatan: 24000000, pengeluaran: 15000000, laba: 9000000 },
  { bulan: "Februari", pendapatan: 28000000, pengeluaran: 16000000, laba: 12000000 },
  { bulan: "Maret", pendapatan: 32000000, pengeluaran: 18000000, laba: 14000000 },
  { bulan: "April", pendapatan: 29000000, pengeluaran: 17000000, laba: 12000000 },
  { bulan: "Mei", pendapatan: 38000000, pengeluaran: 20000000, laba: 18000000 },
  { bulan: "Juni", pendapatan: 45250000, pengeluaran: 22000000, laba: 23250000 },
];

export const mutasiLDData: PenjualanItem[] = [
  { id: 1, tglMasuk: "01 November 2024", r4r2: "R4", nopol: "B 1234 ABC", customer: "PT. MAJU JAYA", namaSesuaiBPKB: "BUDI SANTOSO", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "02 November 2024", uangMasuk: 5000000, bank: "BCA", uangKeluar: 3500000, tglUangKeluar: "03 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-LD-001", tglInvoice: "01 November 2024", tandaTerima: "TT-001", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-001" },
  { id: 2, tglMasuk: "02 November 2024", r4r2: "R2", nopol: "D 5678 EFG", customer: "TOKO SEJAHTERA", namaSesuaiBPKB: "AHMAD WIJAYA", jenisPengurusan: "Mutasi LD", jenisBayar: "Cash", tglUangMasuk: "03 November 2024", uangMasuk: 4800000, bank: "Cash", uangKeluar: 3300000, tglUangKeluar: "04 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-LD-002", tglInvoice: "02 November 2024", tandaTerima: "TT-002", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-002" },
  { id: 3, tglMasuk: "03 November 2024", r4r2: "R4", nopol: "F 9012 HIJ", customer: "CV. MANDIRI", namaSesuaiBPKB: "SUSAN TAN", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "04 November 2024", uangMasuk: 5200000, bank: "Mandiri", uangKeluar: 3600000, tglUangKeluar: "05 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Proses", noInvoice: "INV-LD-003", tglInvoice: "03 November 2024", tandaTerima: "-", bpkb: "Belum", statusBPKB: "Proses", ttbBPKB: "-" },
  { id: 4, tglMasuk: "04 November 2024", r4r2: "R2", nopol: "B 3456 KLM", customer: "WARUNG MAKAN", namaSesuaiBPKB: "SLAMET RIYADI", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "05 November 2024", uangMasuk: 4700000, bank: "BRI", uangKeluar: 3200000, tglUangKeluar: "06 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-LD-004", tglInvoice: "04 November 2024", tandaTerima: "TT-004", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-004" },
  { id: 5, tglMasuk: "05 November 2024", r4r2: "R4", nopol: "D 7890 NOP", customer: "SALON CANTIK", namaSesuaiBPKB: "RATNA SARI", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "06 November 2024", uangMasuk: 5100000, bank: "BCA", uangKeluar: 3450000, tglUangKeluar: "07 November 2024", uangKeluarDari: "Kas kantor", profit: 1650000, status: "Selesai", noInvoice: "INV-LD-005", tglInvoice: "05 November 2024", tandaTerima: "TT-005", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-005" },
  { id: 6, tglMasuk: "06 November 2024", r4r2: "R2", nopol: "F 2468 QRS", customer: "BENGKEL MOTOR", namaSesuaiBPKB: "JOKO SANTOSO", jenisPengurusan: "Mutasi LD", jenisBayar: "Cash", tglUangMasuk: "07 November 2024", uangMasuk: 4900000, bank: "Cash", uangKeluar: 3400000, tglUangKeluar: "08 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-LD-006", tglInvoice: "06 November 2024", tandaTerima: "TT-006", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-006" },
  { id: 7, tglMasuk: "07 November 2024", r4r2: "R4", nopol: "B 1357 TUV", customer: "TOKO BANGUNAN", namaSesuaiBPKB: "BAMBANG W", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "08 November 2024", uangMasuk: 5300000, bank: "Mandiri", uangKeluar: 3700000, tglUangKeluar: "09 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Proses", noInvoice: "INV-LD-007", tglInvoice: "07 November 2024", tandaTerima: "-", bpkb: "Belum", statusBPKB: "Proses", ttbBPKB: "-" },
  { id: 8, tglMasuk: "08 November 2024", r4r2: "R2", nopol: "D 9753 WXY", customer: "FOTOCOPY 24 JAM", namaSesuaiBPKB: "DEDI SURYADI", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "09 November 2024", uangMasuk: 4850000, bank: "BRI", uangKeluar: 3350000, tglUangKeluar: "10 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-LD-008", tglInvoice: "08 November 2024", tandaTerima: "TT-008", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-008" },
  { id: 9, tglMasuk: "09 November 2024", r4r2: "R4", nopol: "F 8642 ZAB", customer: "LAUNDRY KILOAN", namaSesuaiBPKB: "WATI LESTARI", jenisPengurusan: "Mutasi LD", jenisBayar: "Cash", tglUangMasuk: "10 November 2024", uangMasuk: 4750000, bank: "Cash", uangKeluar: 3250000, tglUangKeluar: "11 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-LD-009", tglInvoice: "09 November 2024", tandaTerima: "TT-009", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-009" },
  { id: 10, tglMasuk: "10 November 2024", r4r2: "R2", nopol: "B 7531 CDE", customer: "RUMAH MAKAN PADANG", namaSesuaiBPKB: "YUSUF HAKIM", jenisPengurusan: "Mutasi LD", jenisBayar: "Transfer", tglUangMasuk: "11 November 2024", uangMasuk: 5050000, bank: "BCA", uangKeluar: 3500000, tglUangKeluar: "12 November 2024", uangKeluarDari: "Kas kantor", profit: 1550000, status: "Selesai", noInvoice: "INV-LD-010", tglInvoice: "10 November 2024", tandaTerima: "TT-010", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-010" },
];

export const mutasiASData: PenjualanItem[] = [
  { id: 1, tglMasuk: "01 November 2024", r4r2: "R2", nopol: "D 1111 ASA", customer: "TOKO BAJU", namaSesuaiBPKB: "SANTI DEWI", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "02 November 2024", uangMasuk: 4800000, bank: "Mandiri", uangKeluar: 3200000, tglUangKeluar: "03 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Selesai", noInvoice: "INV-AS-001", tglInvoice: "01 November 2024", tandaTerima: "TT-AS-001", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-001" },
  { id: 2, tglMasuk: "02 November 2024", r4r2: "R4", nopol: "F 2222 ASB", customer: "RESTORAN PADANG", namaSesuaiBPKB: "YUSUF HAKIM", jenisPengurusan: "Mutasi AS", jenisBayar: "Cash", tglUangMasuk: "03 November 2024", uangMasuk: 4600000, bank: "Cash", uangKeluar: 3100000, tglUangKeluar: "04 November 2024", uangKeluarDari: "Kas kantor", profit: 1500000, status: "Selesai", noInvoice: "INV-AS-002", tglInvoice: "02 November 2024", tandaTerima: "TT-AS-002", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-002" },
  { id: 3, tglMasuk: "03 November 2024", r4r2: "R2", nopol: "B 3333 ASC", customer: "MINIMARKET", namaSesuaiBPKB: "RINA OKTAVIA", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "04 November 2024", uangMasuk: 4900000, bank: "BRI", uangKeluar: 3300000, tglUangKeluar: "05 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Proses", noInvoice: "INV-AS-003", tglInvoice: "03 November 2024", tandaTerima: "-", bpkb: "Belum", statusBPKB: "Proses", ttbBPKB: "-" },
  { id: 4, tglMasuk: "04 November 2024", r4r2: "R4", nopol: "D 4444 ASD", customer: "COUNTER HP", namaSesuaiBPKB: "IWAN SETIAWAN", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "05 November 2024", uangMasuk: 4700000, bank: "BCA", uangKeluar: 3150000, tglUangKeluar: "06 November 2024", uangKeluarDari: "Kas kantor", profit: 1550000, status: "Selesai", noInvoice: "INV-AS-004", tglInvoice: "04 November 2024", tandaTerima: "TT-AS-004", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-004" },
  { id: 5, tglMasuk: "05 November 2024", r4r2: "R2", nopol: "F 5555 ASE", customer: "APOTEK SEHAT", namaSesuaiBPKB: "DWI ANGGRAENI", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "06 November 2024", uangMasuk: 4850000, bank: "Mandiri", uangKeluar: 3250000, tglUangKeluar: "07 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Selesai", noInvoice: "INV-AS-005", tglInvoice: "05 November 2024", tandaTerima: "TT-AS-005", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-005" },
  { id: 6, tglMasuk: "06 November 2024", r4r2: "R4", nopol: "B 6666 ASF", customer: "PERCETAKAN", namaSesuaiBPKB: "HADI PURNOMO", jenisPengurusan: "Mutasi AS", jenisBayar: "Cash", tglUangMasuk: "07 November 2024", uangMasuk: 4650000, bank: "Cash", uangKeluar: 3100000, tglUangKeluar: "08 November 2024", uangKeluarDari: "Kas kantor", profit: 1550000, status: "Selesai", noInvoice: "INV-AS-006", tglInvoice: "06 November 2024", tandaTerima: "TT-AS-006", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-006" },
  { id: 7, tglMasuk: "07 November 2024", r4r2: "R2", nopol: "D 7777 ASG", customer: "TOKO SEMBAKO", namaSesuaiBPKB: "NURUL HIDAYAH", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "08 November 2024", uangMasuk: 4800000, bank: "BRI", uangKeluar: 3200000, tglUangKeluar: "09 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Proses", noInvoice: "INV-AS-007", tglInvoice: "07 November 2024", tandaTerima: "-", bpkb: "Belum", statusBPKB: "Proses", ttbBPKB: "-" },
  { id: 8, tglMasuk: "08 November 2024", r4r2: "R4", nopol: "F 8888 ASH", customer: "WARUNG KOPI", namaSesuaiBPKB: "TRI WAHYUDI", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "09 November 2024", uangMasuk: 4750000, bank: "BCA", uangKeluar: 3200000, tglUangKeluar: "10 November 2024", uangKeluarDari: "Kas kantor", profit: 1550000, status: "Selesai", noInvoice: "INV-AS-008", tglInvoice: "08 November 2024", tandaTerima: "TT-AS-008", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-008" },
  { id: 9, tglMasuk: "09 November 2024", r4r2: "R2", nopol: "B 9999 ASI", customer: "BENGKEL LAS", namaSesuaiBPKB: "SUMANTO", jenisPengurusan: "Mutasi AS", jenisBayar: "Cash", tglUangMasuk: "10 November 2024", uangMasuk: 4600000, bank: "Cash", uangKeluar: 3050000, tglUangKeluar: "11 November 2024", uangKeluarDari: "Kas kantor", profit: 1550000, status: "Selesai", noInvoice: "INV-AS-009", tglInvoice: "09 November 2024", tandaTerima: "TT-AS-009", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-009" },
  { id: 10, tglMasuk: "10 November 2024", r4r2: "R4", nopol: "D 1010 ASJ", customer: "LAUNDRY KILOAN", namaSesuaiBPKB: "ANI SUSILOWATI", jenisPengurusan: "Mutasi AS", jenisBayar: "Transfer", tglUangMasuk: "11 November 2024", uangMasuk: 4900000, bank: "Mandiri", uangKeluar: 3300000, tglUangKeluar: "12 November 2024", uangKeluarDari: "Kas kantor", profit: 1600000, status: "Selesai", noInvoice: "INV-AS-010", tglInvoice: "10 November 2024", tandaTerima: "TT-AS-010", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-AS-010" },
];

export const bbnData: PenjualanItem[] = [
  { id: 1, tglMasuk: "01 November 2024", r4r2: "R4", nopol: "F 1111 BBN", customer: "SITI RAHAYU", namaSesuaiBPKB: "SITI RAHAYU", jenisPengurusan: "BBN 1", jenisBayar: "Transfer", tglUangMasuk: "02 November 2024", uangMasuk: 6000000, bank: "BRI", uangKeluar: 4200000, tglUangKeluar: "03 November 2024", uangKeluarDari: "Kas kantor", profit: 1800000, status: "Selesai", noInvoice: "INV-BBN-001", tglInvoice: "01 November 2024", tandaTerima: "TT-BBN-001", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-001" },
  { id: 2, tglMasuk: "02 November 2024", r4r2: "R2", nopol: "B 2222 BBN", customer: "LINDA PERMATA", namaSesuaiBPKB: "LINDA PERMATA", jenisPengurusan: "BBN 1", jenisBayar: "Cash", tglUangMasuk: "03 November 2024", uangMasuk: 5800000, bank: "Cash", uangKeluar: 4000000, tglUangKeluar: "04 November 2024", uangKeluarDari: "Kas kantor", profit: 1800000, status: "Selesai", noInvoice: "INV-BBN-002", tglInvoice: "02 November 2024", tandaTerima: "TT-BBN-002", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-002" },
  { id: 3, tglMasuk: "03 November 2024", r4r2: "R4", nopol: "D 3333 BBN", customer: "HENDRA WIJAYA", namaSesuaiBPKB: "HENDRA WIJAYA", jenisPengurusan: "BBN 2", jenisBayar: "Transfer", tglUangMasuk: "04 November 2024", uangMasuk: 5500000, bank: "BCA", uangKeluar: 3800000, tglUangKeluar: "05 November 2024", uangKeluarDari: "Kas kantor", profit: 1700000, status: "Proses", noInvoice: "INV-BBN-003", tglInvoice: "03 November 2024", tandaTerima: "-", bpkb: "Belum", statusBPKB: "Proses", ttbBPKB: "-" },
  { id: 4, tglMasuk: "04 November 2024", r4r2: "R2", nopol: "F 4444 BBN", customer: "PUTRI AMANDA", namaSesuaiBPKB: "PUTRI AMANDA", jenisPengurusan: "BBN 1", jenisBayar: "Transfer", tglUangMasuk: "05 November 2024", uangMasuk: 6100000, bank: "Mandiri", uangKeluar: 4250000, tglUangKeluar: "06 November 2024", uangKeluarDari: "Kas kantor", profit: 1850000, status: "Selesai", noInvoice: "INV-BBN-004", tglInvoice: "04 November 2024", tandaTerima: "TT-BBN-004", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-004" },
  { id: 5, tglMasuk: "05 November 2024", r4r2: "R4", nopol: "B 5555 BBN", customer: "RUDI HARTONO", namaSesuaiBPKB: "RUDI HARTONO", jenisPengurusan: "BBN 2", jenisBayar: "Transfer", tglUangMasuk: "06 November 2024", uangMasuk: 5700000, bank: "BRI", uangKeluar: 3900000, tglUangKeluar: "07 November 2024", uangKeluarDari: "Kas kantor", profit: 1800000, status: "Selesai", noInvoice: "INV-BBN-005", tglInvoice: "05 November 2024", tandaTerima: "TT-BBN-005", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-005" },
  { id: 6, tglMasuk: "06 November 2024", r4r2: "R2", nopol: "D 6666 BBN", customer: "MAYA SARI", namaSesuaiBPKB: "MAYA SARI", jenisPengurusan: "BBN 1", jenisBayar: "Cash", tglUangMasuk: "07 November 2024", uangMasuk: 5950000, bank: "Cash", uangKeluar: 4150000, tglUangKeluar: "08 November 2024", uangKeluarDari: "Kas kantor", profit: 1800000, status: "Selesai", noInvoice: "INV-BBN-006", tglInvoice: "06 November 2024", tandaTerima: "TT-BBN-006", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-006" },
  { id: 7, tglMasuk: "07 November 2024", r4r2: "R4", nopol: "F 7777 BBN", customer: "TONO SUSANTO", namaSesuaiBPKB: "TONO SUSANTO", jenisPengurusan: "BBN 2", jenisBayar: "Transfer", tglUangMasuk: "08 November 2024", uangMasuk: 5600000, bank: "BCA", uangKeluar: 3850000, tglUangKeluar: "09 November 2024", uangKeluarDari: "Kas kantor", profit: 1750000, status: "Proses", noInvoice: "INV-BBN-007", tglInvoice: "07 November 2024", tandaTerima: "-", bpkb: "Belum", statusBPKB: "Proses", ttbBPKB: "-" },
  { id: 8, tglMasuk: "08 November 2024", r4r2: "R2", nopol: "B 8888 BBN", customer: "CITRA DEWI", namaSesuaiBPKB: "CITRA DEWI", jenisPengurusan: "BBN 1", jenisBayar: "Transfer", tglUangMasuk: "09 November 2024", uangMasuk: 6050000, bank: "Mandiri", uangKeluar: 4200000, tglUangKeluar: "10 November 2024", uangKeluarDari: "Kas kantor", profit: 1850000, status: "Selesai", noInvoice: "INV-BBN-008", tglInvoice: "08 November 2024", tandaTerima: "TT-BBN-008", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-008" },
  { id: 9, tglMasuk: "09 November 2024", r4r2: "R4", nopol: "D 9999 BBN", customer: "ANDI WIJAYA", namaSesuaiBPKB: "ANDI WIJAYA", jenisPengurusan: "BBN 2", jenisBayar: "Cash", tglUangMasuk: "10 November 2024", uangMasuk: 5650000, bank: "Cash", uangKeluar: 3900000, tglUangKeluar: "11 November 2024", uangKeluarDari: "Kas kantor", profit: 1750000, status: "Selesai", noInvoice: "INV-BBN-009", tglInvoice: "09 November 2024", tandaTerima: "TT-BBN-009", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-009" },
  { id: 10, tglMasuk: "10 November 2024", r4r2: "R2", nopol: "F 1010 BBN", customer: "DEWI LESTARI", namaSesuaiBPKB: "DEWI LESTARI", jenisPengurusan: "BBN 1", jenisBayar: "Transfer", tglUangMasuk: "11 November 2024", uangMasuk: 6000000, bank: "BRI", uangKeluar: 4200000, tglUangKeluar: "12 November 2024", uangKeluarDari: "Kas kantor", profit: 1800000, status: "Selesai", noInvoice: "INV-BBN-010", tglInvoice: "10 November 2024", tandaTerima: "TT-BBN-010", bpkb: "Ada", statusBPKB: "Selesai", ttbBPKB: "TTB-BBN-010" },
];

export const perpanjanganPajakData: PenjualanItem[] = [
  { id: 1, tglMasuk: "01 November 2024", r4r2: "R2", nopol: "B 1111 PJK", customer: "AHMAD RIZKI", namaSesuaiBPKB: "AHMAD RIZKI", jenisPengurusan: "Pajak tahunan", jenisBayar: "Transfer", tglUangMasuk: "02 November 2024", uangMasuk: 1500000, bank: "BCA", uangKeluar: 800000, tglUangKeluar: "03 November 2024", uangKeluarDari: "Kas messenger", profit: 700000, status: "Selesai", noInvoice: "INV-PJK-001", tglInvoice: "01 November 2024", tandaTerima: "TT-PJK-001" },
  { id: 2, tglMasuk: "02 November 2024", r4r2: "R4", nopol: "D 2222 PJK", customer: "RUDI HARTONO", namaSesuaiBPKB: "RUDI HARTONO", jenisPengurusan: "Pajak tahunan", jenisBayar: "Cash", tglUangMasuk: "03 November 2024", uangMasuk: 1200000, bank: "Cash", uangKeluar: 600000, tglUangKeluar: "04 November 2024", uangKeluarDari: "Kas messenger", profit: 600000, status: "Selesai", noInvoice: "INV-PJK-002", tglInvoice: "02 November 2024", tandaTerima: "TT-PJK-002" },
  { id: 3, tglMasuk: "03 November 2024", r4r2: "R2", nopol: "F 3333 PJK", customer: "MAYA SARI", namaSesuaiBPKB: "MAYA SARI", jenisPengurusan: "Pajak 5 tahunan", jenisBayar: "Transfer", tglUangMasuk: "04 November 2024", uangMasuk: 2500000, bank: "Mandiri", uangKeluar: 1800000, tglUangKeluar: "05 November 2024", uangKeluarDari: "Kas messenger", profit: 700000, status: "Proses", noInvoice: "INV-PJK-003", tglInvoice: "03 November 2024", tandaTerima: "-" },
  { id: 4, tglMasuk: "04 November 2024", r4r2: "R4", nopol: "B 4444 PJK", customer: "LINDA PERMATA", namaSesuaiBPKB: "LINDA PERMATA", jenisPengurusan: "Perpanjangan STNK", jenisBayar: "Transfer", tglUangMasuk: "05 November 2024", uangMasuk: 1400000, bank: "BRI", uangKeluar: 750000, tglUangKeluar: "06 November 2024", uangKeluarDari: "Kas messenger", profit: 650000, status: "Selesai", noInvoice: "INV-PJK-004", tglInvoice: "04 November 2024", tandaTerima: "TT-PJK-004" },
  { id: 5, tglMasuk: "05 November 2024", r4r2: "R2", nopol: "D 5555 PJK", customer: "HENDRA WIJAYA", namaSesuaiBPKB: "HENDRA WIJAYA", jenisPengurusan: "Pajak 5 tahunan", jenisBayar: "Transfer", tglUangMasuk: "06 November 2024", uangMasuk: 2800000, bank: "BCA", uangKeluar: 2000000, tglUangKeluar: "07 November 2024", uangKeluarDari: "Kas messenger", profit: 800000, status: "Selesai", noInvoice: "INV-PJK-005", tglInvoice: "05 November 2024", tandaTerima: "TT-PJK-005" },
  { id: 6, tglMasuk: "06 November 2024", r4r2: "R4", nopol: "F 6666 PJK", customer: "PUTRI AMANDA", namaSesuaiBPKB: "PUTRI AMANDA", jenisPengurusan: "Pajak tahunan", jenisBayar: "Cash", tglUangMasuk: "07 November 2024", uangMasuk: 1350000, bank: "Cash", uangKeluar: 680000, tglUangKeluar: "08 November 2024", uangKeluarDari: "Kas messenger", profit: 670000, status: "Selesai", noInvoice: "INV-PJK-006", tglInvoice: "06 November 2024", tandaTerima: "TT-PJK-006" },
  { id: 7, tglMasuk: "07 November 2024", r4r2: "R2", nopol: "B 7777 PJK", customer: "TONO SUSANTO", namaSesuaiBPKB: "TONO SUSANTO", jenisPengurusan: "Perpanjangan STNK", jenisBayar: "Transfer", tglUangMasuk: "08 November 2024", uangMasuk: 1450000, bank: "Mandiri", uangKeluar: 780000, tglUangKeluar: "09 November 2024", uangKeluarDari: "Kas messenger", profit: 670000, status: "Proses", noInvoice: "INV-PJK-007", tglInvoice: "07 November 2024", tandaTerima: "-" },
  { id: 8, tglMasuk: "08 November 2024", r4r2: "R4", nopol: "D 8888 PJK", customer: "CITRA DEWI", namaSesuaiBPKB: "CITRA DEWI", jenisPengurusan: "Pajak 5 tahunan", jenisBayar: "Transfer", tglUangMasuk: "09 November 2024", uangMasuk: 2600000, bank: "BRI", uangKeluar: 1850000, tglUangKeluar: "10 November 2024", uangKeluarDari: "Kas messenger", profit: 750000, status: "Selesai", noInvoice: "INV-PJK-008", tglInvoice: "08 November 2024", tandaTerima: "TT-PJK-008" },
  { id: 9, tglMasuk: "09 November 2024", r4r2: "R2", nopol: "F 9999 PJK", customer: "ANDI WIJAYA", namaSesuaiBPKB: "ANDI WIJAYA", jenisPengurusan: "Pajak tahunan", jenisBayar: "Cash", tglUangMasuk: "10 November 2024", uangMasuk: 1300000, bank: "Cash", uangKeluar: 650000, tglUangKeluar: "11 November 2024", uangKeluarDari: "Kas messenger", profit: 650000, status: "Selesai", noInvoice: "INV-PJK-009", tglInvoice: "09 November 2024", tandaTerima: "TT-PJK-009" },
  { id: 10, tglMasuk: "10 November 2024", r4r2: "R4", nopol: "B 1010 PJK", customer: "DEWI LESTARI", namaSesuaiBPKB: "DEWI LESTARI", jenisPengurusan: "Perpanjangan STNK", jenisBayar: "Transfer", tglUangMasuk: "11 November 2024", uangMasuk: 1500000, bank: "BCA", uangKeluar: 800000, tglUangKeluar: "12 November 2024", uangKeluarDari: "Kas messenger", profit: 700000, status: "Selesai", noInvoice: "INV-PJK-010", tglInvoice: "10 November 2024", tandaTerima: "TT-PJK-010" },
];

export const lainnyaData: PenjualanItem[] = [
  { id: 1, tglMasuk: "01 November 2024", r4r2: "R4", nopol: "D 1111 LLL", customer: "DEWI LESTARI", namaSesuaiBPKB: "DEWI LESTARI", jenisPengurusan: "Duplikat STNK", jenisBayar: "Cash", tglUangMasuk: "02 November 2024", uangMasuk: 800000, bank: "Cash", uangKeluar: 500000, tglUangKeluar: "03 November 2024", uangKeluarDari: "Kas messenger", profit: 300000, status: "Selesai", noInvoice: "INV-LLL-001", tglInvoice: "01 November 2024", tandaTerima: "TT-LLL-001" },
  { id: 2, tglMasuk: "02 November 2024", r4r2: "R2", nopol: "F 2222 LLL", customer: "TONO SUSANTO", namaSesuaiBPKB: "TONO SUSANTO", jenisPengurusan: "Ganti plat", jenisBayar: "Transfer", tglUangMasuk: "03 November 2024", uangMasuk: 900000, bank: "Mandiri", uangKeluar: 550000, tglUangKeluar: "04 November 2024", uangKeluarDari: "Kas messenger", profit: 350000, status: "Selesai", noInvoice: "INV-LLL-002", tglInvoice: "02 November 2024", tandaTerima: "TT-LLL-002" },
  { id: 3, tglMasuk: "03 November 2024", r4r2: "R4", nopol: "B 3333 LLL", customer: "LINDA PERMATA", namaSesuaiBPKB: "LINDA PERMATA", jenisPengurusan: "Duplikat BPKB", jenisBayar: "Transfer", tglUangMasuk: "04 November 2024", uangMasuk: 1200000, bank: "BCA", uangKeluar: 850000, tglUangKeluar: "05 November 2024", uangKeluarDari: "Kas messenger", profit: 350000, status: "Proses", noInvoice: "INV-LLL-003", tglInvoice: "03 November 2024", tandaTerima: "-" },
  { id: 4, tglMasuk: "04 November 2024", r4r2: "R2", nopol: "D 4444 LLL", customer: "HENDRA WIJAYA", namaSesuaiBPKB: "HENDRA WIJAYA", jenisPengurusan: "Ganti plat", jenisBayar: "Cash", tglUangMasuk: "05 November 2024", uangMasuk: 950000, bank: "Cash", uangKeluar: 600000, tglUangKeluar: "06 November 2024", uangKeluarDari: "Kas messenger", profit: 350000, status: "Selesai", noInvoice: "INV-LLL-004", tglInvoice: "04 November 2024", tandaTerima: "TT-LLL-004" },
  { id: 5, tglMasuk: "05 November 2024", r4r2: "R4", nopol: "F 5555 LLL", customer: "PUTRI AMANDA", namaSesuaiBPKB: "PUTRI AMANDA", jenisPengurusan: "Duplikat STNK", jenisBayar: "Transfer", tglUangMasuk: "06 November 2024", uangMasuk: 850000, bank: "BRI", uangKeluar: 520000, tglUangKeluar: "07 November 2024", uangKeluarDari: "Kas messenger", profit: 330000, status: "Selesai", noInvoice: "INV-LLL-005", tglInvoice: "05 November 2024", tandaTerima: "TT-LLL-005" },
  { id: 6, tglMasuk: "06 November 2024", r4r2: "R2", nopol: "B 6666 LLL", customer: "RUDI HARTONO", namaSesuaiBPKB: "RUDI HARTONO", jenisPengurusan: "Ganti nama STNK", jenisBayar: "Transfer", tglUangMasuk: "07 November 2024", uangMasuk: 1000000, bank: "Mandiri", uangKeluar: 650000, tglUangKeluar: "08 November 2024", uangKeluarDari: "Kas messenger", profit: 350000, status: "Selesai", noInvoice: "INV-LLL-006", tglInvoice: "06 November 2024", tandaTerima: "TT-LLL-006" },
  { id: 7, tglMasuk: "07 November 2024", r4r2: "R4", nopol: "D 7777 LLL", customer: "MAYA SARI", namaSesuaiBPKB: "MAYA SARI", jenisPengurusan: "Ganti plat", jenisBayar: "Cash", tglUangMasuk: "08 November 2024", uangMasuk: 920000, bank: "Cash", uangKeluar: 580000, tglUangKeluar: "09 November 2024", uangKeluarDari: "Kas messenger", profit: 340000, status: "Proses", noInvoice: "INV-LLL-007", tglInvoice: "07 November 2024", tandaTerima: "-" },
  { id: 8, tglMasuk: "08 November 2024", r4r2: "R2", nopol: "F 8888 LLL", customer: "TONO SUSANTO", namaSesuaiBPKB: "TONO SUSANTO", jenisPengurusan: "Duplikat STNK", jenisBayar: "Transfer", tglUangMasuk: "09 November 2024", uangMasuk: 880000, bank: "BCA", uangKeluar: 540000, tglUangKeluar: "10 November 2024", uangKeluarDari: "Kas messenger", profit: 340000, status: "Selesai", noInvoice: "INV-LLL-008", tglInvoice: "08 November 2024", tandaTerima: "TT-LLL-008" },
  { id: 9, tglMasuk: "09 November 2024", r4r2: "R4", nopol: "B 9999 LLL", customer: "CITRA DEWI", namaSesuaiBPKB: "CITRA DEWI", jenisPengurusan: "Ganti plat hilang", jenisBayar: "Transfer", tglUangMasuk: "10 November 2024", uangMasuk: 1100000, bank: "BRI", uangKeluar: 750000, tglUangKeluar: "11 November 2024", uangKeluarDari: "Kas messenger", profit: 350000, status: "Selesai", noInvoice: "INV-LLL-009", tglInvoice: "09 November 2024", tandaTerima: "TT-LLL-009" },
  { id: 10, tglMasuk: "10 November 2024", r4r2: "R2", nopol: "D 1010 LLL", customer: "ANDI WIJAYA", namaSesuaiBPKB: "ANDI WIJAYA", jenisPengurusan: "Duplikat STNK", jenisBayar: "Cash", tglUangMasuk: "11 November 2024", uangMasuk: 820000, bank: "Cash", uangKeluar: 500000, tglUangKeluar: "12 November 2024", uangKeluarDari: "Kas messenger", profit: 320000, status: "Selesai", noInvoice: "INV-LLL-010", tglInvoice: "10 November 2024", tandaTerima: "TT-LLL-010" },
];
