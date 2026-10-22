# 00 — RINGKASAN EKSEKUTIF
## AUDIT BESAR-BESARAN ARSITEKTUR DATA ADMIN SUN89 (READ-ONLY)

**Tanggal Audit:** 22 Oktober 2026  
**Status Audit:** READ-ONLY (Zero Code & Schema Modifications)  
**Root Proyek:** `D:\Admin\adminsunbirojasa`  
**Database Utama:** `server\data\database.sqlite` (SQLite 3 via Node.js native `DatabaseSync`)  
**Backend API Port:** 3001 (Express REST API)  
**Frontend Client:** React 18, Vite, TypeScript, Tailwind CSS (Port 3000)

---

### 1. Latar Belakang & Tujuan Audit

Audit ini dilakukan secara independen, menyeluruh, dan strictly **READ-ONLY** terhadap seluruh lapisan arsitektur aplikasi **Admin SUN89 (Biro Jasa Management System)**. Sistem ini melayani alur kerja operasional kepengurusan dokumen kendaraan bermotor (Samsat), pemrosesan invoice dan pembayaran keuangan, logistik penugasan kurir (messenger), serta pelaporan laba rugi.

Tujuan utama audit adalah:
1. Memetakan alur data end-to-end dari UI komponen, store/adapter, REST API backend, service/repository, hingga skema fisik database SQLite.
2. Menginventarisasikan variabel, tipe data, konstanta, dan kontrak API untuk mendeteksi mismatch, dead code, dan desinkronisasi.
3. Mengidentifikasi kelemahan integritas struktural database, ketiadaan foreign key, anti-pattern penyimpanan, dan celah keamanan.
4. Menyusun ERD Konseptual, ERD Fisik SQLite aktual, dan Peta Dependensi Data secara visual menggunakan Mermaid.
5. Menghasilkan Register Temuan dan Prioritas (P0, P1, P2, P3) serta Roadmap Stabilisasi bertahap tanpa mengubah kode atau data operasional saat ini.

---

### 2. Scorecard & Metrik Utama Sistem

| Metrik Arsitektur | Nilai Terverifikasi | Keterangan |
| :--- | :---: | :--- |
| **Total Tabel Database Aktual** | **20 Tabel** | 0 Views, 0 Triggers di SQLite fisik. |
| **Total Record Database** | **1.061 Baris** | Didominasi oleh master `samsat_offices` (514) dan `wilayah_administratif` (514). |
| **Tabel dengan DDL Foreign Key** | **3 Tabel (15%)** | Hanya `documents`, `invoice_payments`, dan `samsat_offices`. |
| **Tabel Tanpa DDL Foreign Key** | **17 Tabel (85%)** | Relasi antar entitas hanya ditegakkan secara logis melalui kode backend. |
| **Active Express Endpoints** | **38 Endpoints** | 35 rute bisnis (`orderRoutes`, `financeRoutes`, dll.) + 3 health probes. |
| **Dormant API Contracts** | **50 Tanda Tangan** | File di `src/api/endpoints/` merupakan scaffold tidak terpakai (dead code). |
| **Active Frontend Store / Adapters** | **8 Modul** | `orderStore`, `financeStore`, `pricingStore`, `messengerTaskAdapter`, dll. |
| **Active Frontend API Providers** | **5 Provider** | `ApiOrderProvider`, `ApiFinanceProvider`, `ApiPricingProvider`, dll. |
| **Frontend Files Calling API** | **18 File** | Melakukan total 82 pemanggilan `fetch()` aktif. |
| **Tahapan Alur Order Operasional** | **8 Tahap (Stages)** | Dari Tahap 1 (Registrasi) hingga Tahap 8 (Selesai/Arsip). |

---

### 3. Ringkasan Temuan Kritis (High-Level Risks)

Dari hasil audit menyeluruh lintas lapisan, diidentifikasi **19 temuan terstruktur** yang diklasifikasikan ke dalam 4 tingkat prioritas:

```
┌───────────────────────────────────────────────────────────────┐
│                    DISTRIBUSI TEMUAN AUDIT                   │
├─────────────┬───────────┬─────────────────────────────────────┤
│  Prioritas  │  Jumlah   │ Domain Terdampak                    │
├─────────────┼───────────┼─────────────────────────────────────┤
│     P0      │ 3 Temuan  │ Data Loss, Dual Source of Truth, Auth│
│     P1      │ 5 Temuan  │ Transaksi Atomik, Missing FK, Gating│
│     P2      │ 7 Temuan  │ Dead Scaffolding, Naming, Cache Sync│
│     P3      │ 4 Temuan  │ Dokumentasi, Typing DTO, Cleanup    │
└─────────────┴───────────┴─────────────────────────────────────┘
```

#### A. Temuan Kritis P0 (Prioritas Tertinggi)
1. **[FND-P0-01] Dual Source of Truth Anti-Pattern (`data_json` vs Relational Columns)**  
   Pada tabel `orders`, `finance_invoices`, `samsat_pricing`, dan `estimation_templates`, data disimpan ganda di kolom relasional SQL dan blob teks `data_json`. Repository backend membaca langsung `data_json` untuk mengembalikan data ke UI. Jika ada perbaikan atau query SQL manual terhadap kolom terpisah, data di UI tidak berubah (stale) dan berisiko overwrite balik saat di-update.
2. **[FND-P0-02] Ketidaksinkronan Transaksi Rollback & Cancel Order**  
   Fungsi `rollbackOrder` dan `updateOrder` pada `orderService.ts` tidak dibungkus dalam blok transaksi `runInTransaction()`. Jika status order diubah mundur atau dibatalkan namun terjadi kegagalan jaringan atau log audit, state di database menjadi tidak konsisten.
3. **[FND-P0-03] Kerentanan Path Traversal & Ekstensi File Upload**  
   Endpoint upload dokumen pada `documentRoutes.ts` mengandalkan nama file asli tanpa sanitasi ketat untuk ekstensi ganda atau MIME-type verification biner, berisiko terhadap eksploitasi direktori lokal.

#### B. Temuan Utama P1 (Integritas Transaksi & Skema)
1. **[FND-P1-01] Hilangnya Constraint Foreign Key SQLite pada 17 Tabel**  
   Tabel krusial seperti `orders`, `finance_invoices`, `kas_kantor`, `kas_messenger`, dan `messenger_reimbursements` tidak memiliki DDL `FOREIGN KEY`. Integritas referensial rentan terhadap orphan records jika entitas induk dihapus atau ID salah di-insert.
2. **[FND-P1-02] Inkonsistensi Naming & Aliasing Lintas Lapisan (CamelCase vs snake_case)**  
   Field-field keuangan mengalami aliasing ganda (`dibayar` vs `terbayar`, `profit_final` vs `profit`, `invoice_no` vs `invoiceId`). Hal ini menciptakan kerapuhan pada layer adapter jika salah satu properti bernilai `undefined`.
3. **[FND-P1-03] Supervisor Gating Enforcement Belum Terproteksi Penuh di Database**  
   Persetujuan dokumen dan diskon harga dapat dilewati jika request dikirim langsung ke endpoint mutasi generic tanpa memeriksa `approved_by` di sisi repository.

---

### 4. Struktur & Indeks Dokumen Hasil Audit

Seluruh artefak audit disimpan di folder `docs/audit_arsitektur_data/` dengan rincian dokumen sebagai berikut:

| No | File Dokumen | Deskripsi Isi Dokumen |
| :-: | :--- | :--- |
| **00** | [00_RINGKASAN_EKSEKUTIF.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/00_RINGKASAN_EKSEKUTIF.md) | Ringkasan eksekutif, scorecard metrik, high-level findings, dan indeks audit. |
| **01** | [01_PETA_ARSITEKTUR.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/01_PETA_ARSITEKTUR.md) | Peta arsitektur monorepo, topologi alur data, active vs dormant code, bypass layers. |
| **02** | [02_INVENTARIS_VARIABEL_FRONTEND.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/02_INVENTARIS_VARIABEL_FRONTEND.md) | Inventarisasi variabel, hooks, types, stores, dan form state per domain bisnis. |
| **03** | [03_DATA_DICTIONARY_DATABASE.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/03_DATA_DICTIONARY_DATABASE.md) | Data dictionary lengkap 20 tabel SQLite, tipe data, nullability, DDL, PK/FK, dan index. |
| **04** | [04_DATA_LINEAGE_FRONTEND_BACKEND_DB.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/04_DATA_LINEAGE_FRONTEND_BACKEND_DB.md) | Matriks penelusuran field UI → Store → API → Controller → Table.Column SQLite. |
| **05** | [05_KATALOG_API.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/05_KATALOG_API.md) | Katalog 38 endpoint backend aktif + analisis 50 tanda tangan kontrak interface dorman. |
| **06** | [06_AUDIT_LOGIKA_BISNIS.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/06_AUDIT_LOGIKA_BISNIS.md) | Audit logika alur kerja order 8 tahap, rumus tarif Samsat/keuntungan, supervisor gating. |
| **07** | [07_AUDIT_INTEGRITAS_KEAMANAN.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/07_AUDIT_INTEGRITAS_KEAMANAN.md) | Analisis dual source of truth, orphan records, JWT/RBAC, sanitasi input, atomisitas. |
| **08** | [08_ERD_KONSEPTUAL.mmd](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/08_ERD_KONSEPTUAL.mmd) | Diagram ERD Konseptual relasi entitas bisnis utama (Mermaid format). |
| **09** | [09_ERD_FISIK_SQLITE.mmd](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/09_ERD_FISIK_SQLITE.mmd) | Diagram ERD Fisik 20 tabel SQLite aktual beserta PK, FK fisik, dan relasi logis. |
| **10** | [10_PETA_DEPENDENSI_DATA.mmd](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/10_PETA_DEPENDENSI_DATA.mmd) | Diagram dependensi modular dan alur pergerakan data lintas lapisan aplikasi. |
| **11** | [11_REGISTER_TEMUAN_DAN_PRIORITAS.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/11_REGISTER_TEMUAN_DAN_PRIORITAS.md) | Katalog temuan terperinci (P0-P3) dengan bukti kode, dampak, rekomendasi, dan kriteria. |
| **12** | [12_ROADMAP_PERBAIKAN.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/12_ROADMAP_PERBAIKAN.md) | Rencana aksi bertahap (Fase 1 hingga Fase 4) untuk stabilisasi arsitektur data. |
| **13** | [13_CAKUPAN_AUDIT_DAN_KETERBATASAN.md](file:///D:/Admin/adminsunbirojasa/docs/audit_arsitektur_data/13_CAKUPAN_AUDIT_DAN_KETERBATASAN.md) | Batasan metodologi, area terverifikasi vs unverified, dan jaminan keamanan read-only. |

---

### 5. Rekomendasi Tindak Lanjut

1. **Jaga Konsistensi Read-Only:** Jangan melakukan perubahan implementasi secara terburu-buru sebelum tim manajemen dan pemangku kepentingan mengesahkan Register Temuan dan Roadmap Perbaikan.
2. **Prioritaskan Resolusi P0:** Pada fase perbaikan mendatang, fokus utama harus diarahkan pada mitigasi risiko desinkronisasi `data_json` dan pengamanan transaksi atomik pada pembatalan/rollback order.
3. **Pembersihan Bersih (Clean-up) Kode Dorman:** Hilangkan modul dead-code `src/api/endpoints/` secara bertahap atau selaraskan kontraknya agar tidak menimbulkan kebingungan bagi developer masa depan.
