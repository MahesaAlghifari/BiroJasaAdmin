# 01 — PETA ARSITEKTUR SISTEM
## PROYEK ADMIN SUN89 — BIRO JASA MANAGEMENT SYSTEM

**Tanggal:** 22 Oktober 2026  
**Status:** READ-ONLY Architectural Map  
**File Output:** `docs/audit_arsitektur_data/01_PETA_ARSITEKTUR.md`

---

### 1. Ikhtisar Arsitektur Monorepo

Aplikasi **Admin SUN89** dibangun menggunakan model arsitektur monorepo yang memadukan Single Page Application (SPA) frontend modern berbasis React dengan backend Express RESTful micro-service yang terhubung ke basis data berkas tunggal SQLite (`server/data/database.sqlite`).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ADMIN SUN89 MONOREPO                                   │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│             FRONTEND CLIENT              │               BACKEND SERVER                │
│            (Port 3000 / Vite)            │             (Port 3001 / Express)           │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • Framework: React 18.3, TypeScript 5.5  │ • Framework: Express 4.19, TypeScript 5.5   │
│ • Bundler: Vite 5.4                      │ • Basis Data: SQLite 3 via `node:sqlite`    │
│ • Styling: Tailwind CSS, Radix UI Icons  │ • Autentikasi: JWT (JsonWebToken)           │
│ • State: Custom Observer Stores & Adapters│ • Transaksi: Synchronous BEGIN/COMMIT       │
│ • Providers: In-Memory Sync + REST Fetch │ • File Storage: Local Directory (`uploads/`)│
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

### 2. Jalur Alur Data Kanonis (End-to-End Data Flow)

Jalur kanonis pertukaran data dari aksi pengguna hingga persistensi disk database digambarkan sebagai berikut:

```
[1. UI Component / Form]
        │  (Form input, tombol aksi, event submit)
        ▼
[2. State Store / Adapter (`src/app/data/`)]
        │  (Validasi lokal, mutasi optimistik, state observer)
        ▼
[3. Active API Provider (`src/data/api/`)]
        │  (Serialization, HTTP Request via fetch, Auth Header Bearer)
        ▼
[4. HTTP / REST API Network Boundary]
        │  (Port 3000 -> Port 3001, CORS, JSON payload)
        ▼
[5. Express Middleware Stack]
        │  (SecurityHeaders -> CORS -> RateLimiter -> RequestLogger -> Auth/Role -> Validation)
        ▼
[6. Route Handlers (`server/src/routes/`)]
        │  (URL Pattern Matching, HTTP Method Dispatch)
        ▼
[7. Controllers (`server/src/controllers/`)]
        │  (Parsing req.body, req.params, response framing, error catching)
        ▼
[8. Services / Business Logic (`server/src/services/`)]
        │  (Aturan tahapan order, kalkulasi laba/rugi, atomisitas transaksi, audit log)
        ▼
[9. Repositories (`server/src/repositories/`)]
        │  (SQL Query Construction, Prepared Statements, ORM-less mapping)
        ▼
[10. SQLite Database Engine (`server/src/database/db.ts`)]
        │  (`DatabaseSync` native Node.js 22, file `database.sqlite`)
        ▼
[11. Response Pipeline]
        │  (SQLite Result -> Repository Mapping -> Controller JSON -> HTTP 200/201 -> Provider -> Store Notify -> UI Re-render)
```

---

### 3. Pemetaan Komponen Lintas Lapisan (Layer Topology)

#### Lapisan A: Frontend UI (Components & Views)
Komponen frontend bertanggung jawab untuk presentasi data dan interaksi pengguna:
- **Root Shell:** `src/app/App.tsx`, `src/app/components/Sidebar.tsx`, `src/app/components/Header.tsx`.
- **Order & Operasional:** `src/app/components/BuatOrderSamsat.tsx`, `src/app/components/OrderTracking.tsx`, `src/app/components/OrderTable.tsx`, `src/app/components/OrderHistory.tsx`.
- **Keuangan & Invoice:** `src/app/components/FinanceContent.tsx`, `src/app/components/DataPenjualanTable.tsx`, `src/app/components/LabaRugiTab.tsx`, `src/app/components/InvoiceModal.tsx`.
- **Messenger & Logistik:** `src/app/components/MessengerWorkspace.tsx`, `src/app/components/MessengerTaskTable.tsx`, `src/app/components/ReimbursementModal.tsx`.
- **Master Data & Admin:** `src/app/components/MasterDataContent.tsx`, `src/app/components/HargaDasarSamsat.tsx`, `src/app/components/BiayaLayananTab.tsx`, `src/app/components/ManajemenPengguna.tsx`, `src/app/components/HakAksesTab.tsx`, `src/app/components/MetodePembayaranTab.tsx`.

#### Lapisan B: Frontend State Management (Stores & Adapters)
Terletak di `src/app/data/`, mengelola cache in-memory dan sinkronisasi reaktif:
1. `orderStore.ts`: Single source of truth untuk alur operasional order (Tahap 1–8).
2. `financeStore.ts`: Pengelolaan data tagihan, pembayaran parsial/lunas, kas kantor, dan pencatatan laba kotor.
3. `pricingStore.ts`: State master tarif Samsat dan biaya layanan biro jasa.
4. `messengerTaskAdapter.ts`: Adaptasi tugas penjemputan/pengantaran dokumen dan pengajuan reimbursement kurir.
5. `karyawanPenggunaAdapter.ts`: State pengguna, karyawan operasional, dan reset password.
6. `permissionStore.ts`: Matriks wewenang role (Administrator, Supervisor, Admin, Messenger, Finance).
7. `paymentMethodStore.ts`: Daftar rekening bank dan kanal pembayaran aktif.
8. `notificationSettingsStore.ts`: Konfigurasi pengiriman notifikasi WhatsApp/SMS dan log audit.
9. `estimationStore.ts`: Template dan kalkulasi simulasi biaya estimasi order.

#### Lapisan C: Frontend Data Providers (`src/data/api/`)
Layer abstraksi komunikasi jaringan yang mengimplementasikan interface repository:
- `ApiOrderProvider.ts`: Menangani sinkronisasi order aktif, arsip, pembatalan, dan approval dokumen.
- `ApiFinanceProvider.ts`: Menangani pembuatan invoice, pembayaran, pencairan cashback, dan verifikasi pelunasan.
- `ApiPricingProvider.ts`: Mengambil dan memutasi tarif Samsat per wilayah dan konfigurasi biaya layanan.
- `ApiUserProvider.ts`: Manajemen akun, autentikasi, status aktif/nonaktif pengguna.
- `ApiDocumentProvider.ts`: Upload fisik berkas, unduh file, dan pratinjau bukti bayar.

#### Lapisan D: Backend API Routes (`server/src/routes/`)
13 modul router Express yang dipasang di `server/src/app.ts`:
- `/api/auth` -> `authRoutes.ts` (Login, Token Verify, Me)
- `/api/orders` -> `orderRoutes.ts` (Order CRUD, Transition, Rollback, Cancel, Approval)
- `/api/pricing` -> `pricingRoutes.ts` (Samsat Pricing & Service Fee Config)
- `/api/finance` -> `financeRoutes.ts` (Invoice, Payment, Kas Kantor, Pengeluaran, Cashback, Laba Rugi)
- `/api/users` -> `userRoutes.ts` (User Account CRUD, Reset Password)
- `/api/audit-logs` -> `auditRoutes.ts` (System Audit Trail Logs)
- `/api/documents` -> `documentRoutes.ts` (Upload, Download, List, Delete Berkas)
- `/api/estimation` -> `estimationRoutes.ts` (Estimation Templates)
- `/api/wilayah` & `/api/samsat/offices` -> `wilayahRoutes.ts` (Wilayah Administratif & Samsat 514 Kab/Kota)
- `/api/notifications` -> `notificationRoutes.ts` (Notification Settings & Dispatch Logs)
- `/api/permissions` -> `permissionRoutes.ts` (Role-based Permissions Configuration)
- `/api/payment-methods` -> `paymentMethodRoutes.ts` (Payment Channels CRUD)
- `/api/messenger` -> `messengerRoutes.ts` (Messenger Tasks, Reimbursements, Kas Messenger)

#### Lapisan E: Business Logic & Services (`server/src/services/`)
- `orderService.ts`: Validasi aturan transisi tahapan order (Tahap 1 s.d 8), sinkronisasi otomatis status invoice, pembatalan order.
- `financeService.ts`: Kalkulasi matematis tagihan, alokasi kas masuk, pembayaran invoice parsial/penuh, payout cashback, rekapitulasi laba rugi.
- `messengerService.ts`: Penugasan kurir, pelacakan histori tugas, approval reimbursement dan pencairan dana kas kurir.
- `authService.ts`: Hashing password (bcrypt), verifikasi kredensial pengguna, penerbitan JSON Web Token (JWT).
- `auditService.ts`: Pencatatan log aktivitas sistem (`audit_logs`) secara terpusat.

#### Lapisan F: Database Access & Repositories (`server/src/repositories/`)
- `DbOrderRepository.ts`: Abstraksi SQL untuk tabel `orders`.
- `DbFinanceRepository.ts`: Abstraksi SQL untuk `finance_invoices`, `invoice_payments`, `kas_kantor`, `pengeluaran`.
- `DbPricingRepository.ts`: Abstraksi SQL untuk `samsat_pricing` dan `service_pricing_configs`.
- `DbUserRepository.ts`: Abstraksi SQL untuk tabel `users`.
- `DbMessengerRepository.ts`: Abstraksi SQL untuk `kas_messenger` dan `messenger_reimbursements`.
- `DbDocumentRepository.ts`: Abstraksi SQL untuk tabel `documents`.

---

### 4. Analisis Kode Dorman vs Kode Aktif (Dead Code Scaffolding)

Audit menemukan adanya dualitas pada struktur lapisan komunikasi frontend:

```
[FRONTEND COMMUNICATION CHANNELS]
       ├── [AKTIF DI RUNTIME]
       │     └── `src/app/data/*Store.ts` ──> `src/data/api/api*Provider.ts` ──> Backend HTTP
       │
       └── [DORMAN / DEAD CODE]
             └── `src/api/endpoints/*Api.ts` & `src/api/client/apiClient.ts`
                   └── Tidak diimpor oleh UI maupun Store manapun.
```

**Temuan Struktur Dorman:**
1. Folder `src/api/endpoints/` berisi 7 file interface (`customersApi.ts`, `financeApi.ts`, `messengersApi.ts`, `notificationsApi.ts`, `ordersApi.ts`, `usersApi.ts`, `vehiclesApi.ts`) dengan 50 deklarasi metode.
2. File-file ini diberi catatan komentar: `NOTE: Future contract interface only. Not called at runtime during Phase 1.`
3. Tidak ada satu pun komponen atau store yang mengimpor atau menggunakan `src/api/endpoints/`.
4. Seluruh komunikasi data nyata dilakukan melalui `src/data/api/` (`ApiOrderProvider`, `ApiFinanceProvider`, dll.).
5. **Rekomendasi Arsitektur:** Dokumentasikan bahwa `src/api/endpoints/` adalah scaffolding legacy/rancangan masa depan, dan jangan memelihara dua kontrak berbeda yang dapat menimbulkan ambiguitas refactor.

---

### 5. Pola Deviasi & Bypass Lapisan (Bypass Patterns)

Dalam arsitektur data aktual, ditemukan beberapa jalur khusus yang menyimpang dari rantai kanonis:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 BYPASS PATTERNS IDENTIFIED                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. DATA_JSON BYPASS (Read Deserialization)                                             │
│    `DbOrderRepository.getAllFlat()` dan `getByOrderNo()` tidak memetakan kolom SQL     │
│    individual (`customer`, `nopol`, `total_biaya`), melainkan membaca teks blob        │
│    `orders.data_json` lalu melakukan `JSON.parse()`.                                   │
│    -> Akibat: Update SQL langsung ke kolom tabel di-bypass oleh layer pembacaan.       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. DIRECT COMPONENT FETCH BYPASS                                                       │
│    Modul seperti `src/app/utils/auditLog.ts` dan `src/app/components/Settings.tsx`     │
│    melakukan pemanggilan `fetch()` langsung ke URL backend tanpa melalui Provider      │
│    atau Repository layer.                                                              │
│    -> Akibat: Error handling, token refresh, dan logging terfragmentasi di luar store. │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. OPTIMISTIC IN-MEMORY FALLBACK                                                       │
│    `ApiOrderProvider` dan `financeStore` menginisialisasi state menggunakan array      │
│    seed lokal jika `window.localStorage.getItem('auth_token')` belum tersedia saat      │
│    komponen pertama kali dimuat.                                                       │
│    -> Akibat: Risiko visual glitch jika server terlambat merespons token valid.        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
