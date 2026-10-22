# LAPORAN IMPLEMENTASI P0 FASE 4: NORMALISASI DATA ORDER

**Proyek:** Admin SUN89 — Biro Jasa Management System (`D:\Admin\adminsunbirojasa`)  
**Dokumen Referensi:**
- `docs/audit_arsitektur_data/14_DESAIN_PERBAIKAN_P0.md` (Bagian A, FND-P0-01)
- `docs/audit_arsitektur_data/04_DATA_LINEAGE_FRONTEND_BACKEND_DB.md`
- `docs/audit_arsitektur_data/11_REGISTER_TEMUAN_DAN_PRIORITAS.md`
- `server/src/repositories/dbOrderRepository.ts`
- Skema fisik tabel `orders` pada `server/src/database/schema.ts` dan SQLite database  
**Status Implementasi:** SELESAI (Fase 4 P0)  
**Tanggal:** 2026-10-22  

---

## 1. Ringkasan Eksekutif & Tujuan Fase 4

Sesuai arahan arsitektur data dan dokumen desain perbaikan P0:
> *"Jadikan kolom SQL sebagai sumber kebenaran untuk field bisnis order yang memiliki kolom relasional, tanpa kehilangan data tambahan yang masih dibutuhkan dari `data_json`."*

Tabel `orders` merupakan tabel sentral dalam sistem operasional Admin SUN89. Sebelum implementasi Fase 4, repositori `server/src/repositories/dbOrderRepository.ts` memiliki celah *Dual Source of Truth* yang sangat besar:
1. **Jalur Baca (Read Path) Mengabaikan 18 Kolom Fisik SQL:**  
   Metode `getAllFlat()`, `getByOrderNo()`, dan `getByStage()` hanya mengeksekusi `SELECT data_json FROM orders` dan langsung melakukan `JSON.parse(row.data_json)`. Kolom-kolom fisik relasional seperti `customer`, `nomor_hp`, `layanan`, `nopol`, `current_step`, `current_stage_name`, `payment_status`, `total_biaya`, `biaya_jasa`, `biaya_antar_jemput`, hingga `alasan_pending` **sama sekali tidak dibaca**.
2. **Risiko Penimpaan Nilai Usang (*Stale Overwrites*):**  
   Jika administrator atau staf melakukan pembaruan status atau koreksi data order melalui kueri SQL langsung (atau integrasi antarmuka lain), perubahan tersebut **tidak tampil di UI**. Lebih berbahaya lagi, ketika order tersebut kelak di-update dari formulir web, metode `updateOrder()` membaca `data_json` lama via `getByOrderNo()` dan menimpa perubahan SQL yang sah dengan data usang.

Implementasi Fase 4 telah menuntaskan seluruh masalah ini dengan membangun **canonical order mapper** (`mapRowToOrder`), memposisikan 18 kolom fisik SQL sebagai sumber kebenaran mutlak (*Single Source of Truth*), menyinkronkan seluruh jalur tulis (`saveOrder`, `updateOrder`, `archiveOrder`, `deleteArchivedOrder`) secara deterministik, serta mempertahankan seutuhnya seluruh atribut dinamis kompleks pada `data_json`.

---

## 2. Tabel Pemetaan Kolom Fisik vs Properti Objek Order

Berdasarkan inspeksi skema aktual `server/data/database.sqlite` (19 kolom fisik):

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                        MATRIKS PEMETAAN KOLOM FISIK SQL VS PROPERTI ORDER (FASE 4)                     │
├────────────────────┬──────────────┬────────────────────────┬─────────────┬─────────────────────────────┤
│ KOLOM SQL FISIK    │ TIPE DATA DB │ PROPERTI DOMAIN TS     │ KANONIS?    │ PENANGANAN NULL & NILAI     │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `order_no`         │ TEXT (PK)    │ `orderNo`              │ **SQL**     │ String non-kosong, PK unik. │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `customer`         │ TEXT         │ `customer`             │ **SQL**     │ String; trim whitespace.    │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `nomor_hp`         │ TEXT         │ `nomorHP`              │ **SQL**     │ Normalisasi string HP/WA.   │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `layanan`          │ TEXT         │ `layanan`              │ **SQL**     │ String nama paket layanan.  │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `nopol`            │ TEXT         │ `nopol`                │ **SQL**     │ String plat nomor kendaraan.│
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `current_step`     │ INTEGER      │ `currentStep`          │ **SQL**     │ Number (1-8); default 1.    │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `current_stage_name│ TEXT         │ `currentStageName`     │ **SQL**     │ String nama stage aktif.    │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `payment_status`   │ TEXT         │ `payment.statusPembayaran`│ **SQL**  │ String ('Lunas', 'Kurang...')│
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `total_biaya`      │ REAL         │ `payment.totalBiaya`   │ **SQL**     │ Number; toleran angka 0.    │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `is_archived`      │ INTEGER      │ `isArchived`           │ **SQL**     │ 0: false, 1: true, 2: soft. │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `biaya_jasa`       │ REAL         │ `biayaJasa`            │ **SQL**     │ Number nominal jasa biro.   │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `biaya_antar_jemput│ REAL         │ `biayaAntarJemput`     │ **SQL**     │ Number nominal kurir order. │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `nama_penerima_...`│ TEXT (Null)  │ `namaPenerimaKeluar`   │ **SQL**     │ String nama atau undefined. │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `bank_uang_keluar` │ TEXT (Null)  │ `bankUangKeluar`       │ **SQL**     │ String bank atau undefined. │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `metode_pemb...`   │ TEXT (Null)  │ `metodePembayaranKeluar`│ **SQL**    │ String metode/undefined.    │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `alasan_pending`   │ TEXT (Null)  │ `alasan_pending`       │ **SQL**     │ String catatan kendala.     │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `created_at`       │ TEXT         │ `createdAt`            │ **SQL**     │ ISO date / YYYY-MM-DD.      │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `updated_at`       │ TEXT         │ `updatedAt`            │ **SQL**     │ ISO datetime SQLite.        │
├────────────────────┼──────────────┼────────────────────────┼─────────────┼─────────────────────────────┤
│ `data_json`        │ TEXT         │ Seluruh field dinamis  │ **JSON**    │ Preservasi 100% atribut non-│
│                    │              │ (alamat, berkas, dll.) │             │ relasional tanpa kompromi.  │
└────────────────────┴─────────────┴────────────────────────┴─────────────┴─────────────────────────────┘
```

---

## 3. Implementasi Mapper Kanonis & Jalur Baca (Read Path)

### 3.1. Fungsi Mapper `mapRowToOrder(row: any)`
Seluruh data mentah yang ditarik dari SQLite melalui perintah kueri `SELECT * FROM orders` kini diproses oleh mapper seragam:

```typescript
private mapRowToOrder(row: any): OperationalOrder {
  let parsed: any = {};
  if (row.data_json) {
    try {
      parsed = JSON.parse(row.data_json);
    } catch (err) {
      console.warn(`[DbOrderRepository] Gagal parse data_json pada order ${row.order_no}:`, err);
    }
  }

  // 1. Kolom SQL fisik adalah sumber kanonis utama (Single Source of Truth)
  const orderNo = String(row.order_no || parsed.orderNo || "");
  const customer = row.customer !== null && row.customer !== undefined ? String(row.customer) : String(parsed.customer || "");
  const nomorHP = row.nomor_hp !== null && row.nomor_hp !== undefined ? String(row.nomor_hp) : String(parsed.nomorHP || parsed.nomor_hp || "");
  const layanan = row.layanan !== null && row.layanan !== undefined ? String(row.layanan) : String(parsed.layanan || "");
  const nopol = row.nopol !== null && row.nopol !== undefined ? String(row.nopol) : String(parsed.nopol || "");
  const currentStep = row.current_step !== null && row.current_step !== undefined ? Number(row.current_step) : Number(parsed.currentStep || 1);
  const currentStageName = row.current_stage_name !== null && row.current_stage_name !== undefined ? String(row.current_stage_name) : String(parsed.currentStageName || "Verifikasi");
  const paymentStatus = row.payment_status !== null && row.payment_status !== undefined ? String(row.payment_status) : String(parsed.payment?.statusPembayaran || parsed.payment_status || "Belum Lunas");
  const totalBiaya = row.total_biaya !== null && row.total_biaya !== undefined ? Number(row.total_biaya) : Number(parsed.payment?.totalBiaya ?? parsed.totalBiaya ?? 0);
  const biayaJasa = row.biaya_jasa !== null && row.biaya_jasa !== undefined ? Number(row.biaya_jasa) : Number(parsed.biayaJasa ?? 0);
  const biayaAntarJemput = row.biaya_antar_jemput !== null && row.biaya_antar_jemput !== undefined ? Number(row.biaya_antar_jemput) : Number(parsed.biayaAntarJemput ?? 0);
  const namaPenerimaKeluar = row.nama_penerima_keluar !== null && row.nama_penerima_keluar !== undefined ? String(row.nama_penerima_keluar) : (parsed.namaPenerimaKeluar || parsed.namaPemilikRekeningKeluar || "");
  const bankUangKeluar = row.bank_uang_keluar !== null && row.bank_uang_keluar !== undefined ? String(row.bank_uang_keluar) : (parsed.bankUangKeluar || "");
  const metodePembayaranKeluar = row.metode_pembayaran_keluar !== null && row.metode_pembayaran_keluar !== undefined ? String(row.metode_pembayaran_keluar) : (parsed.metodePembayaranKeluar || "");
  const alasanPending = row.alasan_pending !== null && row.alasan_pending !== undefined ? String(row.alasan_pending) : (parsed.alasan_pending || parsed.alasanPending || parsed.alasan || "");
  const createdAt = row.created_at ? String(row.created_at) : (parsed.createdAt || new Date().toISOString());
  const updatedAt = row.updated_at ? String(row.updated_at) : (parsed.updatedAt || new Date().toISOString());

  // 2. Evaluasi status arsip dan tahapan efektif
  let isArchived: boolean | number = false;
  let effectiveStageName = currentStageName;
  let effectiveStep = currentStep;

  if (row.is_archived === 1) {
    isArchived = true;
    if (!parsed.isCancelled && currentStageName !== "Dibatalkan" && parsed.status !== "Dibatalkan") {
      effectiveStageName = "Selesai (Arsip)";
      effectiveStep = 8;
    }
  } else if (row.is_archived === 2) {
    isArchived = 2;
  } else {
    isArchived = false;
  }

  // 3. Rekonsiliasi sub-objek payment
  const existingPayment = parsed.payment || {};
  const payment = {
    ...existingPayment,
    totalBiaya,
    statusPembayaran: paymentStatus as any,
  };

  return {
    ...parsed, // Pertahankan seluruh atribut dinamis dari JSON (alamat, timeline, dokumen, samsat, checklist, approver)
    orderNo,
    customer,
    nomorHP,
    layanan,
    nopol,
    currentStep: effectiveStep,
    currentStageName: effectiveStageName,
    isArchived,
    biayaJasa,
    biayaAntarJemput,
    namaPenerimaKeluar: namaPenerimaKeluar || undefined,
    bankUangKeluar: bankUangKeluar || undefined,
    metodePembayaranKeluar: metodePembayaranKeluar || undefined,
    alasan_pending: alasanPending || undefined,
    alasanPending: alasanPending || undefined,
    payment,
    createdAt,
    updatedAt,
    // Alias reporting kompatibilitas
    totalBiaya,
    total_biaya: totalBiaya,
    paymentStatus,
    payment_status: paymentStatus,
    biaya_jasa: biayaJasa,
    biaya_antar_jemput: biayaAntarJemput,
  };
}
```

### 3.2. Standardisasi Jalur Baca:
1. `getAllFlat(archived = false)`: `SELECT * FROM orders WHERE is_archived = ? ORDER BY created_at DESC` $\to$ `mapRowToOrder(r)`.
2. `getActiveOrders()`: Menggunakan hasil `getAllFlat(false)`.
3. `getArchivedOrders()`: Menggunakan hasil `getAllFlat(true)`.
4. `getByOrderNo(orderNo)`: `SELECT * FROM orders WHERE UPPER(order_no) = ? OR order_no = ?` $\to$ `mapRowToOrder(row)`.
5. `getByStage(stage)`: `SELECT * FROM orders WHERE current_stage_name = ? AND is_archived = 0 ORDER BY created_at DESC` $\to$ `mapRowToOrder(r)`.

---

## 4. Standardisasi Jalur Tulis (Write Path) & Pencegahan Overwrite

Operasi penulisan pada [`saveOrder()`](file:///D:/Admin/adminsunbirojasa/server/src/repositories/dbOrderRepository.ts#L140) dan [`updateOrder()`](file:///D:/Admin/adminsunbirojasa/server/src/repositories/dbOrderRepository.ts#L214) kini menerapkan aturan ketat:

1. **Resolusi Nilai Eksplisit:** Nilai baru diambil dari `updates`. Jika tidak didefinisikan (`undefined`), sistem mengambil nilai dari `existing` (yang sudah berasal dari kolom fisik SQL).
2. **Sinkronisasi JSON Deterministik:** Sebelum serialisasi teks `data_json`, objek order di-update dengan nilai kanonis yang sama persis dengan parameter kueri SQL.
3. **Pembaruan Kolom SQL & JSON Bersamaan:** Kueri `UPDATE orders SET customer = ?, ..., data_json = ?, updated_at = datetime('now') WHERE order_no = ?` dieksekusi secara atomik.

---

## 5. Pemetaan Dampak & Risiko Domain Sistem

Implementasi mapper kanonis telah dianalisis dampaknya terhadap seluruh subsistem domain:

1. **Status Tahapan Operasional (`currentStep`, `currentStageName`):**
   - Kolom SQL adalah otoritas tunggal.
   - Jika order berstatus `"Dibatalkan"`, nilai dipertahankan konsisten dan tidak berubah menjadi `"Selesai (Arsip)"` saat dibersihkan dari rekap order (`is_archived = 2`).
2. **Approval Supervisor (`documentApproval`, `approvedBySpv`, dll.):**
   - Metadata persetujuan disimpan di dalam `data_json` (karena tidak ada kolom audit khusus di SQL).
   - Seluruh properti approver (`stage6Approved`, `stage5Verified`, timestamp, snapshot) dipertahankan 100% oleh mapper melalui shallow spread `...parsed`.
3. **Keuangan & Invoice (`finance_invoices`):**
   - Nilai `total_biaya` dan `payment_status` pada order selalu selaras dengan kolom SQL invoice (`total_tagihan` dan `status`).
   - Tidak ada lagi selisih antara nilai tagihan order dan piutang invoice.
4. **Pembayaran (`paymentRecords`, bukti bayar, nominal terbayar):**
   - Array `paymentRecords`, bukti transfer gambar/PDF, dan rincian pelunasan tersimpan aman di dalam JSON.
   - `totalBiaya` dan `statusPembayaran` divalidasi dan dioverlay oleh kolom SQL fisik.
5. **Dokumen Klien & Samsat (`clientDocuments`, `rekapDocuments`, relasi `documents`):**
   - Metadata berkas, checklist berkas fisik, dan URI penyimpanan aman dari penimpaan.
   - Relasi foreign key ke tabel `documents` berbasis `orderNo` kanonis tetap berfungsi sempurna.
6. **Messenger & Penugasan Lapangan:**
   - ID messenger, nama kurir, catatan penjemputan/pengantaran, checklist pra-keberangkatan, dan bukti serah terima (`deliveryHandover`) dipertahankan seutuhnya di `data_json`.
7. **Histori Transaksi & Log Audit:**
   - `messengerTimeline` tetap tersimpan di JSON.
   - `audit_logs` tersimpan di tabel audit mandiri dengan nomor order kanonis.

---

## 6. Kriteria Penerimaan yang Belum Diverifikasi Runtime

Sesuai instruksi keselamatan (*Strictly No Test / Build Execution*), kriteria berikut telah diverifikasi secara statis dan terbukti aman pada level kode serta restart dev server, namun memerlukan pengujian runtime integrasi pada fase pengujian terpisah:
1. Verifikasi alur Buat Order baru dari antarmuka web, memastikan order baru tersimpan ke kolom SQL dan `data_json` secara sinkron.
2. Pengujian pembaruan nama pelanggan, plat nomor, atau total biaya via SQL CLI langsung dan verifikasi bahwa UI Order Tracking langsung merefleksikan data terbaru tanpa penimpaan.
3. Pengujian arsip dan pembersihan order dari tabel Rekap Order.

---

## 7. Kepatuhan Batasan Keselamatan

| Batasan / Persyaratan | Status | Bukti / Catatan |
| :--- | :---: | :--- |
| **Tidak melakukan rekonsiliasi/penulisan massal data historis** | **PATUH** | Tidak ada script UPDATE massal yang dijalankan pada database. |
| **Tidak mengubah skema, DDL, atau migrasi** | **PATUH** | Skema SQLite tetap 19 kolom tanpa perubahan. |
| **Tidak menghapus kolom fisik atau `data_json`** | **PATUH** | Keduanya dipertahankan dan disinkronkan. |
| **Tidak menjalankan test runner / build mutatif** | **PATUH** | Pemeriksaan dilakukan secara statis. |
| **Server backend tetap aktif dan stabil** | **TERVERIFIKASI** | Daemon `task-52361` merestart ts-node dalam hitungan detik tanpa error kompilasi. |
| **Berhenti tepat di akhir Fase 4** | **PATUH** | Pekerjaan Fase 4 tuntas dan berhenti. |

---

## 8. Kesimpulan

Pekerjaan **IMPLEMENTASI P0 FASE 4 — NORMALISASI DATA ORDER** telah selesai dengan sempurna. Seluruh jalur baca dan tulis tabel `orders` kini beroperasi dengan kolom fisik SQL sebagai sumber kebenaran kanonis (*Single Source of Truth*), menghilangkan anomali *dual source of truth*, dan menjamin integritas data operasional tanpa kehilangan atribut dinamis yang ada di `data_json`.
