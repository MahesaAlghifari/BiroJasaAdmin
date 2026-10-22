# 12 — ROADMAP PERBAIKAN ARSITEKTUR DATA
## RENCANA AKSI BERTAHAP STABILISASI & REFAKTOR SISTEM (FASE 1 — 4)

**Tanggal Penyusunan:** 22 Oktober 2026  
**Status Dokumen:** Roadmap Perbaikan Pasca-Audit (Actionable Implementation Plan)  
**File Output:** `docs/audit_arsitektur_data/12_ROADMAP_PERBAIKAN.md`

---

### 1. Ikhtisar Strategi Stabilisasi

Roadmap ini dirancang untuk menyelesaikan seluruh temuan audit (P0 s.d P3) secara bertahap tanpa mengganggu operasional sistem yang sedang berjalan. Pendekatan perbaikan dibagi ke dalam **4 fase berurutan**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      ROADMAP STABILISASI DATA ADMIN SUN89              │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ FASE PERBAIKAN     │ TARGET PRIORITAS   │ FOKUS UTAMA                  │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ FASE 1: MITIGASI   │ Temuan Kritis P0   │ Dual Source of Truth,        │
│ KEAMANAN & DATA    │ (3 Temuan)         │ Transaksi Rollback & Upload  │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ FASE 2: INTEGRITAS │ Temuan Utama P1    │ DDL Foreign Keys, Aliasing,  │
│ TRANSAKSI & SKEMA  │ (5 Temuan)         │ Gating SVP & Data Retention  │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ FASE 3: OPTIMASI   │ Temuan Menengah P2 │ Pembersihan Dead Scaffolding,│
│ ARSITEKTUR         │ (7 Temuan)         │ Idempotensi & Pagination     │
├────────────────────┼────────────────────┼──────────────────────────────┤
│ FASE 4: STANDARISASI│ Temuan Ringan P3  │ Enum Universal, Skema DTO,   │
│ & DOKUMENTASI      │ (4 Temuan)         │ Refaktor Format Error        │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

---

### 2. Rincian Rencana Aksi Per Fase

---

#### FASE 1: Mitigasi Isu Kritis P0 (Immediate Data & Security Stabilization)
*Target: Menyelesaikan risiko kehilangan data, desinkronisasi fatal, dan kerentanan upload berkas.*

| No | Task Action | Temuan Terkait | Estimasi Usaha | Risiko Regresi | Strategi Mitigasi / Verifikasi |
| :-: | :--- | :---: | :---: | :---: | :--- |
| **1.1** | **Sinkronisasi Dua Arah `data_json` vs Kolom SQL**<br>Perbarui `DbOrderRepository` dan `DbFinanceRepository` agar setiap mutasi memperbarui kolom SQL dan `data_json` secara konsisten. Lapisan pembacaan (`getAllFlat`, `getByOrderNo`) wajib membaca langsung kolom SQL primer dan hanya mengambil field tambahan dari JSON. | `FND-P0-01` | **M (Medium)** | Rendah | Uji update langsung via SQLite CLI, pastikan UI langsung menampilkan data terbaru tanpa cache lama. |
| **1.2** | **Bungkus Operasi Rollback & Update dalam `runInTransaction()`**<br>Tambahkan wrapper transaksi atomik pada fungsi `rollbackOrder()` dan `updateOrder()` di `orderService.ts`. | `FND-P0-02` | **S (Small)** | Sangat Rendah | Simulasikan error pada query kedua saat rollback, pastikan status order di database kembali ke semula. |
| **1.3** | **Perketat Validasi Berkas Upload dengan Magic-Bytes Biner**<br>Integrasikan pustaka pembaca buffer (*magic numbers*) di `documentRoutes.ts` sebelum berkas ditulis ke folder `uploads/`. Tolak berkas jika header biner tidak sesuai dengan ekstensi gambar/PDF asli. | `FND-P0-03` | **S (Small)** | Rendah | Uji upload berkas skrip yang di-rename menjadi `.pdf`, pastikan sistem menolak dengan HTTP 400. |

**Kriteria Selesai Fase 1:**
- Tidak ada desinkronisasi antara query SQL langsung dan tampilan UI.
- Seluruh mutasi siklus hidup order (create, advance, rollback, cancel) 100% transaksional.
- Upload berkas aman dari manipulasi ekstensi palsu.

---

#### FASE 2: Integritas Transaksional & Skema Basis Data P1
*Target: Menegakkan integritas referensial fisik, mengeliminasi aliasing properti, dan mengamankan gating kewenangan.*

| No | Task Action | Temuan Terkait | Estimasi Usaha | Risiko Regresi | Strategi Mitigasi / Verifikasi |
| :-: | :--- | :---: | :---: | :---: | :--- |
| **2.1** | **Migrasi DDL Foreign Keys pada 17 Tabel Basis Data**<br>Susun skrip migrasi SQLite untuk menambahkan constraint `FOREIGN KEY` formal pada tabel `orders`, `finance_invoices`, `kas_kantor`, `kas_messenger`, `messenger_reimbursements`, dan `users`. | `FND-P1-01` | **L (Large)** | Sedang | Lakukan migrasi data menggunakan tabel perantara (`temp_table`), verifikasi foreign key menggunakan `PRAGMA foreign_key_check`. |
| **2.2** | **Standarisasi Penamaan Properti Tunggal (Eliminasi Aliasing)**<br>Hapus properti ganda pada `src/domain/finance/types.ts` (`invoice` vs `invoiceNo`, `terbayar` vs `dibayar`). Terapkan konvensi tunggal `invoiceNo` dan `terbayar` di seluruh form dan store. | `FND-P1-02` | **M (Medium)** | Sedang | Lakukan pencarian global dan type-checking TypeScript (`tsc --noEmit`) untuk memastikan tidak ada referensi properti lama yang terputus. |
| **2.3** | **Enforcement Wewenang Supervisor di Sisi Backend Repository**<br>Pastikan endpoint `PUT /api/orders/:orderNo` menolak modifikasi properti `stage5Verified` dan `stage6Approved` jika pengguna bukan role `svp` atau `administrator`. | `FND-P1-03` | **S (Small)** | Sangat Rendah | Uji coba pengiriman payload bypass via cURL dengan token role non-supervisor, pastikan perubahan diabaikan. |
| **2.4** | **Kebijakan Soft-Delete Permanen pada Order Terarsip**<br>Ubah endpoint `DELETE /api/orders/archived/:orderNo` agar tidak menghapus baris secara fisik (`DELETE FROM`), melainkan menetapkan flag `status_order = 'purged'`. | `FND-P1-04` | **S (Small)** | Rendah | Pastikan dokumen fisik dan bukti transfer tetap tersimpan untuk kebutuhan audit kepatuhan. |
| **2.5** | **Eliminasi Flash State Lokal saat Membaca Auth Token**<br>Perbaiki inisialisasi state pada `ApiOrderProvider` dan `financeStore` agar menunggu status token siap sebelum merender data ke antarmuka. | `FND-P1-05` | **S (Small)** | Sangat Rendah | Uji muat halaman pada koneksi lambat, pastikan skeleton loading muncul menggantikan dummy array. |

**Kriteria Selesai Fase 2:**
- `PRAGMA foreign_key_check` menghasilkan 0 error di SQLite.
- Tidak ada deklarasi properti alias duplikat pada file type domain.
- Supervisor gating terproteksi ganda di frontend dan backend repository.

---

#### FASE 3: Pembersihan Kode Dorman & Skalabilitas P2
*Target: Membersihkan dead code scaffolding, mengaktifkan proteksi idempotensi, dan menambahkan pagination.*

| No | Task Action | Temuan Terkait | Estimasi Usaha | Risiko Regresi | Strategi Mitigasi / Verifikasi |
| :-: | :--- | :---: | :---: | :---: | :--- |
| **3.1** | **Arsipkan / Hapus Scaffolding Interface Dorman**<br>Pindahkan atau tandai 7 file di `src/api/endpoints/` sebagai dokumentasi legacy, atau selaraskan kontraknya sebagai representasi resmi backend jika diperlukan di masa depan. | `FND-P2-01` | **S (Small)** | Sangat Rendah | Pastikan build Vite dan typecheck tetap lulus tanpa error import. |
| **3.2** | **Sentralisasi Pemanggilan Direct Fetch**<br>Alihkan pemanggilan fetch langsung pada `auditLog.ts` dan `Settings.tsx` ke dalam `ApiUserProvider` dan `ApiDocumentProvider`. | `FND-P2-02` | **S (Small)** | Rendah | Uji pencatatan audit log saat aksi pengguna berlangsung. |
| **3.3** | **Indeks Kolom Realisasi Kas Kantor**<br>Tambahkan kolom `is_cash_realized INTEGER DEFAULT 0` pada tabel `finance_invoices` beserta indeks SQL untuk mempercepat query rekonsiliasi kas. | `FND-P2-03` | **S (Small)** | Sangat Rendah | Verifikasi skema dengan `PRAGMA table_info`. |
| **3.4** | **Aktifkan Proteksi Idempotensi pada Mutasi Pembayaran**<br>Pasang middleware pengecekan header `X-Idempotency-Key` pada endpoint pembayaran dan pembuatan order untuk memanfaatkan tabel `idempotency_keys`. | `FND-P2-05` | **M (Medium)** | Rendah | Uji pengiriman 2 request identik secara bersamaan, pastikan request kedua mengembalikan respons cache tanpa memicu dobel mutasi kas. |
| **3.5** | **Penerapan Pagination SQL pada Endpoint Berat**<br>Tambahkan klausa `LIMIT ? OFFSET ?` pada `GET /api/orders` dan `GET /api/audit-logs` untuk mendukung pagination efisien saat data membesar. | `FND-P2-06` | **M (Medium)** | Sedang | Uji navigasi halaman tabel data penjualan dan log audit dengan 100+ baris. |

**Kriteria Selesai Fase 3:**
- Kode sumber bersih dari file scaffolding tak terpakai.
- Pembayaran terlindung dari risiko double-submit jaringan.
- Query order dan audit log terpaginasi secara efisien di level database.

---

#### FASE 4: Standarisasi Tipe Data & Refaktor Kosmetik P3
*Target: Merapikan enum status, standarisasi respons error, dan penguatan skema DTO.*

| No | Task Action | Temuan Terkait | Estimasi Usaha | Risiko Regresi |
| :-: | :--- | :---: | :---: | :---: |
| **4.1** | Ganti placeholder hardcoded tarif di visual UI dengan komponen skeleton dinamis. | `FND-P3-01` | **S** | Sangat Rendah |
| **4.2** | Terapkan validasi DTO ketat menggunakan library schema validator (Zod) pada setiap controller Express. | `FND-P3-02` | **M** | Rendah |
| **4.3** | Standarisasikan seluruh respons error Express agar seragam mengikuti struktur `{ success: false, error: { code, message } }`. | `FND-P3-03` | **S** | Rendah |
| **4.4** | Harmonisasi format string status (pilih standar UPPER_SNAKE_CASE universal). | `FND-P3-04` | **M** | Sedang |

---

### 3. Matriks Alokasi Usaha & Risiko Regresi

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MATRIKS USAHA & RISIKO REGRESI                  │
├──────────────────────┬─────────────────────────────────────────────────┤
│ UKURAN USAHA         │ DISTRIBUSI TUGAS                                │
├──────────────────────┼─────────────────────────────────────────────────┤
│ Small (S: < 0.5 hari)│ 1.2, 1.3, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 4.1, 4.3│
│ Medium (M: 1–2 hari) │ 1.1, 2.2, 3.4, 3.5, 4.2, 4.4                    │
│ Large (L: 3–5 hari)  │ 2.1 (Migrasi DDL Foreign Key 17 Tabel)          │
└──────────────────────┴─────────────────────────────────────────────────┘
```

**Rekomendasi Pelaksanaan:**  
Mulailah secara disiplin dari **Fase 1** untuk mengamankan data dan transaksi operasional saat ini. Jangan menjalankan Fase 2 dan seterusnya sebelum seluruh kriteria selesai Fase 1 diverifikasi dengan aman.
