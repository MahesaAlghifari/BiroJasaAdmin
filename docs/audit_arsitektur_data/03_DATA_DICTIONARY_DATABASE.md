# 03 — DATA DICTIONARY DATABASE (SQLITE)
## BASIS DATA AKTUAL: `server/data/database.sqlite`

**Tanggal Audit:** 22 Oktober 2026  
**Status Basis Data:** READ-ONLY Verified  
**Engine Basis Data:** SQLite 3 (melalui Node.js `node:sqlite` DatabaseSync)  
**Total Tabel Aktual:** 20 Tabel | 0 Views | 0 Triggers  
**Total Record Aktual:** 1.061 Baris  
**File Output:** `docs/audit_arsitektur_data/03_DATA_DICTIONARY_DATABASE.md`

---

### 1. Ikhtisar Ringkas 20 Tabel Database Aktual

| No | Nama Tabel | Row Count | Jumlah Kolom | DDL Foreign Keys | DDL Index Khusus | Status Penggunaan |
| :-: | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | `audit_logs` | 115 | 9 | 0 | 2 | **Aktif** (Pencatatan aktivitas sistem) |
| 2 | `documents` | 10 | 16 | 2 FK | 1 | **Aktif** (Metadata berkas fisik upload) |
| 3 | `estimation_templates` | 10 | 7 | 0 | 0 | **Aktif** (Template estimasi biaya) |
| 4 | `finance_invoices` | 1 | 26 | 0 | 1 | **Aktif** (Tagihan piutang order) |
| 5 | `idempotency_keys` | 0 | 7 | 0 | 0 | **Jarang** (Proteksi transaksi ganda) |
| 6 | `invoice_payments` | 1 | 16 | 4 FK | 0 | **Aktif** (Histori pembayaran invoice) |
| 7 | `kas_kantor` | 1 | 12 | 0 | 0 | **Aktif** (Buku besar kas masuk kantor) |
| 8 | `kas_messenger` | 0 | 14 | 0 | 0 | **Siap Pakai** (Saldo kas di tangan kurir) |
| 9 | `messenger_reimbursements` | 0 | 27 | 0 | 0 | **Siap Pakai** (Klaim reimbursement operasional) |
| 10 | `notification_logs` | 16 | 8 | 0 | 0 | **Aktif** (Log pengiriman notifikasi) |
| 11 | `notification_settings` | 1 | 8 | 0 | 0 | **Aktif** (Konfigurasi channel notifikasi) |
| 12 | `orders` | 1 | 19 | 0 | 0 | **Aktif Utama** (Inti alur operasional order) |
| 13 | `payment_methods` | 4 | 8 | 0 | 0 | **Aktif Master** (Rekening transfer & kasir) |
| 14 | `pengeluaran` | 0 | 9 | 0 | 0 | **Siap Pakai** (Buku pengeluaran operasional) |
| 15 | `role_permissions` | 3 | 4 | 0 | 0 | **Aktif Master** (Matriks hak akses RBAC) |
| 16 | `samsat_offices` | 514 | 9 | 1 FK | 0 | **Aktif Master** (Daftar kantor Samsat 514 kab/kota) |
| 17 | `samsat_pricing` | 34 | 8 | 0 | 1 | **Aktif Master** (Tarif dasar Samsat) |
| 18 | `service_pricing_configs` | 1 | 9 | 0 | 0 | **Aktif Master** (Konfigurasi biaya margin jasa) |
| 19 | `users` | 6 | 17 | 0 | 1 | **Aktif Master** (Akun staf & kredensial auth) |
| 20 | `wilayah_administratif` | 514 | 10 | 0 | 0 | **Aktif Master** (Master 514 Kabupaten/Kota RI) |

---

### 2. Kamus Data Detail Per Tabel

---

#### 1. Tabel `orders`
- **Tujuan Bisnis:** Menyimpan data induk transaksi operasional pengurusan berkas Samsat dari tahap pendaftaran hingga selesai/arsip.
- **Baris Aktual:** 1 baris
- **Repositori & Controller:** `DbOrderRepository.ts`, `orderController.ts`, `orderService.ts`.
- **Operasi CRUD:** SELECT, INSERT, UPDATE. (DELETE tidak ada, menggunakan status Cancel/Archive).

| Nama Kolom | Tipe SQLite | Nullable | Default | PK/FK | Deskripsi Kolom |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `order_no` | `TEXT` | NOT NULL | - | **PK** | Identifier kanonis unik order (e.g. `ORD-20261022-001`) |
| `customer` | `TEXT` | NOT NULL | - | - | Nama pemohon jasa / klien |
| `nomor_hp` | `TEXT` | NOT NULL | - | - | Kontak WhatsApp pemohon |
| `layanan` | `TEXT` | NOT NULL | - | - | Kategori layanan pengurusan |
| `current_step` | `INTEGER` | NOT NULL | `1` | - | Angka tahapan aktif (1 s.d 8) |
| `current_stage_name` | `TEXT` | NOT NULL | - | - | Label nama tahap operasional |
| `nopol` | `TEXT` | NOT NULL | - | - | Nomor polisi kendaraan |
| `wilayah_samsat_asal` | `TEXT` | NOT NULL | - | - | Kantor Samsat asal |
| `wilayah_samsat_tujuan` | `TEXT` | NULL | - | - | Kantor Samsat tujuan (jika mutasi) |
| `biaya_jasa` | `REAL` | NOT NULL | `0` | - | Biaya jasa pokok biro |
| `biaya_antar_jemput` | `REAL` | NOT NULL | `0` | - | Biaya kurir logistik |
| `total_biaya` | `REAL` | NOT NULL | `0` | - | Total estimasi awal biaya order |
| `status_order` | `TEXT` | NOT NULL | `'active'` | - | Status siklus (`active`, `archived`, `cancelled`) |
| `data_json` | `TEXT` | NOT NULL | - | - | **Blob JSON lengkap** seluruh properti `OperationalOrder` |
| `created_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu pembuatan order |
| `updated_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu pembaruan terakhir |
| `is_archived` | `INTEGER` | NOT NULL | `0` | - | Flag arsip (0 = aktif, 1 = arsip) |
| `archived_at` | `TEXT` | NULL | - | - | Waktu pengarsipan |
| `archived_by` | `TEXT` | NULL | - | - | Staf yang mengarsipkan |

- **Foreign Keys Fisik (DDL):** **TIDAK ADA**.
- **Relasi Logis:**
  - `orders.order_no` <── 1:1 ──> `finance_invoices.order_no`
  - `orders.order_no` <── 1:N ──> `documents.order_no`
  - `orders.order_no` <── 1:N ──> `invoice_payments.order_no`
- **Risiko Integritas:** Penggunaan `data_json` menduplikasi kolom SQL. Jika `orders.customer` diubah via SQL langsung, pembacaan `DbOrderRepository` tetap membaca nama lama dari `data_json`.

---

#### 2. Tabel `finance_invoices`
- **Tujuan Bisnis:** Mencatat piutang resmi dari order, realisasi biaya Samsat, laba kotor biro jasa, dan kewajiban cashback.
- **Baris Aktual:** 1 baris
- **Repositori & Controller:** `DbFinanceRepository.ts`, `financeController.ts`, `financeService.ts`.
- **Operasi CRUD:** SELECT, INSERT, UPDATE.

| Nama Kolom | Tipe SQLite | Nullable | Default | PK/FK | Deskripsi Kolom |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `id` | `INTEGER` | NOT NULL | - | **PK** | ID auto-increment internal |
| `invoice_no` | `TEXT` | NOT NULL | - | **UNIQUE** | Nomor unik invoice (e.g. `INV-20261022-001`) |
| `order_no` | `TEXT` | NOT NULL | - | - | Relasi logis ke `orders.order_no` |
| `customer` | `TEXT` | NOT NULL | - | - | Nama klien |
| `nopol` | `TEXT` | NOT NULL | - | - | Nomor polisi kendaraan |
| `layanan` | `TEXT` | NOT NULL | - | - | Jenis layanan |
| `total_tagihan` | `REAL` | NOT NULL | `0` | - | Total nominal yang harus dibayar |
| `terbayar` | `REAL` | NOT NULL | `0` | - | Total nominal yang telah diterima |
| `sisa` | `REAL` | NOT NULL | `0` | - | Sisa piutang (`total_tagihan - terbayar`) |
| `status` | `TEXT` | NOT NULL | `'Belum Bayar'` | - | Status bayar (`Belum Bayar`, `Kurang Bayar`, `Lunas`) |
| `biaya_samsat` | `REAL` | NOT NULL | `0` | - | Realisasi pengeluaran riil Samsat |
| `profit_final` | `REAL` | NOT NULL | `0` | - | Laba bersih biro (`total_tagihan - biaya_samsat - cashback`) |
| `profit_status` | `TEXT` | NOT NULL | `'PENDING'` | - | Status realisasi laba (`PENDING`, `REALIZED`) |
| `cashback_nominal` | `REAL` | NOT NULL | `0` | - | Nominal komisi / diskon pemohon |
| `cashback_status` | `TEXT` | NOT NULL | `'PENDING'` | - | Status pencairan cashback |
| `jatuh_tempo` | `TEXT` | NOT NULL | - | - | Tanggal batas akhir pembayaran |
| `billing_status` | `TEXT` | NOT NULL | `'ACTIVE'` | - | Status siklus (`ACTIVE`, `COMPLETED`) |
| `completed_at` | `TEXT` | NULL | - | - | Waktu invoice dinyatakan selesai/lunas |
| `completed_by` | `TEXT` | NULL | - | - | Staf finance yang memfinalisasi |
| `alasan_pending` | `TEXT` | NULL | - | - | Catatan jika profit/cashback terpending |
| `created_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu pembuatan invoice |
| `updated_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu update terakhir |
| `is_archived` | `INTEGER` | NOT NULL | `0` | - | Flag arsip (0/1) |
| `archived_at` | `TEXT` | NULL | - | - | Waktu arsip |
| `archived_by` | `TEXT` | NULL | - | - | Staf yang mengarsipkan |
| `data_json` | `TEXT` | NOT NULL | - | - | Blob JSON `InvoiceBillingRecord` |

- **Foreign Keys Fisik (DDL):** **TIDAK ADA**. (Kolom `order_no` tidak memiliki `REFERENCES orders(order_no)`).
- **Relasi Logis:** `finance_invoices.invoice_no` <── 1:N ──> `invoice_payments.invoice_no`.

---

#### 3. Tabel `invoice_payments`
- **Tujuan Bisnis:** Mencatat riwayat setiap termin transaksi pembayaran (DP, cicilan, pelunasan) yang dilakukan klien untuk invoice tertentu.
- **Baris Aktual:** 1 baris
- **Repositori & Controller:** `DbFinanceRepository.ts`, `financeController.ts`.

| Nama Kolom | Tipe SQLite | Nullable | Default | PK/FK | Deskripsi Kolom |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `id` | `TEXT` | NOT NULL | - | **PK** | UUID / Payment ID |
| `invoice_no` | `TEXT` | NOT NULL | - | **FK** | Referensi ke `finance_invoices(invoice_no)` |
| `order_no` | `TEXT` | NOT NULL | - | **FK** | Referensi ke `orders(order_no)` |
| `nominal` | `REAL` | NOT NULL | - | - | Jumlah uang yang disetor |
| `tanggal_bayar` | `TEXT` | NOT NULL | - | - | Tanggal pembayaran dilakukan |
| `metode_pembayaran` | `TEXT` | NOT NULL | - | - | Saluran bayar (Transfer, Tunai, QRIS) |
| `nama_bank` | `TEXT` | NULL | - | - | Bank tujuan transfer |
| `nama_rekening` | `TEXT` | NULL | - | - | Atas nama rekening penyetor |
| `no_rekening` | `TEXT` | NULL | - | - | Nomor rekening penyetor |
| `document_id` | `TEXT` | NULL | - | **FK** | Referensi ke `documents(id)` bukti transfer |
| `status_verifikasi` | `TEXT` | NOT NULL | `'MENUNGGU_VERIFIKASI'` | - | Status cek staf (`TERVERIFIKASI`, `DITOLAK`) |
| `verified_at` | `TEXT` | NULL | - | - | Waktu verifikasi |
| `verified_by` | `TEXT` | NULL | - | - | Staf finance yang memverifikasi |
| `alasan_penolakan`| `TEXT` | NULL | - | - | Catatan jika bukti transfer invalid |
| `catatan` | `TEXT` | NULL | - | - | Catatan internal pembayaran |
| `kas_kantor_id` | `INTEGER` | NULL | - | **FK** | Referensi ke `kas_kantor(id)` buku besar |

- **Foreign Keys Fisik (DDL):** **LENGKAP (4 FK Terdaftar)**:
  - `invoice_no` -> `finance_invoices(invoice_no)` [ON UPDATE CASCADE, ON DELETE CASCADE]
  - `order_no` -> `orders(order_no)` [ON UPDATE CASCADE, ON DELETE CASCADE]
  - `document_id` -> `documents(id)` [ON UPDATE CASCADE, ON DELETE SET NULL]
  - `kas_kantor_id` -> `kas_kantor(id)` [ON UPDATE CASCADE, ON DELETE SET NULL]

---

#### 4. Tabel `documents`
- **Tujuan Bisnis:** Menyimpan metadata fisik berkas, foto KTP/STNK/BPKB, kwitansi, dan bukti bayar yang diunggah ke storage server.
- **Baris Aktual:** 10 baris
- **Repositori & Controller:** `DbDocumentRepository.ts`, `documentController.ts`.

| Nama Kolom | Tipe SQLite | Nullable | Default | PK/FK | Deskripsi Kolom |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `id` | `TEXT` | NOT NULL | - | **PK** | UUID berkas dokumen |
| `order_no` | `TEXT` | NULL | - | **FK** | Relasi ke `orders(order_no)` |
| `invoice_id` | `TEXT` | NULL | - | **FK** | Relasi ke `finance_invoices(invoice_no)` |
| `file_name` | `TEXT` | NOT NULL | - | - | Nama file di disk storage |
| `original_name` | `TEXT` | NOT NULL | - | - | Nama file asli saat diunggah klien |
| `file_path` | `TEXT` | NOT NULL | - | - | Path absolut/relatif penyimpanan lokal |
| `file_size` | `INTEGER` | NOT NULL | - | - | Ukuran file dalam bytes |
| `mime_type` | `TEXT` | NOT NULL | - | - | Tipe konten berkas (`image/jpeg`, `application/pdf`) |
| `document_type` | `TEXT` | NOT NULL | - | - | Kategori dokumen (`KTP`, `STNK`, `BUKTI_BAYAR`) |
| `phase` | `TEXT` | NULL | - | - | Siklus berkas (`BEFORE_SAMSAT`, `AFTER_SAMSAT`) |
| `uploaded_by` | `TEXT` | NOT NULL | - | - | Username pengunggah |
| `created_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu upload |
| `status` | `TEXT` | NOT NULL | `'active'` | - | Status berkas (`active`, `deleted`) |
| `deleted_at` | `TEXT` | NULL | - | - | Waktu soft-delete berkas |
| `deleted_by` | `TEXT` | NULL | - | - | Staf yang menghapus |
| `checksum` | `TEXT` | NULL | - | - | Hash SHA256 integritas berkas |

- **Foreign Keys Fisik (DDL):** **LENGKAP (2 FK Terdaftar)**:
  - `order_no` -> `orders(order_no)` [ON UPDATE CASCADE, ON DELETE CASCADE]
  - `invoice_id` -> `finance_invoices(invoice_no)` [ON UPDATE CASCADE, ON DELETE SET NULL]

---

#### 5. Tabel `kas_kantor`
- **Tujuan Bisnis:** Buku kas umum kantor untuk mencatat seluruh arus kas masuk dari pelunasan invoice klien dan arus kas keluar.
- **Baris Aktual:** 1 baris
- **Repositori & Controller:** `DbFinanceRepository.ts`, `financeController.ts`.

| Nama Kolom | Tipe SQLite | Nullable | Default | PK/FK | Deskripsi Kolom |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `id` | `INTEGER` | NOT NULL | - | **PK** | ID auto-increment buku kas |
| `tanggal` | `TEXT` | NOT NULL | - | - | Tanggal pencatatan transaksi |
| `jenis_transaksi`| `TEXT` | NOT NULL | - | - | Kategori arus (`MASUK` / `KELUAR`) |
| `nominal` | `REAL` | NOT NULL | - | - | Nilai mutasi uang dalam Rupiah |
| `saldo_berjalan` | `REAL` | NOT NULL | - | - | Saldo kas kumulatif setelah transaksi |
| `order_no` | `TEXT` | NULL | - | - | Nomor order rujukan |
| `invoice_no` | `TEXT` | NULL | - | - | Nomor invoice rujukan |
| `keterangan` | `TEXT` | NOT NULL | - | - | Uraian mutasi kas |
| `metode` | `TEXT` | NOT NULL | - | - | Rekening bank / Tunai |
| `created_by` | `TEXT` | NOT NULL | - | - | Staf finance pembuat entri |
| `created_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Timestamp pencatatan |
| `bukti_id` | `TEXT` | NULL | - | - | Dokumen bukti setor |

- **Foreign Keys Fisik (DDL):** **TIDAK ADA**. Relasi ke `orders` dan `finance_invoices` hanya logis.

---

#### 6. Tabel `kas_messenger`
- **Tujuan Bisnis:** Buku kas operasional kurir untuk melacak sisa uang jalan (kasbon) yang dibawa messenger saat bertugas di lapangan.
- **Baris Aktual:** 0 baris (Struktur siap pakai).
- **Kolom Utama:** `id` (PK), `messenger_id`, `tanggal`, `jenis_transaksi` (TOPUP / PENGELUARAN), `nominal`, `saldo_berjalan`, `order_no`, `reimbursement_id`, `keterangan`, `created_at`.
- **Foreign Keys Fisik (DDL):** **TIDAK ADA**.

---

#### 7. Tabel `messenger_reimbursements`
- **Tujuan Bisnis:** Mencatat formulir pengajuan klaim penggantian dana operasional (bensin, tol, parkir, legalisir) oleh kurir.
- **Baris Aktual:** 0 baris (Struktur siap pakai).
- **Kolom Utama:** `id` (PK), `reimbursement_no`, `messenger_id`, `order_no`, `kategori`, `nominal`, `status` (PENDING, APPROVED, REJECTED, PAID), `approved_by`, `paid_at`, `bukti_dokumen_id`.
- **Foreign Keys Fisik (DDL):** **TIDAK ADA**.

---

#### 8. Tabel `pengeluaran`
- **Tujuan Bisnis:** Buku pengeluaran biaya umum non-order biro jasa (sewa kantor, ATK, operasional bulanan).
- **Baris Aktual:** 0 baris (Struktur siap pakai).
- **Kolom Utama:** `id` (PK), `tanggal`, `kategori`, `nominal`, `keterangan`, `metode_pembayaran`, `bukti_dokumen_id`, `created_by`, `created_at`.
- **Foreign Keys Fisik (DDL):** **TIDAK ADA**.

---

#### 9. Tabel `users`
- **Tujuan Bisnis:** Menyimpan akun staf internal, peran (role), hash kata sandi, dan status operasional karyawan.
- **Baris Aktual:** 6 baris (`admin`, `finance`, `operasional`, `messenger1`, `messenger2`, `supervisor`).
- **Repositori & Controller:** `DbUserRepository.ts`, `userController.ts`, `authController.ts`.

| Nama Kolom | Tipe SQLite | Nullable | Default | PK/FK | Deskripsi Kolom |
| :--- | :--- | :---: | :--- | :---: | :--- |
| `id` | `TEXT` | NOT NULL | - | **PK** | ID user kanonis (e.g. `USR-001`) |
| `username` | `TEXT` | NOT NULL | - | **UNIQUE** | Nama pengguna untuk login |
| `password_hash` | `TEXT` | NOT NULL | - | - | Hash sandi Bcrypt terenkripsi aman |
| `nama_lengkap` | `TEXT` | NOT NULL | - | - | Nama resmi karyawan |
| `role` | `TEXT` | NOT NULL | - | - | Role kewenangan (`administrator`, `admin`, `svp`, `finance`, `messenger`) |
| `status` | `TEXT` | NOT NULL | `'active'` | - | Status akun (`active`, `inactive`) |
| `nomor_hp` | `TEXT` | NULL | - | - | Nomor telepon staf |
| `email` | `TEXT` | NULL | - | - | Email staf |
| `jabatan` | `TEXT` | NULL | - | - | Jabatan struktural |
| `cabang` | `TEXT` | NULL | - | - | Penempatan kantor cabang |
| `created_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu pembuatan akun |
| `updated_at` | `TEXT` | NOT NULL | `CURRENT_TIMESTAMP` | - | Waktu update terakhir |

- **Foreign Keys Fisik (DDL):** **TIDAK ADA**.

---

#### 10. Tabel `role_permissions`
- **Tujuan Bisnis:** Menyimpan hak akses granular (menu, tombol aksi, edit/hapus) per peran pengguna.
- **Baris Aktual:** 3 baris.
- **Kolom Utama:** `role` (PK), `permissions_json` (Blob teks JSON array hak akses), `created_at`, `updated_at`.

---

#### 11. Tabel `samsat_pricing`
- **Tujuan Bisnis:** Menyimpan daftar harga dasar operasional resmi di loket Samsat per wilayah dan kategori pengurusan.
- **Baris Aktual:** 34 baris.
- **Kolom Utama:** `id` (PK, TEXT), `samsat_id`, `category`, `service_code`, `service_name`, `base_price`, `status_aktif`, `data_json`.

---

#### 12. Tabel `service_pricing_configs`
- **Tujuan Bisnis:** Menyimpan konfigurasi biaya jasa (margin keuntungan biro jasa) untuk paket-paket pengurusan.
- **Baris Aktual:** 1 baris.
- **Kolom Utama:** `service_id` (PK), `service_name`, `selling_price`, `status_aktif`, `data_json`.

---

#### 13. Tabel `payment_methods`
- **Tujuan Bisnis:** Master kanal pembayaran aktif biro jasa (Rekening BCA, Mandiri, BRI, Kasir Tunai).
- **Baris Aktual:** 4 baris.
- **Kolom Utama:** `id` (PK), `nama_metode`, `tipe` (BANK_TRANSFER / CASH / QRIS), `nama_bank`, `nomor_rekening`, `atas_nama`, `status_aktif`, `urutan`.

---

#### 14. Tabel `samsat_offices`
- **Tujuan Bisnis:** Master data seluruh kantor pelayanan Samsat di 514 Kabupaten/Kota se-Indonesia.
- **Baris Aktual:** 514 baris.
- **Kolom Utama:** `id` (PK), `kode_kabupaten_kota` (**FK fisik** ke `wilayah_administratif`), `nama_samsat`, `wilayah`, `alamat`, `is_verified`, `status_aktif`.

---

#### 15. Tabel `wilayah_administratif`
- **Tujuan Bisnis:** Master data resmi 514 Kabupaten dan Kota di Indonesia mengacu pada kode wilayah Kemendagri.
- **Baris Aktual:** 514 baris.
- **Kolom Utama:** `kode_kabupaten_kota` (PK), `kode_provinsi`, `nama_provinsi`, `nama_kabupaten_kota`, `jenis_wilayah`, `status_aktif`, `sumber_referensi`, `tahun_referensi`.

---

#### 16. Tabel `estimation_templates`
- **Tujuan Bisnis:** Template aturan rumus kalkulasi estimasi biaya per jenis layanan (PKB, SWDKLLJ, PNBP).
- **Baris Aktual:** 10 baris.
- **Kolom Utama:** `id` (PK), `service_key`, `name`, `category`, `data_json`, `created_at`, `updated_at`.

---

#### 17. Tabel `audit_logs`
- **Tujuan Bisnis:** Jejak rekam audit trail seluruh aktivitas mutasi data oleh pengguna (Login, Buat Order, Hapus, Ubah Tarif, dsb.).
- **Baris Aktual:** 115 baris.
- **Kolom Utama:** `id` (PK), `user_id`, `username`, `action`, `resource`, `resource_id`, `details`, `ip_address`, `created_at`.

---

#### 18. Tabel `notification_settings`
- **Tujuan Bisnis:** Konfigurasi akun gateway pengiriman pesan otomatis (WhatsApp API, SMS).
- **Baris Aktual:** 1 baris.
- **Kolom Utama:** `id` (PK), `provider`, `api_endpoint`, `api_key_masked`, `sender_number`, `templates_json`, `status_aktif`, `updated_at`.

---

#### 19. Tabel `notification_logs`
- **Tujuan Bisnis:** Catatan riwayat status kirim notifikasi ke nomor WhatsApp pemohon.
- **Baris Aktual:** 16 baris.
- **Kolom Utama:** `id` (PK), `order_no`, `recipient_phone`, `message_type`, `status` (SENT / FAILED), `error_message`, `sent_at`.

---

#### 20. Tabel `idempotency_keys`
- **Tujuan Bisnis:** Tabel pencegahan request ganda (double-submit) pada operasi mutasi pembayaran dan order.
- **Baris Aktual:** 0 baris (Dukungan infrastruktur siap pakai).
- **Kolom Utama:** `key` (PK), `path`, `request_hash`, `response_status`, `response_body`, `created_at`, `expires_at`.

---

### 3. Analisis Ketiadaan Constraint Foreign Key SQLite

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      RINGKASAN STATUS FOREIGN KEY DI SKEMA SQLITE                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ • Tabel DENGAN Foreign Key Fisik (3 Tabel):                                           │
│   1. `documents`: `order_no` -> `orders`, `invoice_id` -> `finance_invoices`.         │
│   2. `invoice_payments`: `invoice_no`, `order_no`, `document_id`, `kas_kantor_id`.    │
│   3. `samsat_offices`: `kode_kabupaten_kota` -> `wilayah_administratif`.             │
│                                                                                        │
│ • Tabel TANPA Foreign Key Fisik (17 Tabel):                                           │
│   `orders`, `finance_invoices`, `kas_kantor`, `kas_messenger`,                         │
│   `messenger_reimbursements`, `pengeluaran`, `users`, `audit_logs`,                    │
│   `notification_logs`, `samsat_pricing`, `service_pricing_configs`, dsb.               │
│                                                                                        │
│ • Dampak Integritas:                                                                   │
│   SQLite tidak mencegah penghapusan induk jika anak masih ada (kecuali di 3 tabel).   │
│   Semua validasi integritas relasional bergantung penuh pada kode JavaScript backend.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
