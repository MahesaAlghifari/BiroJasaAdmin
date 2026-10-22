# 06 — AUDIT LOGIKA BISNIS & PERHITUNGAN
## ALUR KERJA OPERASIONAL, FORMULA FINANSIAL & GATING WEWENANG

**Tanggal Audit:** 22 Oktober 2026  
**Status:** READ-ONLY Business Logic & Math Audit  
**File Output:** `docs/audit_arsitektur_data/06_AUDIT_LOGIKA_BISNIS.md`

---

### 1. Alur Kerja Siklus Hidup Order (Stages 1–8)

Operasional **Admin SUN89** bertumpu pada mesin status (state machine) 8 tahapan terstruktur yang memandu berkas dari penerimaan awal hingga pengantaran hasil Samsat ke tangan klien:

```
┌───────────┐      ┌───────────┐      ┌───────────┐      ┌───────────┐
│  TAHAP 1  │ ───> │  TAHAP 2  │ ───> │  TAHAP 3  │ ───> │  TAHAP 4  │
│ Registrasi│      │ Penjemput │      │ Verifikasi│      │  Loket    │
│ & Intake  │      │  Berkas   │      │ Estimasi  │      │  Samsat   │
└───────────┘      └───────────┘      └───────────┘      └───────────┘
      ▲                                                        │
      │                                                        ▼
┌───────────┐      ┌───────────┐      ┌───────────┐      ┌───────────┐
│  TAHAP 8  │ <─── │  TAHAP 7  │ <─── │  TAHAP 6  │ <─── │  TAHAP 5  │
│Pengantaran│      │Pelunasan &│      │ Approval  │      │ Rekonsil. │
│ & Arsip   │      │ Laba Rugi │      │Supervisor │      │Hasil Samsat│
└───────────┘      └───────────┘      └───────────┘      └───────────┘
```

#### Rincian Aturan Setiap Tahapan:
1. **Tahap 1: Registrasi Order & Intake Dokumen Klien (`currentStep: 1`)**
   - Admin memasukkan identitas pemohon (`customer`, `nomorHP`), data fisik kendaraan (`nopol`, R2/R4, tahun), dan jenis layanan.
   - Mengunggah berkas awal klien (KTP, STNK asli, BPKB asli/surat leasing).
   - Menghasilkan nomor unik `orderNo` dan draft invoice di `finance_invoices`.
2. **Tahap 2: Penjadwalan & Penjemputan Berkas Fisik (`currentStep: 2`)**
   - Penugasan messenger (`assignedMessengerId`) untuk mendatangi alamat pemohon.
   - Kurir wajib mengisi checklist serah terima fisik berkas dan mengunggah foto bukti penjemputan (`pickupProof`).
3. **Tahap 3: Verifikasi Berkas Fisik & Simulasi Estimasi Biaya (`currentStep: 3`)**
   - Staf kantor memeriksa fisik keabsahan STNK/BPKB dan mencocokkan nomor rangka/mesin.
   - Sistem menjalankan simulasi estimasi awal biaya loket dan biaya jasa biro.
4. **Tahap 4: Pengurusan Lapangan di Loket Samsat (`currentStep: 4`)**
   - Penugasan kurir khusus Samsat ke kantor Samsat asal atau tujuan.
   - Pelacakan sub-tahapan loket: Cek Fisik, Fiskal Antar-Daerah, Legalisir, Pendaftaran Loket, Pembayaran Kasir Samsat, Pencetakan STNK/Plat (TNKB).
5. **Tahap 5: Rekonsiliasi Hasil Samsat & Biaya Riil SKKP (`currentStep: 5`)**
   - Berkas selesai diambil dari loket Samsat.
   - Staf menginput nominal pengeluaran riil SKKP resmi (PKB riil, SWDKLLJ riil, PNBP Plat, Legalisir).
   - Pengunggahan foto/scan dokumen hasil baru (STNK baru, SKKP baru, BPKB/Notice Pajak).
6. **Tahap 6: Persetujuan Supervisor (SVP Gating) & Finalisasi Tagihan (`currentStep: 6`)**
   - **Gating Ketat:** Supervisor wajib memverifikasi dokumen hasil (`stage5Verified = true`) dan menyetujui struktur margin harga/diskon (`stage6Approved = true`).
   - Sistem mengunci angka `totalTagihan` pada invoice dan mencatat timestamp persetujuan.
7. **Tahap 7: Pelunasan Tagihan, Realisasi Kas Kantor & Laba Rugi (`currentStep: 7`)**
   - Klien melunasi tagihan (Transfer Bank, QRIS, atau Tunai).
   - Staf finance memverifikasi bukti bayar (`status_verifikasi = 'TERVERIFIKASI'`).
   - Mutasi uang masuk otomatis dicatat ke `kas_kantor`. Jika lunas, status profit berubah dari `PENDING` menjadi `REALIZED`.
8. **Tahap 8: Pengantaran Dokumen ke Klien & Pengarsipan (`currentStep: 8`)**
   - Messenger mengantarkan berkas fisik kembali ke alamat klien (`alamatPengantaran`).
   - Klien menandatangani tanda terima serah terima dokumen fisik.
   - Order dinyatakan `Selesai` dan dapat dipindahkan ke tabel arsip (`is_archived = 1`).

---

### 2. Rumus Matematis & Formula Finansial

#### A. Formula Estimasi Biaya Awal (Tahap 1–3)
```math
TotalEstimasi = PKB_{estimasi} + SWDKLLJ_{estimasi} + Denda_{estimasi} + BiayaJasa_{pokok} + BiayaAntarJemput + PajakProgresif
```
- **Sumber Data:** Master `samsat_pricing`, `service_pricing_configs`, dan input SKKP lama.
- **Tujuan:** Memberikan patokan angka kepada klien sebelum berkas diproses di loket.

#### B. Formula Pengeluaran Riil Samsat (Tahap 5)
```math
BiayaSamsat_{riil} = PKB_{skkp} + SWDKLLJ_{skkp} + Denda_{skkp} + PNBP_{stnk} + PNBP_{tnkb} + BiayaMutasiKeluar + BiayaMutasiMasuk
```
- **Sumber Data:** Lembar SKKP / Kwitansi resmi loket Samsat yang diinput admin di Tahap 5.
- **Tujuan:** Menentukan beban pokok operasional (COGS/HPP) yang dikeluarkan dari kas biro jasa.

#### C. Formula Tagihan Final Klien (Tahap 6)
```math
TotalTagihan = BiayaSamsat_{riil} + BiayaJasa_{disetujui} + BiayaAntarJemput
```
- **Kondisi Khusus:** Jika klien sudah membayar uang muka (DP) pada Tahap 1, maka:
```math
SisaPiutang = TotalTagihan - PembayaranAwal_{terverifikasi}
```

#### D. Formula Laba Bersih (Profit Final Biro Jasa)
```math
ProfitFinal = TotalTagihan - BiayaSamsat_{riil} - Cashback_{pemohon}
```
- **Aturan Realisasi:**
  - Jika invoice **Belum Lunas**, `profit_status = 'PENDING'`. Angka profit belum boleh diakui sebagai pendapatan kas riil.
  - Jika invoice **Lunas**, `profit_status = 'REALIZED'`. Angka profit otomatis masuk ke laporan laba rugi bulanan.

---

### 3. Logika Gating Wewenang Supervisor (SVP Approval)

Sistem menerapkan pembatasan hak eksekusi (gating) untuk mencegah kecurangan dan kesalahan penetapan biaya:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        SUPERVISOR GATING WORKFLOW (STAGES 5 & 6)                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Gating 1: Verifikasi Kelengkapan Dokumen Hasil Samsat (Tahap 5)                      │
│   - Diperiksa: Ketersediaan berkas STNK asli, Notice Pajak (SKKP), dan BPKB.           │
│   - Kondisi Syarat: `stage5Verified === true` dan `stage5VerifiedBy !== null`.         │
│   - Jika belum diverifikasi: Order DILARANG maju ke Tahap 6.                           │
│                                                                                        │
│ • Gating 2: Approval Final Tagihan & Diskon/Cashback (Tahap 6)                         │
│   - Diperiksa: Selisih antara estimasi awal dan biaya riil Samsat.                     │
│   - Jika ada diskon atau perubahan biaya jasa: Memerlukan approval SVP.                │
│   - Kondisi Syarat: `stage6Approved === true` dan `stage6ApprovedBy !== null`.         │
│   - Jika disetujui: Tagihan dikunci dan notifikasi penagihan dikirim ke WhatsApp klien.│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4. Integritas Arus Kas & Pencegahan Dobel Catat (Cash Inflow Rules)

Untuk menjamin keandalan pencatatan keuangan pada `kas_kantor`:
1. **Verifikasi Wajib Sebelum Kas Masuk:** Pembayaran dari klien yang baru diunggah (`MENUNGGU_VERIFIKASI`) **TIDAK BOLEH** langsung menambah saldo `kas_kantor`.
2. **Eksekusi Atomik Saat Verifikasi:** Ketika staf finance mengklik *Verifikasi Pembayaran*:
   - Mutasi status pembayaran di `invoice_payments` diubah menjadi `TERVERIFIKASI`.
   - Kolom `terbayar` di `finance_invoices` bertambah sebesar nominal yang diverifikasi.
   - Record baru di-insert ke tabel `kas_kantor` dengan `jenis_transaksi = 'MASUK'`.
   - Ketiga operasi ini diikat dalam satu blok transaksi **`runInTransaction()`**. Jika salah satu gagal, seluruh mutasi dibatalkan.
3. **Pencegahan Dobel Catat Saldo:**
   - Properti `cashRecordedAmount` pada invoice memantau total dana yang telah masuk buku kas.
   - Sistem menolak verifikasi jika akumulasi nominal pembayaran melebihi `total_tagihan` tanpa konfirmasi kelebihan bayar (*overpayment*).

---

### 5. Logika Logistik Messenger & Siklus Hidup Tugas

Kurir lapangan beroperasi di bawah aturan status siklus penugasan:
- **`NOT_STARTED`:** Tugas baru dibuat di sistem, belum diterima kurir.
- **`READY`:** Kurir telah ditugaskan dan berkas fisik siap diambil di kantor.
- **`IN_PROGRESS`:** Kurir sedang dalam perjalanan ke lokasi klien atau Samsat.
- **`WAITING`:** Perjalanan tertunda (misal: antrean Samsat tutup, klien tidak di tempat). Kurir wajib memilih `WaitingReason`.
- **`COMPLETED`:** Kurir tiba di tujuan, serah terima berkas selesai, dan bukti foto serah terima (`handoverProof`) telah diunggah.
- **Reimbursement:** Pengeluaran bensin, tol, dan parkir kurir wajib menyertakan foto struk asli dan memerlukan persetujuan kasir finance sebelum dana kasir dicairkan (`messenger_reimbursements.status = 'APPROVED'`).
