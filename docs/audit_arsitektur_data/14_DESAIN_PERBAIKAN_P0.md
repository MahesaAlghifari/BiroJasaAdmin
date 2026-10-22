# 14 — DOKUMEN DESAIN PERBAIKAN P0 (PRA-IMPLEMENTASI)
## PENYELESAIAN DUAL SOURCE OF TRUTH, TRANSAKSI ATOMIK & PENGAMANAN UPLOAD

**Tanggal Dokumen:** 22 Oktober 2026  
**Status Dokumen:** PRE-IMPLEMENTATION DESIGN (Strictly Read-Only — No Code/Data Modifications)  
**Root Proyek:** `D:\Admin\adminsunbirojasa`  
**Database Utama:** `server\data\database.sqlite`  
**Acuan Audit:**  
- `07_AUDIT_INTEGRITAS_KEAMANAN.md`
- `11_REGISTER_TEMUAN_DAN_PRIORITAS.md`
- `12_ROADMAP_PERBAIKAN.md`
- `09_ERD_FISIK_SQLITE.mmd`
- `04_DATA_LINEAGE_FRONTEND_BACKEND_DB.md`

---

## 1. Ikhtisar & Tujuan Fase Pra-Implementasi

Dokumen ini disusun sebagai panduan teknis terperinci sebelum penulisan kode perbaikan dimulai untuk tiga temuan kritis berkategori **P0**:
1. **FND-P0-01:** Fenomena *Dual Source of Truth* antara kolom relasional SQL dan blob teks `data_json` pada tabel `orders`, `finance_invoices`, `samsat_pricing`, dan `service_pricing_configs`.
2. **FND-P0-02:** Ketiadaan transaksi atomik pada operasi pembaruan (`updateOrder`) dan pembalikan tahapan (`rollbackOrder`), serta risiko status parsial pada order dan invoice pendamping.
3. **FND-P0-03:** Celah keamanan pada penanganan berkas upload (ekstensi ganda, integritas biner, berkas terpotong/rusak, dan sinkronisasi pembersihan berkas fisik vs record database).

> [!IMPORTANT]
> **Batasan Keselamatan:** Dokumen ini bersifat **analisis dan rancangan murni**. Tidak ada berkas kode aplikasi, konfigurasi, skema database, atau data operasional yang dimodifikasi selama fase ini.

---

## 2. Bagian A — Desain Solusi FND-P0-01 (Dual Source of Truth)

### 2.1. Penelusuran Fungsi Read/Write Lintas Tabel

Berdasarkan inspeksi statis terhadap basis kode backend, ditemukan pola pembacaan dan penulisan aktual sebagai berikut:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     POLA PENYIMPANAN & PEMBACAAN SAAT INI (AS-IS)                      │
├─────────────────────────┬───────────────────────────────┬──────────────────────────────┤
│ TABEL                   │ METODE WRITE (PENULISAN)      │ METODE READ (PEMBACAAN)      │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ `orders`                │ Menulis ke kolom SQL DAN      │ `getAllFlat()`, `getByOrderNo`│
│                         │ men-serialize seluruh objek   │ HANYA membaca `data_json`.   │
│                         │ ke `data_json`.               │ **Kolom SQL diabaikan!**     │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ `finance_invoices`      │ Menulis ke kolom SQL DAN      │ `mapRowToInvoice()` membaca  │
│                         │ men-serialize objek ke JSON.  │ kolom SQL lalu me-merge JSON.│
│                         │                               │ (Hybrid, kolom SQL dominan). │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ `samsat_pricing`        │ Menulis ke kolom SQL DAN      │ `getAllSamsatItems()` HANYA  │
│                         │ `data_json`.                  │ membaca `data_json`.         │
│                         │                               │ **Kolom SQL diabaikan!**     │
├─────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ `service_pricing_configs`│ Menulis ke kolom SQL DAN     │ Membaca `*` lalu me-merge    │
│                         │ `data_json`.                  │ properti SQL di atas JSON.   │
└─────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

### 2.2. Matriks Tabel dan Field (Field-Level Analysis)

#### A. Tabel `orders` (19 Kolom Fisik)
- **File Repository:** `server/src/repositories/DbOrderRepository.ts:10-170`

| Nama Kolom / Field | Sumber Baca Saat Ini | Sumber Tulis Saat Ini | Status Representasi | Digunakan Query / Hitungan? | Potensi Kehilangan Data / Overwrite | Perubahan Repository yang Dibutuhkan |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `order_no` | `data_json` | SQL + JSON | **Ganda** | Filter WHERE, PK | Rendah (PK tetap) | Baca dari kolom SQL `order_no`. |
| `customer` | `data_json` | SQL + JSON | **Ganda** | UI Display | **TINGGI:** Update SQL langsung tertimpa data_json lama. | Overlay kolom SQL di atas data_json. |
| `nomor_hp` | `data_json` | SQL + JSON | **Ganda** | UI Display, WA | **TINGGI:** Casing mismatch `nomorHP` vs `nomor_hp`. | Map `nomor_hp` SQL ke `nomorHP` TS. |
| `layanan` | `data_json` | SQL + JSON | **Ganda** | Filter, UI | **TINGGI:** Edit tarif layanan via SQL tidak tampil di UI. | Overlay kolom SQL di atas data_json. |
| `nopol` | `data_json` | SQL + JSON | **Ganda** | Filter, Search | **TINGGI:** Update nopol via SQL terhapus saat order di-save UI. | Overlay kolom SQL di atas data_json. |
| `current_step` | `data_json` | SQL + JSON | **Ganda** | Stepper UI, Gating | **TINGGI:** Transisi tahap via SQL di-bypass oleh read JSON. | Gunakan `current_step` SQL sebagai nilai primer. |
| `current_stage_name` | `data_json` | SQL + JSON | **Ganda** | Filter WHERE, Tab | **SEDANG:** Query `getByStage()` pakai SQL tapi return JSON. | Konsistensikan filter dan mapping return. |
| `payment_status` | `data_json` | SQL + JSON | **Ganda** | Finance Sync | **TINGGI:** Status lunas di SQL tertimpa Belum Lunas JSON. | Gunakan kolom SQL `payment_status`. |
| `total_biaya` | `data_json` | SQL + JSON | **Ganda** | Rekap Keuangan | **TINGGI:** Selisih antara piutang SQL dan tampilan UI. | Kolom SQL `total_biaya` menimpa JSON. |
| `biaya_jasa` | `data_json` | SQL + JSON | **Ganda** | Profit Formula | **TINGGI:** Margin profit di SQL berbeda dengan form UI. | Kolom SQL `biaya_jasa` menimpa JSON. |
| `biaya_antar_jemput` | `data_json` | SQL + JSON | **Ganda** | Invoice Biaya | **SEDANG:** Biaya kurir default 50rb vs form input. | Kolom SQL menimpa JSON. |
| `is_archived` | Kolom SQL | SQL | **Tunggal (SQL)** | Filter WHERE | Tidak ada (sudah benar di SQL). | Pertahankan. |
| `alamatPenjemputan` | `data_json` | JSON | **Hanya JSON** | Tugas Kurir | Rendah (tidak ada kolom SQL individual). | Tetap disimpan dan dibaca dari JSON. |
| `alamatPengantaran` | `data_json` | JSON | **Hanya JSON** | Pengantaran | Rendah (tidak ada kolom SQL individual). | Tetap disimpan dan dibaca dari JSON. |
| `clientDocuments` | `data_json` | JSON | **Hanya JSON** | Verifikasi Berkas | Rendah (berkas fisik ada di tabel `documents`). | Tetap di JSON + relasi `documents`. |
| `samsatProcesses` | `data_json` | JSON | **Hanya JSON** | Sub-tahap Loket | Rendah (checklist sub-proses). | Tetap disimpan dan dibaca dari JSON. |
| `documentApproval` | `data_json` | JSON | **Hanya JSON** | Gating Tahap 5 & 6 | **TINGGI:** Approval flag ada di JSON tanpa kolom audit SQL. | Tetap di JSON, tapi proteksi via service. |
| `customCostItems` | `data_json` | JSON | **Hanya JSON** | Rincian Biaya | Rendah (array item dinamis). | Tetap disimpan dan dibaca dari JSON. |

#### B. Tabel `finance_invoices` (26 Kolom Fisik)
- **File Repository:** `server/src/repositories/DbFinanceRepository.ts:10-50`
- **Kondisi:** Repositori ini sudah menerapkan pola *coalescing hybrid* di `mapRowToInvoice()`:
  `totalTagihan = Number(r.total_tagihan ?? parsed.totalTagihan ?? 0)`.
- **Field Kritis Ganda:** `total_tagihan`, `dibayar`, `sisa`, `biaya_samsat`, `profit_final`, `cashback_nominal`, `status`.
- **Field Hanya JSON:** `isCashRealized`, `cashRecordedAmount`, `riwayatKoreksiPembayaran`.
- **Perubahan yang Dibutuhkan:**
  1. Hapus fallback yang membaca properti JSON jika kolom SQL bernilai `NOT NULL` (kolom SQL harus 100% menang).
  2. Tambahkan sinkronisasi balik saat update: jika kolom SQL di-update, properti di dalam `data_json` wajib ikut diperbarui sebelum `stmt.run()`.

#### C. Tabel `samsat_pricing` (8 Kolom Fisik)
- **File Repository:** `server/src/repositories/DbPricingRepository.ts:10-70`
- **Kondisi Saat Ini:** `getAllSamsatItems()` hanya menjalankan `SELECT data_json FROM samsat_pricing`.
- **Field Kritis Ganda:** `id`, `nama_item`, `kategori`, `tipe_kendaraan`, `biaya_dasar`, `deskripsi`.
- **Perubahan yang Dibutuhkan:**
  Ubah query pembacaan menjadi `SELECT * FROM samsat_pricing`, parse `data_json`, dan timpa properti objek dengan nilai dari kolom SQL fisik (`id: r.id, namaItem: r.nama_item, kategori: r.kategori, biayaDasar: r.biaya_dasar, deskripsi: r.deskripsi`).

---

### 2.3. Perbandingan Dua Alternatif Desain

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                     PERBANDINGAN ALTERNATIF ARSITEKTUR PERSISTENSI                     │
├───────────────────────────────────┬────────────────────────────────────────────────────┤
│ ALTERNATIF 1 (DIREKOMENDASIKAN)   │ ALTERNATIF 2 (TIDAK DIREKOMENDASIKAN)              │
│ Canonical SQL Columns + JSON Ext. │ Bidirectional Synchronization with Conflict Rules  │
├───────────────────────────────────┼────────────────────────────────────────────────────┤
│ • Prinsip: Kolom SQL adalah       │ • Prinsip: Baik SQL maupun JSON dianggap sumber     │
│   satu-satunya sumber kebenaran   │   kebenaran setara; sistem memeriksa timestamp     │
│   (Single Source of Truth) untuk  │   terbaru atau checksum saat konflik terjadi.      │
│   seluruh field bisnis operasional.│                                                   │
│ • JSON murni berfungsi sebagai    │ • Kompleksitas sangat tinggi: membutuhkan kolom    │
│   penampung field ekstensi dinamis│   `json_updated_at` vs `sql_updated_at`, locking,  │
│   (alamat, checklist, berkas).    │   dan resolver algoritma rekonsiliasi.             │
│ • Pembacaan (Read): Nilai kolom   │ • Rawan race condition jika ada dua worker atau    │
│   SQL SELALU menimpa isi JSON.    │   query konkuren mengupdate field yang berbeda.    │
│ • Penulisan (Write): Setiap update│ • Sangat rentan bug logika: kapan JSON boleh       │
│   menulis ke kolom SQL dan        │   menimpa SQL dan sebaliknya sulit dibuktikan aman.│
│   menyinkronkan field kunci ke    │                                                    │
│   dalam JSON secara deterministik.│                                                    │
│ • Migrasi & Rollback: Mudah,      │ • Migrasi & Rollback: Sangat berisiko,             │
│   deterministik, dan transparan.  │   memerlukan tabel log konflik dan manual review.  │
└───────────────────────────────────┴────────────────────────────────────────────────────┘
```

### 2.4. Rekomendasi Terpilih & Strategi Migrasi Data

**Pilihan Terbaik:** **ALTERNATIF 1 (Kolom Relasional sebagai Canonical Source of Truth).**

#### Alasan Teknis:
1. Menjamin bahwa seluruh query SQL administratif, audit SQLite, dan reporting eksternal langsung sinkron dengan tampilan antarmuka web tanpa perantara cache.
2. Tidak memerlukan perubahan skema tabel (zero-migration DDL), karena seluruh kolom SQL yang diperlukan sudah tersedia di tabel `orders`, `finance_invoices`, dan `samsat_pricing`.
3. Menghilangkan risiko penimpaan data usang (*stale overwrite*) saat form frontend disimpan ulang.

#### Langkah Rekonsiliasi Data Historis (Pre-Flight Data Reconciliation):
Sebelum kode baru diaktifkan, jalankan skrip inspeksi verifikasi (*dry-run script*):
1. Baca setiap baris pada tabel `orders` dan bandingkan nilai kolom SQL (`customer`, `nopol`, `total_biaya`) dengan nilai di dalam `data_json`.
2. Jika ditemukan perbedaan (divergensi):
   - Jika kolom SQL bernilai default (`0` atau string kosong) sementara JSON memiliki nilai riil, lakukan rekonsiliasi awal dengan meng-update kolom SQL mengikuti JSON.
   - Jika kolom SQL memiliki nilai riil yang lebih baru dari JSON, biarkan kolom SQL menang.
3. Catat seluruh selisih ke dalam berkas log rekonsiliasi audit sebelum mengaktifkan mapper repository baru.

#### Rollback Plan:
Jika terjadi perilaku tidak terduga pada tampilan frontend setelah mapper diperbarui, repositori dapat dikembalikan (*revert*) ke metode baca `data_json` lama dalam hitungan detik tanpa ada struktur data database yang rusak, karena `data_json` tetap selalu diperbarui pada setiap operasi penulisan.

---

## 3. Bagian B — Desain Solusi FND-P0-02 (Transaksi Atomik `updateOrder` & `rollbackOrder`)

### 3.1. Pemetaan Operasi & Efek Samping Saat Ini

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                 PETA EFEK SAMPING OPERASI UPDATE & ROLLBACK ORDER                      │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ OPERASI                    │ EFEK SAMPING DI DATABASE    │ RISIKO TANPA TRANSAKSI      │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ `updateOrder()`            │ 1. UPDATE `orders`          │ Jika Step 3 (Audit) gagal,  │
│                            │ 2. UPDATE `documents` (link)│ Order sudah berubah di DB,  │
│                            │ 3. INSERT `audit_logs`      │ tetapi jejak audit hilang.  │
│                            │ 4. (Potensial) Invoice Sync │ Finansial & Order tidak sync│
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ `advanceOrder()`           │ 1. Validasi Gating Stage    │ Jika notifikasi/audit gagal,│
│ (Juga digunakan oleh       │ 2. UPDATE `orders` (step)   │ tahap order sudah berpindah │
│  `rollbackOrder()`)        │ 3. UPDATE `documents` (link)│ tanpa integritas transisi.  │
│                            │ 4. INSERT `audit_logs`      │                             │
│                            │ 5. INSERT `notification_log`│                             │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ `rollbackOrder()`          │ Masalah spesifik:           │ Approval supervisor lama    │
│ (Kasus Pembalikan Tahap)   │ Membalikkan tahap mundur,   │ tetap aktif meskipun order  │
│                            │ misal dari Tahap 6 ke 5,    │ dimundurkan ke tahap draft! │
│                            │ tetapi flag approval tidak  │ Invoice tidak di-revert.    │
│                            │ di-reset di invoice/order.  │                             │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

### 3.2. Penentuan Batas Transaksi Atomik yang Tepat

Berdasarkan arsitektur database pada `server/src/database/db.ts`, fungsi `runInTransaction()` bersifat **sinkron** dan sudah dilengkapi proteksi re-entrant:
```typescript
let inTransaction = false;
export function runInTransaction<T>(fn: () => T): T {
  if (inTransaction) return fn(); // Mencegah nested transaction error di SQLite
  inTransaction = true;
  db.exec("BEGIN TRANSACTION;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    inTransaction = false;
    return result;
  } catch (err) {
    try { db.exec("ROLLBACK;"); } catch {}
    inTransaction = false;
    throw err;
  }
}
```

#### Desain Batas Transaksi untuk `updateOrder()`:
```
[MULAI TRANSAKSI: BEGIN TRANSACTION]
  │
  ├── 1. Validasi IDOR wewenang role messenger & sanitasi field immutable
  ├── 2. Eksekusi `dbOrderRepository.updateOrder(orderNo, safeUpdates)`
  ├── 3. Eksekusi `linkOrderDocuments(updatedOrder)` (Update tabel `documents`)
  ├── 4. Sinkronisasi Finansial: Jika ada perubahan `totalBiaya`, `layanan`, atau `customer`,
  │      panggil `dbFinanceRepository.updateInvoice(inv.id, ...)`
  ├── 5. Eksekusi `dbAuditRepository.save(...)` (Insert tabel `audit_logs`)
  │
[SELESAI TRANSAKSI: COMMIT]
  │  (Jika langkah 1-5 ada yang melempar error -> ROLLBACK seluruhnya)
  ▼
[OPERASI NON-BLOKING LUAR TRANSAKSI]
  └── 6. Pengiriman notifikasi email/WA asynchronously (Kegagalan notifikasi tidak membatalkan DB)
```

#### Desain Khusus Pembalikan Tahapan (`rollbackOrder()`):
Fungsi `rollbackOrder()` tidak boleh sekadar menjadi alias dari `advanceOrder()`. Harus dibuat alur khusus pembalikan:
1. **Pemeriksaan Batas:** Target stage harus bernilai `currentStep < existing.currentStep`.
2. **Reset Gating Wewenang:**
   - Jika order dimundurkan dari Tahap 6 (Supervisi) atau Tahap 7 (Pembayaran) kembali ke Tahap 5 atau sebelumnya:
     Reset `documentApproval.stage6Approved = false`, hapus timestamp `stage6ApprovedAt`, dan batalkan status approval dokumen.
3. **Penyelarasan Invoice:**
   - Jika invoice sudah berstatus `COMPLETED` atau `READY_TO_BILL`, kembalikan status invoice ke `DRAFT` atau `UNDER_REVIEW`.
4. **Semua langkah di atas wajib berjalan dalam satu blok `runInTransaction()`**.

---

## 4. Bagian C — Desain Solusi FND-P0-03 (Pengamanan Komprehensif File Upload)

### 4.1. Pemetaan Arsitektur Upload Saat Ini

```
[Klien Browser] ──> [uploadRateLimiter] ──> [Multer memoryStorage] ──> [documentController.uploadDocument]
                                                                                   │
                                                                                   ▼
                                                                     [documentService.uploadDocument]
                                                                                   │
                                  ┌────────────────────────────────────────────────┴──────────────────────────────┐
                                  ▼                                                                               ▼
                   [validateUploadedDocument]                                                      [localDiskDocumentStorage.saveFile]
              (fileValidation.ts: Magic Bytes)                                                     (Tulis disk uploads/UUID.ext)
                                                                                                                  │
                                                                                                                  ▼
                                                                                                  [dbDocumentRepository.createDocument]
                                                                                                  (Tulis metadata ke tabel documents)
```

### 4.2. Penguatan Validasi Keamanan Konten & Berkas

Meskipun `fileValidation.ts` saat ini sudah memiliki inspeksi magic bytes awal untuk PDF, JPEG, dan PNG, ditemukan **4 celah keamanan potensial** yang harus ditutup pada perbaikan P0:

#### 1. Serangan Ekstensi Ganda (*Double Extension Attacks*)
- **Celah:** Pengguna mengunggah nama berkas seperti `dokumen_stnk.php.pdf` atau `bukti_bayar.sh.png`. Jika disajikan kembali ke browser atau sistem file OS klien dengan nama asli, aplikasi desktop tertentu dapat mengeksekusi ekstensi sekunder.
- **Rancangan Perbaikan:**
  Dalam fungsi `sanitizeFileName(originalName)`:
  Hapus seluruh ekstensi tersembunyi. Ekstensi berkas final HANYA diambil dari hasil deteksi biner (*detected canonical extension*), bukan dari string nama berkas yang dikirim klien:
  ```typescript
  // Contoh: 'bukti.php.jpeg' -> nama bersih: 'bukti_php' -> hasil akhir: 'bukti_php.jpg'
  ```

#### 2. Deteksi Berkas Terpotong & Berkas Rusak (*Corrupted / Truncated Files*)
- **Celah:** Berkas biner hanya dicek 4 byte pertamanya. Berkas 10 byte yang diawali `%PDF` tetapi isinya terputus akan lolos validasi.
- **Rancangan Perbaikan:**
  - **PDF:** Wajib memeriksa header awal `%PDF` DAN memeriksa penanda akhir berkas (*End of File marker*): `%%EOF` pada 1024 byte terakhir dari buffer.
  - **PNG:** Wajib memeriksa 8 byte header `89 50 4E 47 0D 0A 1A 0A` DAN chunk akhir `IEND` (`49 45 4E 44 AE 42 60 82`).
  - **JPEG:** Wajib memeriksa SOI marker `FF D8 FF` pada awal dan EOI marker `FF D9` pada akhir buffer.

#### 3. Pembersihan Berkas Yatim (*Orphan Disk Cleanup*)
- **Celah:** Jika database `sqlite` terkunci (*busy*) atau mengalami error integritas tepat setelah berkas ditulis ke folder `uploads/`, berkas fisik akan tertinggal menjadi sampah tanpa record database.
- **Rancangan Perbaikan:**
  `documentService.ts` sudah memiliki blok `try ... catch` pembersihan disk:
  ```typescript
  try {
    this.docRepo.createDocument(docEntity);
  } catch (dbErr) {
    await this.storage.deleteFile(stored.storageName).catch(() => {});
    throw new ApiError(500, "STORAGE_ERROR", "Gagal menyimpan metadata dokumen ke basis data.");
  }
  ```
  Rancangan P0 akan memperkuat mekanisme ini dengan menambahkan pencatatan log peringatan (*error logging*) dan memastikan `deleteFile` diverifikasi keberhasilannya.

#### 4. Proteksi Header HTTP saat Preview / Unduh
- Pastikan endpoint `previewDocument` dan `downloadDocument` pada `documentController.ts` selalu menyertakan header proteksi:
  - `X-Content-Type-Options: nosniff` (Wajib, mencegah MIME confusion).
  - `Content-Disposition: inline; filename="sanitized_name.ext"` (Menggunakan nama yang sudah disanitasi).
  - `Content-Security-Policy: default-src 'none'; plugin-types application/pdf;` khusus untuk dokumen PDF.

---

## 5. Bagian D — Analisis Dependensi, Risiko, dan Mitigasi

### 5.1. Berkas-Berkas yang Akan Dimodifikasi pada Implementasi P0

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DAFTAR BERKAS TERDAMPAK PERBAIKAN P0                            │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ BERKAS TARGET                          │ PERUBAHAN YANG AKAN DILAKUKAN                 │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ `server/src/repositories/DbOrderRepository.ts` │ Normalisasi query read (`SELECT *`), overlay  │
│                                        │ kolom SQL di atas `data_json`, eliminasi baca │
│                                        │ eksklusif JSON.                               │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ `server/src/repositories/DbPricingRepository.ts`│ Normalisasi read Samsat pricing agar kolom    │
│                                        │ SQL (`base_price`, dll.) menimpa `data_json`. │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ `server/src/services/orderService.ts`  │ Bungkus `updateOrder` dan `rollbackOrder`     │
│                                        │ dalam `runInTransaction()`, implementasikan   │
│                                        │ logika reset approval saat rollback.          │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ `server/src/utils/fileValidation.ts`   │ Perkuat verifikasi EOF marker (PDF/PNG/JPEG), │
│                                        │ eliminasi ekstensi ganda pada nama berkas.    │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ `server/src/services/documentService.ts`│ Penanganan rollback berkas fisik jika DB fail │
│                                        │ dan verifikasi status penghapusan disk.       │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 5.2. Analisis Potensi Regresi & Mitigasi

| Area Potensial Regresi | Deskripsi Risiko | Strategi Mitigasi / Verifikasi |
| :--- | :--- | :--- |
| **Frontend Form Display** | UI order mungkin kehilangan field ekstensi jika mapper repository tidak me-merge properti JSON secara utuh. | Terapkan pola *shallow-merge* yang ketat: `{ ...parsedJson, ...sqlColumns }`. Seluruh properti dinamis tetap utuh. |
| **Order Stepper Navigation** | Pembalikan tahap order (`rollback`) yang mereset status approval dapat memblokir order jika UI tidak merefleksikan perubahan. | Pastikan API response mengembalikan objek order lengkap terbaru dengan status approval yang diperbarui. |
| **Upload Dokumen Klien** | File gambar kamera ponsel yang memiliki orientasi EXIF khusus atau sedikit metadata anomali dapat tertolak. | Hanya periksa penanda wajib format (SOI/EOI untuk JPEG, Magic/IEND untuk PNG), jangan memblokir metadata EXIF yang sah. |
| **SQLite Lock Contention** | Pembungkusan transaksi yang terlalu lama dapat memicu `SQLITE_BUSY` jika ada request konkuren lain. | Transaksi hanya mencakup query database lokal (tanpa pemanggilan API eksternal atau I/O jaringan di dalam blok transaksi). |

---

## 6. Rekomendasi Urutan Implementasi & Keputusan Pemilik Aplikasi

### 6.1. Urutan Implementasi Bertahap yang Aman (Execution Steps)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   URUTAN IMPLEMENTASI AMAN FASE P0                     │
├──────┬──────────────────────────────────┬──────────────────────────────┤
│ STEP │ TUGAS IMPLEMENTASI               │ FOKUS PENGUJIAN              │
├──────┼──────────────────────────────────┼──────────────────────────────┤
│ 1    │ Penguatan Validasi File Upload   │ Upload file palsu & ganda    │
│      │ (`fileValidation.ts`)            │ tertolak aman tanpa I/O DB.  │
├──────┼──────────────────────────────────┼──────────────────────────────┤
│ 2    │ Transaksi Atomik Rollback/Update │ Simulasi error di tengah alur│
│      │ (`orderService.ts`)              │ memastikan rollback utuh.    │
├──────┼──────────────────────────────────┼──────────────────────────────┤
│ 3    │ Mapper Repository Samsat Pricing │ Update tarif di SQLite CLI   │
│      │ (`DbPricingRepository.ts`)       │ langsung muncul di UI.       │
├──────┼──────────────────────────────────┼──────────────────────────────┤
│ 4    │ Mapper Repository Order (Inti)   │ Pembacaan & penyimpanan order│
│      │ (`DbOrderRepository.ts`)         │ sinkron 100% SQL & JSON.     │
└──────┴──────────────────────────────────┴──────────────────────────────┘
```

### 6.2. Keputusan yang Membutuhkan Persetujuan Pemilik Aplikasi

Sebelum penulisan kode dimulai pada fase implementasi berikutnya, terdapat **2 keputusan desain** yang memerlukan konfirmasi pemilik sistem:

1. **Kebijakan Reset Approval saat Rollback Order:**  
   Jika seorang pengguna memundurkan order dari Tahap 6 (Supervisi) kembali ke Tahap 5 (Verifikasi Ulang) atau Tahap 4 (Proses Samsat):  
   - *Apakah tanda tangan/persetujuan supervisor pada Tahap 5 dan 6 harus otomatis dicabut (`reset to unapproved`) sehingga supervisor wajib memeriksa ulang ketika order diajukan kembali?*  
   *(Rekomendasi Arsitektur: **YA, WAJIB DI-RESET** demi kepatuhan SOP kontrol kualitas).*

2. **Format File Tambahan untuk Upload Kamera Smartphone:**  
   Saat ini sistem hanya mengizinkan PDF, JPEG, dan PNG. Kamera iPhone terbaru sering kali menghasilkan format HEIC/HEIF atau WebP.  
   - *Apakah sistem tetap dibatasi pada 3 format (PDF, JPEG, PNG) dengan instruksi klien mengonversi ke JPG, atau perlu direncanakan dukungan WebP pada fase berikutnya?*  
   *(Rekomendasi Arsitektur: **Pertahankan PDF, JPEG, PNG untuk Fase P0**, pertimbangkan WebP pada fase minor berikutnya).*

---

> [!NOTE]
> Seluruh perancangan di atas telah diverifikasi tidak memerlukan migrasi destruktif pada basis data `server/data/database.sqlite`. Implementasi dapat dieksekusi secara terisolasi setelah desain ini disetujui.
