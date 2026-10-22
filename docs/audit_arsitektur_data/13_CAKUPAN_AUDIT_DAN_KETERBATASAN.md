# 13 — CAKUPAN AUDIT DAN KETERBATASAN
## BATASAN METODOLOGI, VERIFIKASI STATIS VS RUNTIME & JAMINAN KESELAMATAN

**Tanggal Audit:** 22 Oktober 2026  
**Status Laporan:** READ-ONLY Audit Boundaries & Limitations  
**File Output:** `docs/audit_arsitektur_data/13_CAKUPAN_AUDIT_DAN_KETERBATASAN.md`

---

### 1. Metodologi & Kepatuhan Batasan Keselamatan

Audit arsitektur data ini dilaksanakan dengan mematuhi secara ketat **10 Aturan Keselamatan (Safety Constraints)** yang ditetapkan:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   KEPATUHAN 10 ATURAN KESELAMATAN READ-ONLY            │
├────┬─────────────────────────────────────────────────┬────────────────┤
│ NO │ ATURAN KESELAMATAN                              │ STATUS         │
├────┼─────────────────────────────────────────────────┼────────────────┤
│ 1  │ Tidak mengubah file kode aplikasi frontend/backend│ **DIPATUHI**   │
│ 2  │ Tidak melakukan INSERT, UPDATE, DELETE, migrasi  │ **DIPATUHI**   │
│ 3  │ Tidak mengubah tarif, akun, sandi, role operasional│ **DIPATUHI**  │
│ 4  │ Tidak menjalankan test suite/build yang memutasi│ **DIPATUHI**   │
│ 5  │ Tidak mengklaim fungsi tanpa bukti implementasi  │ **DIPATUHI**   │
│ 6  │ Tidak mengarang relasi FK tanpa bukti DDL nyata │ **DIPATUHI**   │
│ 7  │ Membedakan variabel TS dan kolom SQL riil       │ **DIPATUHI**   │
│ 8  │ Tidak melakukan refactoring otomatis kode       │ **DIPATUHI**   │
│ 9  │ Mempertahankan seluruh berkas dan data backup   │ **DIPATUHI**   │
│ 10 │ Menginventarisasi menyeluruh tanpa berhenti awal │ **DIPATUHI**   │
└────┴─────────────────────────────────────────────────┴────────────────┘
```

Metode inspeksi database dilakukan secara eksklusif menggunakan modul bawaan Node.js `node:sqlite` dengan flag **`readOnly: true`**, menjamin tidak ada perubahan timestamp berkas maupun pengubahan blok data SQLite selama proses audit berlangsung.

---

### 2. Rekapitulasi Cakupan yang Berhasil Diaudit

Audit berhasil menjangkau seluruh komponen arsitektur sistem Admin SUN89 dengan rincian kuantitatif sebagai berikut:

| Area / Komponen Arsitektur | Cakupan yang Diinspeksi | Status Verifikasi |
| :--- | :---: | :---: |
| **Total Tabel Database Aktual** | **20 Tabel (100% dari skema SQLite)** | Terverifikasi Fisik DDL & Row Count |
| **Total Baris Data Operasional** | **1.061 Baris Data Riil** | Terverifikasi Read-Only Query |
| **Active Express Route Endpoints** | **38 Endpoint (35 Rute + 3 Health Probes)** | Terverifikasi Statis & File Routes |
| **Scaffolding Interfaces Dorman** | **7 File / 50 Tanda Tangan Metode** | Terverifikasi Statis (`src/api/endpoints/`) |
| **Active Frontend API Providers** | **5 Provider (`src/data/api/`)** | Terverifikasi Statis & Pemanggilan Fetch |
| **Active Frontend State Stores** | **8 Store & Adapter (`src/app/data/`)** | Terverifikasi Statis & Observers |
| **Frontend Source Files Terinspeksi**| **202 File TypeScript / TSX** | Terverifikasi Eksplorasi Direktori |
| **Diagram Arsitektur yang Dihasilkan**| **3 Diagram Mermaid (.mmd)** | Terverifikasi Sintaks & Relasi Aktual |
| **Katalog Temuan Terdaftar** | **19 Temuan Terstruktur (P0 s.d P3)** | Terverifikasi Bukti Kode & Line Number |

---

### 3. Klasifikasi Status Bukti: Statis vs Runtime

Untuk menjaga kejujuran teknis, setiap temuan dan pemetaan dibedakan status pembuktiannya:

#### A. Terkonfirmasi Runtime (Runtime Evidence Verified)
- Struktur 20 tabel fisik dan data 1.061 baris pada `server/data/database.sqlite`.
- Port server backend aktif pada port 3001 (`task-52361`).
- Keberadaan file berkas pada folder penyimpanan `server/uploads/`.
- Nilai konfigurasi runtime pada `.env` (`VITE_APP_DATA_PROVIDER=api`, `PORT=3001`).

#### B. Terkonfirmasi Statis (Static Code Analysis Verified)
- Pemetaan alur data dari komponen form UI menuju state store, provider, Express route, controller, service, hingga repository SQL.
- Analisis ketiadaan transaksi atomik pada `rollbackOrder` dan `updateOrder` di `orderService.ts`.
- Analisis anti-pattern `data_json` dan aliasing properti ganda pada `src/domain/finance/types.ts`.
- Analisis ketiadaan pemanggilan runtime terhadap 7 file kontrak di `src/api/endpoints/`.
- Analisis ketiadaan DDL `FOREIGN KEY` pada 17 tabel database.

---

### 4. Keterbatasan Cakupan Audit (Audit Limitations & Exclusions)

Terdapat area-area tertentu yang secara sengaja **tidak diuji secara aktif atau berada di luar cakupan** demi menjaga keamanan dan stabilitas data:

1. **Gateway Pihak Ketiga (Third-Party Notification Gateways):**
   - Modul `notificationRoutes.ts` dan tabel `notification_settings` berisi konfigurasi gateway WhatsApp API vendor luar.
   - Audit **tidak melakukan uji coba pengiriman pesan nyata** ke nomor ponsel pengguna agar tidak memicu biaya pulsa/API credit atau mengirimkan pesan uji coba ke nomor klien produksi.
2. **Uji Beban & Konkurensi Skala Besar (Load & Stress Testing):**
   - Audit tidak menjalankan uji stres konkurensi (misal ribuan request per detik) untuk menjaga integritas file SQLite berkas tunggal yang sedang digunakan.
3. **Modul yang Belum Memiliki Histori Transaksi (0 Rows Tables):**
   - Tabel `pengeluaran`, `kas_messenger`, `messenger_reimbursements`, dan `idempotency_keys` saat ini memiliki **0 baris** di database produksi.
   - Struktur DDL, query repository, dan route controller untuk tabel-tabel tersebut telah diaudit secara statis, namun perilaku saat data bernilai ribuan baris belum dapat diobservasi pada runtime saat ini.
4. **Verifikasi Browser E2E:**
   - Tidak ada pengujian interaksi antarmuka pengguna berbasis browser headless (Playwright/Puppeteer) yang dijalankan pada sesi ini untuk mencegah mutasi data lokal atau pengisian order uji coba secara tidak disengaja.

---

### 5. Pernyataan Penutup

Audit arsitektur data ini memberikan gambaran yang transparan, jujur, dan berlandaskan bukti nyata atas kondisi perangkat lunak Admin SUN89 per tanggal 22 Oktober 2026. Seluruh dokumen hasil audit di folder `docs/audit_arsitektur_data/` siap digunakan oleh tim pengembang sebagai panduan tunggal dalam melaksanakan langkah-langkah perbaikan pada fase mendatang.
