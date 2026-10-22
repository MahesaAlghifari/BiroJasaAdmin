# 11 — REGISTER TEMUAN DAN PRIORITAS RISIKO
## KATALOG TEMUAN LENGKAP AUDIT ARSITEKTUR DATA (P0, P1, P2, P3)

**Tanggal Audit:** 22 Oktober 2026  
**Status:** READ-ONLY Evidence-Based Findings  
**File Output:** `docs/audit_arsitektur_data/11_REGISTER_TEMUAN_DAN_PRIORITAS.md`

---

### 1. Ringkasan Distribusi Temuan

| Tingkat Prioritas | Definisi Risiko | Jumlah Temuan | Status Tindak Lanjut |
| :---: | :--- | :---: | :--- |
| **P0** | Risiko Kritis: Kehilangan data, desinkronisasi fatal, kebocoran/bypass keamanan. | **3 Temuan** | Harus diselesaikan sebelum rilis produksi berikutnya. |
| **P1** | Kerusakan Alur Utama: Transaksi non-atomik, ketiadaan foreign key, aliasing ganda. | **5 Temuan** | Dijadwalkan pada Fase Stabilisasi Inti. |
| **P2** | Inkonsistensi Teknis: Dead code scaffolding, bypass provider, redundansi kolom. | **7 Temuan** | Dijadwalkan pada Fase Refaktor Arsitektur. |
| **P3** | Pemeliharaan & Kerapian: Hardcoded fallback, standarisasi DTO, perapian enum. | **4 Temuan** | Ditangani saat pembersihan kode rutin. |
| **TOTAL** | **Semua Kategori Temuan Teridentifikasi** | **19 Temuan** | **Dokumentasi Lengkap dengan Bukti Kode** |

---

### 2. Temuan Kritis — Prioritas P0

---

#### [FND-P0-01] Dual Source of Truth Anti-Pattern (`data_json` vs Kolom Relasional)
- **Domain:** Data Architecture / Storage Persistence
- **Prioritas:** **P0 (Kritis)**
- **Bukti Lokasi:**
  - `server/src/repositories/DbOrderRepository.ts:85-115`
  - `server/src/repositories/DbFinanceRepository.ts:140-160`
  - `server/src/database/seed.ts:45-70`
- **Kondisi Aktual:**
  Pada saat penulisan (INSERT/UPDATE), sistem mengisi kolom relasional SQL (`customer`, `nopol`, `total_biaya`) sekaligus menyimpan seluruh objek JavaScript ke dalam teks blob `data_json`. Namun, pada saat pembacaan (`getAllFlat`, `getByOrderNo`), repository membaca langsung teks `data_json` menggunakan `JSON.parse()`, mengabaikan kolom SQL.
- **Kondisi yang Seharusnya:**
  Basis data relasional harus memiliki satu sumber kebenaran kanonis (*canonical source of truth*). Kolom relasional SQL harus menjadi data primer yang dibaca dan ditulis. `data_json` hanya boleh menyimpan properti ekstensi dinamis yang belum memiliki kolom terindeks.
- **Dampak:**
  Jika administrator melakukan perbaikan data via query SQL langsung di database (misal penyesuaian biaya atau perbaikan nopol), UI tidak akan pernah menampilkan perbaikan tersebut. Saat order disimpan kembali dari UI, data lama di `data_json` akan menimpa balik kolom SQL yang sudah benar.
- **Dependensi:** Seluruh alur Order, Invoicing, dan Laporan Laba Rugi.
- **Rekomendasi:**
  Normalisasikan pembacaan repository agar membaca langsung kolom SQL individual, atau buat mekanisme *bidirectional synchronization* yang memastikan `data_json` dan kolom SQL selalu identik.
- **Risiko Regresi:** Rendah jika ditangani pada layer mapper repository.
- **Acceptance Criteria:** Query SQL langsung ke kolom `orders.customer` langsung tercermin di UI tanpa reload data_json lama.
- **Status Bukti:** Terkonfirmasi Statis & Runtime.

---

#### [FND-P0-02] Ketiadaan Transaksi Atomik pada Rollback dan Update Order
- **Domain:** Transaction Management / Business Logic
- **Prioritas:** **P0 (Kritis)**
- **Bukti Lokasi:**
  - `server/src/services/orderService.ts:160-195` (`rollbackOrder`)
  - `server/src/services/orderService.ts:110-140` (`updateOrder`)
- **Kondisi Aktual:**
  Fungsi `rollbackOrder` dan `updateOrder` mengeksekusi serangkaian query modifikasi database (update `orders`, update invoice pendamping, dan pencatatan audit log) tanpa dibungkus dalam blok `runInTransaction()`. Berbeda dengan `createOrder`, `advanceOrder`, dan `cancelOrder` yang sudah menggunakan transaksi.
- **Kondisi yang Seharusnya:**
  Seluruh mutasi status tahapan order yang berdampak pada status finansial dan riwayat audit wajib berjalan dalam blok transaksi atomik (`BEGIN TRANSACTION ... COMMIT`).
- **Dampak:**
  Jika terjadi kegagalan jaringan atau server crash saat proses pembalikan tahap order, tahapan order di `orders` berubah mundur tetapi status tagihan atau audit log gagal tersimpan, menyebabkan *state desynchronization*.
- **Rekomendasi:**
  Bungkus pemanggilan `rollbackOrder` dan `updateOrder` di `orderService.ts` dengan utility `runInTransaction(() => { ... })`.
- **Risiko Regresi:** Sangat Rendah.
- **Acceptance Criteria:** Seluruh operasi rollback gagal secara utuh jika salah satu query SQL di dalamnya memicu error.
- **Status Bukti:** Terkonfirmasi Statis.

---

#### [FND-P0-03] Kerentanan Validasi MIME-Type Biner pada Upload Dokumen
- **Domain:** Security / File Management
- **Prioritas:** **P0 (Kritis)**
- **Bukti Lokasi:**
  - `server/src/routes/documentRoutes.ts:15-35`
  - `server/src/controllers/documentController.ts:40-75`
- **Kondisi Aktual:**
  Validasi berkas upload pada `documentRoutes.ts` hanya memeriksa ekstensi nama berkas (`.jpg`, `.png`, `.pdf`) dan header `Content-Type` yang dikirim dari browser klien. Tidak ada inspeksi *magic bytes* biner pada konten berkas fisik yang disimpan di folder `uploads/`.
- **Kondisi yang Seharusnya:**
  Server harus membaca byte awal berkas (*magic numbers*) untuk memastikan berkas yang diklaim sebagai gambar atau PDF benar-benar merupakan file aman dan bukan skrip berbahaya (.exe, .sh, file PHP/Node).
- **Dampak:**
  Potensi penyerang mengunggah skrip atau muatan berbahaya ke disk server lokal dengan menyamarkan ekstensi ganda (misal: `malicious.pdf.exe`).
- **Rekomendasi:**
  Gunakan pustaka verifikasi MIME biner (seperti `file-type`) sebelum menyimpan file ke disk permanen.
- **Risiko Regresi:** Rendah.
- **Acceptance Criteria:** File biner selain JPG, PNG, atau PDF asli ditolak dengan HTTP 400 Bad Request.
- **Status Bukti:** Terkonfirmasi Statis.

---

### 3. Temuan Utama — Prioritas P1

---

#### [FND-P1-01] Hilangnya Constraint Foreign Key SQLite pada 17 Tabel Vital
- **Domain:** Database Architecture / Data Integrity
- **Prioritas:** **P1 (Tinggi)**
- **Bukti Lokasi:**
  - `server/data/database.sqlite` (Skema DDL aktual)
  - `server/src/database/schema.sql:1-150`
- **Kondisi Aktual:**
  Hanya 3 tabel (`documents`, `invoice_payments`, `samsat_offices`) yang memiliki DDL `FOREIGN KEY`. Sebanyak 17 tabel lainnya, termasuk `orders`, `finance_invoices`, `kas_kantor`, dan `messenger_reimbursements`, tidak memiliki constraint foreign key di tingkat basis data.
- **Kondisi yang Seharusnya:**
  Basis data harus menegakkan integritas referensial fisik dengan constraint `FOREIGN KEY REFERENCES parent_table(pk_col) ON UPDATE CASCADE ON DELETE RESTRICT`.
- **Dampak:**
  Risiko timbulnya *orphan records* (data yatim) di mana data pembayaran atau kas merujuk ke nomor order atau invoice yang sudah tidak eksis.
- **Rekomendasi:**
  Tambahkan constraint Foreign Key formal pada skema DDL SQLite untuk seluruh relasi master-transaksi.
- **Status Bukti:** Terkonfirmasi Statis dari DDL SQLite.

---

#### [FND-P1-02] Inkonsistensi Naming & Aliasing Properti Ganda Lintas Lapisan
- **Domain:** Data Contracts / Typings
- **Prioritas:** **P1 (Tinggi)**
- **Bukti Lokasi:**
  - `src/domain/finance/types.ts:37-47` (`invoice` vs `invoiceNo`, `terbayar` vs `dibayar`)
  - `src/domain/order/types.ts:168` (`nomorHP` vs `nomor_hp`)
  - `server/src/repositories/DbFinanceRepository.ts:120-145`
- **Kondisi Aktual:**
  Properti keuangan di TypeScript dideklarasikan ganda (misal `invoice: string; invoiceNo?: string;`, `terbayar: number; dibayar?: number;`). Jika salah satu komponen form mengisi properti alias yang tidak dipetakan oleh backend, nilai tersebut menjadi `undefined`.
- **Kondisi yang Seharusnya:**
  Satu properti bisnis hanya boleh memiliki satu nama kanonis di seluruh codebase.
- **Dampak:**
  Potensi bug nilai nominal menjadi 0 atau kosong saat berpindah antar komponen UI.
- **Rekomendasi:**
  Terapkan standarisasi penamaan tunggal: gunakan `invoiceNo` dan `terbayar` secara universal.
- **Status Bukti:** Terkonfirmasi Statis.

---

#### [FND-P1-03] Potensi Bypass Supervisor Gating pada Pemanggilan API Langsung
- **Domain:** Authorization / Business Logic
- **Prioritas:** **P1 (Tinggi)**
- **Bukti Lokasi:**
  - `server/src/routes/orderRoutes.ts:46-52` (`PUT /api/orders/:orderNo`)
  - `server/src/repositories/DbOrderRepository.ts:135`
- **Kondisi Aktual:**
  Endpoint `PUT /api/orders/:orderNo` mengizinkan role `admin`, `messenger`, `finance`, dan `svp` untuk memperbarui order. Namun, jika request body berisi manipulasi status `stage6Approved: true`, repository tidak memeriksa apakah pengirim request memiliki wewenang `svp`.
- **Kondisi yang Seharusnya:**
  Field-field gating kewenangan seperti `stage5Verified` dan `stage6Approved` hanya boleh diubah melalui endpoint persetujuan khusus (`/approve-documents`).
- **Dampak:**
  Pengguna dengan role selain supervisor dapat mem-bypass persetujuan tagihan dengan mengirimkan payload JSON langsung.
- **Rekomendasi:**
  Sanitasi payload pada `PUT /api/orders/:orderNo` agar menolak atau mengabaikan properti approval jika bukan berasal dari endpoint supervisor.
- **Status Bukti:** Terkonfirmasi Statis.

---

#### [FND-P1-04] Hard Deletion pada Order Terarsip Memutus Foreign Key Dokumen
- **Domain:** Data Retention / Lifecycle
- **Prioritas:** **P1 (Tinggi)**
- **Bukti Lokasi:**
  - `server/src/routes/orderRoutes.ts:70-80` (`DELETE /api/orders/archived/:orderNo`)
  - `server/src/repositories/DbOrderRepository.ts:180`
- **Kondisi Aktual:**
  Endpoint penghapusan order terarsip menjalankan query `DELETE FROM orders WHERE order_no = ?`. Karena tabel `documents` memiliki FK fisik `ON DELETE CASCADE`, seluruh berkas digital dan bukti transfer milik order tersebut akan terhapus permanen dari database.
- **Kondisi yang Seharusnya:**
  Data transaksi legal seperti kepengurusan Samsat dan bukti pembayaran tidak boleh dihapus secara hard-delete, melainkan ditandai sebagai `permanently_archived`.
- **Dampak:**
  Kehilangan jejak audit kepatuhan hukum (*legal compliance*) atas berkas kendaraan yang pernah diurus.
- **Rekomendasi:**
  Ganti mekanisme hard delete dengan status *cold storage / purged archive* atau batasi hanya untuk super-administrator dengan audit konfirmasi ganda.
- **Status Bukti:** Terkonfirmasi Statis.

---

#### [FND-P1-05] Potensi Flash Local State Saat Token LocalStorage Terlambat Dimuat
- **Domain:** Frontend State Management
- **Prioritas:** **P1 (Tinggi)**
- **Bukti Lokasi:**
  - `src/data/api/apiOrderProvider.ts:25-30`
  - `src/app/data/financeStore.ts:45-55`
- **Kondisi Aktual:**
  Konstruktor `ApiOrderProvider` dan `financeStore` menginisialisasi state dengan data dummy lokal (`createInitialOrders()`) jika token `auth_token` belum siap saat instantiation pertama di browser.
- **Kondisi yang Seharusnya:**
  Komponen UI harus menampilkan status skeleton/loading sampai koneksi token diverifikasi oleh backend, bukan menampilkan dummy data.
- **Dampak:**
  Pengguna dapat melihat sekilas data order fiktif selama 200-500ms sebelum data server termuat.
- **Rekomendasi:**
  Gunakan flag `isLoading = true` sebagai default state rendering.
- **Status Bukti:** Terkonfirmasi Statis.

---

### 4. Temuan Menengah — Prioritas P2

| ID Temuan | Domain | Deskripsi Temuan | Bukti Lokasi | Rekomendasi Solusi |
| :---: | :--- | :--- | :--- | :--- |
| **FND-P2-01** | Scaffolding | 7 file interface di `src/api/endpoints/` (50 methods) merupakan dead code tidak terpakai. | `src/api/endpoints/` | Beri penandaan arsip atau hapus kontrak tak terpakai agar tidak membingungkan. |
| **FND-P2-02** | Data Flow | Pemanggilan `fetch()` langsung di `auditLog.ts` dan `Settings.tsx` membypass Provider layer. | `src/app/utils/auditLog.ts` | Alihkan komunikasi melalui service provider terpusat. |
| **FND-P2-03** | Invoicing | Pelacakan `isCashRealized` hanya disimpan di JSON, tidak memiliki kolom SQL fisik berindeks. | `src/domain/finance/types.ts:70` | Tambahkan kolom `is_cash_realized INTEGER` di `finance_invoices`. |
| **FND-P2-04** | Redundansi | Kolom `finance_invoices.sisa` disimpan secara fisik, padahal nilainya murni kalkulasi `total - terbayar`. | `finance_invoices.sisa` | Jadikan kolom `sisa` sebagai virtual generated column di SQLite. |
| **FND-P2-05** | Idempotensi | Tabel `idempotency_keys` kosong (0 baris), middleware proteksi double-submit belum diaktifkan di route mutasi. | `idempotency_keys` (0 rows) | Pasang middleware `checkIdempotency` pada `POST /payments` dan `POST /orders`. |
| **FND-P2-06** | Skalabilitas | Endpoint `GET /api/orders` dan `/api/audit-logs` memuat seluruh baris tanpa pagination SQL `LIMIT/OFFSET`. | `DbOrderRepository.ts:85` | Terapkan pagination standar berbasis query param `page` dan `limit`. |
| **FND-P2-07** | Logistik | Tabel `kas_messenger` dan `messenger_reimbursements` belum terhubung dengan seed awal. | `server/src/database/seed.ts` | Tambahkan seeder data awal kurir dan histori tugas lapangan. |

---

### 5. Temuan Ringan & Kerapian — Prioritas P3

| ID Temuan | Domain | Deskripsi Temuan | Bukti Lokasi | Rekomendasi Solusi |
| :---: | :--- | :--- | :--- | :--- |
| **FND-P3-01** | UI Master | Nilai tarif loket fallback masih tertulis hardcoded di komponen visual sebelum master dimuat. | `HargaDasarSamsat.tsx:50` | Ganti dengan skeleton placeholder saat menunggu data master dari API. |
| **FND-P3-02** | Typings | Beberapa route controller Express tidak memiliki tipe eksplisit untuk `req.body` dan respons JSON. | `orderController.ts:25` | Buat schema DTO formal menggunakan Zod atau TypeScript strict interfaces. |
| **FND-P3-03** | Standardisasi | Format error response memiliki sedikit variasi antara route audit (`{ error: string }`) dan order (`{ success: false, error: { message } }`). | `auditRoutes.ts` vs `app.ts` | Standarisasikan seluruh error response mengikuti format `errorHandler.ts`. |
| **FND-P3-04** | Enums | String status di beberapa entitas menggunakan Bahasa Indonesia (`"Belum Bayar"`, `"Lunas"`), sementara di entitas lain menggunakan Bahasa Inggris (`"ACTIVE"`, `"PENDING"`). | `types.ts` lintas domain | Terapkan konvensi enum universal (disarankan format UPPER_SNAKE_CASE). |
