# 07 — AUDIT INTEGRITAS & KEAMANAN DATA
## DUAL SOURCE OF TRUTH, KONSISTENSI TRANSAKSI, RBAC & EVALUASI KERENTANAN

**Tanggal Audit:** 22 Oktober 2026  
**Status:** READ-ONLY Security & Data Integrity Audit  
**File Output:** `docs/audit_arsitektur_data/07_AUDIT_INTEGRITAS_KEAMANAN.md`

---

### 1. Analisis Anti-Pattern "Dual Source of Truth" (`data_json`)

Salah satu temuan struktural paling fundamental dalam sistem Admin SUN89 adalah penggunaan kolom teks `data_json` di samping kolom-kolom relasional SQL biasa pada tabel:
- `orders` (Kolom SQL: `customer`, `nopol`, `current_step`, `total_biaya`, dsb. + `data_json`)
- `finance_invoices` (Kolom SQL: `total_tagihan`, `terbayar`, `profit_final`, dsb. + `data_json`)
- `samsat_pricing` (Kolom SQL: `samsat_id`, `category`, `base_price`, dsb. + `data_json`)
- `service_pricing_configs` (Kolom SQL: `service_id`, `selling_price`, dsb. + `data_json`)
- `estimation_templates` (Kolom SQL: `service_key`, `name`, dsb. + `data_json`)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        DUAL SOURCE OF TRUTH: ANATOMI RESIKO                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                          [OPERASI PENYIMPANAN (WRITE)]                                │
│        Form UI ──> Repository ──┬──> SQL Columns (`customer`, `nopol`, `total_biaya`)  │
│                                 └──> Text Blob (`data_json`)                          │
│                                                                                        │
│                          [OPERASI PEMBACAAN (READ)]                                   │
│        Repository.getAllFlat() ────> Membaca HANYA `data_json` ────> Frontend UI      │
│                                      (SQL Columns DIABAIKAN!)                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Risiko dan Dampak Negatif:
1. **Desinkronisasi Tak Terdeteksi (Data Stale):** Jika seorang administrator atau script pemeliharaan memperbarui data menggunakan query SQL biasa (misal: `UPDATE orders SET customer = 'PT Baru' WHERE order_no = 'ORD-001'`), perubahan tersebut **tidak akan pernah muncul di UI** karena `DbOrderRepository.getAllFlat()` dan `getByOrderNo()` mem-parse properti dari `data_json`.
2. **Penimpaan Mundur (Overwriting Stale Data):** Ketika pengguna di UI membuka order tersebut dan mengklik simpan, form akan mengirim data dari `data_json` yang lama dan menimpa kembali kolom SQL yang baru diperbaiki.
3. **Pencarian & Indeks SQL Tidak Efektif:** Query pencarian SQL terhadap kolom relasional dapat mengembalikan baris yang di dalamnya menyimpan nilai JSON berbeda.
4. **Rekomendasi:** Tentukan sumber kebenaran tunggal (*canonical single source of truth*). Kolom relasional SQL harus menjadi data utama, dan `data_json` hanya boleh menyimpan properti ekstensi yang tidak memiliki kolom fisik.

---

### 2. Integritas Relasional & Risiko Data Yatim (Orphan Records)

Dari **20 tabel aktual**, hanya **3 tabel** yang memiliki deklarasi `FOREIGN KEY` pada skema SQLite:
1. `documents`: `order_no` -> `orders`, `invoice_id` -> `finance_invoices`.
2. `invoice_payments`: `invoice_no` -> `finance_invoices`, `order_no` -> `orders`, `document_id` -> `documents`, `kas_kantor_id` -> `kas_kantor`.
3. `samsat_offices`: `kode_kabupaten_kota` -> `wilayah_administratif`.

#### 17 Tabel Tanpa DDL Foreign Key:
Tabel seperti `orders`, `finance_invoices`, `kas_kantor`, `kas_messenger`, `messenger_reimbursements`, `pengeluaran`, `users`, `audit_logs`, dan `notification_logs` tidak memiliki foreign key formal.

#### Dampak Integritas:
- Relasi seperti `orders.user_id`, `kas_kantor.order_no`, dan `messenger_reimbursements.messenger_id` hanya ditegakkan oleh logika kode Express.
- Jika terjadi eksekusi manual via script SQLite atau bug di layer controller, SQLite tidak akan menolak record yang merujuk ke ID induk yang tidak eksis.
- Tidak ada proteksi `ON DELETE RESTRICT` bawaan database pada tabel-tabel keuangan vital.

---

### 3. Audit Batasan Transaksi Atomik (`runInTransaction`)

Backend mengimplementasikan utility transaksi sinkron pada `server/src/database/db.ts`:
```typescript
export function runInTransaction<T>(action: () => T): T {
  db.exec("BEGIN IMMEDIATE TRANSACTION");
  try {
    const result = action();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
```

#### Status Penerapan Transaksi Lintas Operasi:
| Operasi Bisnis | File & Method | Menggunakan Transaksi? | Status Evaluasi |
| :--- | :--- | :---: | :--- |
| Pembayaran Invoice & Catat Kas | `financeService.payInvoice` | **YA** | **AMAN** (Invoice + Payment + Kas Kantor) |
| Pencairan Cashback Klien | `financeService.payoutCashback` | **YA** | **AMAN** (Invoice + Kas Kantor) |
| Finalisasi Selesai Tagihan | `financeService.completeInvoice` | **YA** | **AMAN** (Invoice + Profit Status) |
| Pendaftaran Order Baru | `orderService.createOrder` | **YA** | **AMAN** (Order + Invoice Draft + Audit) |
| Kemajuan Tahap Order | `orderService.advanceOrder` | **YA** | **AMAN** (Order Step + Audit Log) |
| Pembatalan Order | `orderService.cancelOrder` | **YA** | **AMAN** (Order + Invoice Cancel + Audit) |
| Pencairan Reimbursement Kurir| `messengerService.payReimbursement`| **YA** | **AMAN** (Reimburse + Kas Kantor) |
| **Pembalikan Tahap Order (Rollback)** | `orderService.rollbackOrder` | **TIDAK** | **BERISIKO (FND-P0-02)** |
| **Pembaruan Data Order Umum** | `orderService.updateOrder` | **TIDAK** | **BERISIKO (FND-P0-02)** |

**Temuan Kritis:** Jika `orderService.rollbackOrder` gagal di tengah eksekusi (misal saat logging audit atau sinkronisasi invoice mundur), perubahan tahapan di tabel `orders` tidak ter-rollback otomatis.

---

### 4. Audit Strategi Penghapusan: Soft Delete vs Hard Delete

Sistem menerapkan kebijakan penghapusan campuran yang memerlukan standardisasi:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        POLA PENGHAPUSAN DATA (DATA DELETION)                           │
├────────────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ TABEL                      │ METODE PENGHAPUSAN          │ EVALUASI INTEGRITAS         │
├────────────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ `orders`                   │ Soft Delete (`is_archived`) │ Baik (History terjaga).     │
│ `orders` (Archived table)  │ Hard Delete (`DELETE FROM`) │ Rentan kehilangan jejak PK. │
│ `documents`                │ Soft Delete (`deleted_at`)  │ Sangat Baik (Audit berkas). │
│ `users`                    │ Soft Delete (`inactive`)    │ Sangat Baik (Integritas log)│
│ `payment_methods`          │ Hard Delete (`DELETE FROM`) │ Berisiko jika ada riwayat.  │
│ `service_pricing_configs`  │ Hard Delete (`DELETE FROM`) │ Berisiko jika ada rujukan.  │
└────────────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

---

### 5. Audit Keamanan Aplikasi (Security Architecture)

#### A. Autentikasi JWT & Pengelolaan Sesi
- Menggunakan JSON Web Token dengan algoritma HMAC-SHA256 (`jwt.sign`, `jwt.verify`).
- Secret token dikonfigurasi melalui `JWT_SECRET` pada file `.env`.
- Token memiliki masa berlaku terbatas (`CONFIG.JWT_EXPIRES_IN = "24h"`).
- Middleware `requireAuth` memvalidasi header `Authorization: Bearer <token>`. Jika token kedaluwarsa atau tandatangan tidak valid, request ditolak dengan status HTTP 401.

#### B. Otorisasi Berbasis Peran (RBAC Enforcement)
- Role pengguna: `administrator`, `admin`, `svp` (supervisor), `finance`, `messenger`.
- **Enforcement di Backend:** Route-route kritis dilindungi oleh `requireRoles(...)`. Sebagai contoh:
  - Pembatalan order: Hanya `administrator`, `admin`, `svp`.
  - Approval dokumen: Hanya `svp`, `administrator`.
  - Verifikasi bayar & kas: Hanya `finance`, `admin`, `administrator`.
  - Reset password: Hanya `administrator`, `admin`.
- **Enforcement di Frontend:** Navigasi tab dan tombol aksi diatur oleh `permissionStore.ts` dan state role `usePermission`.

#### C. Pencegahan SQL Injection
- Backend menggunakan Node.js native `DatabaseSync` (`node:sqlite`).
- **100% Prepared Statements:** Seluruh query SQL pada `server/src/repositories/` menggunakan parameterized statements (`db.prepare("SELECT ... WHERE col = ?").all(val)`).
- Tidak ditemukan penggunaan string concatenation pada klausa `WHERE` atau parameter dinamis.

#### D. Keamanan File Upload & Dokumen Fisik
- Berkas disimpan di disk lokal `server/uploads/` dengan penamaan berbasis UUID acak (`id + ext`).
- Endpoint unduh/preview menggunakan tiket satu kali pakai (`POST /api/documents/:id/ticket`), mencegah *unauthorized direct URL brute forcing*.
- **Kerentanan Teridentifikasi (FND-P0-03):** Validasi tipe berkas saat ini mengandalkan ekstensi nama file dan header MIME dari klien. Belum ada verifikasi *magic bytes* biner untuk mencegah file berbahaya yang disamarkan sebagai gambar atau PDF.

#### E. Penyimpanan Kata Sandi & Kredensial
- Password disimpan dalam bentuk hash Bcrypt dengan salt rounds 10.
- Tidak ada password plaintext yang disimpan di database `users` maupun dicatat di tabel `audit_logs`.
- Payload response API `GET /api/users` dan `GET /api/auth/me` secara eksplisit mengecualikan kolom `password_hash`.
