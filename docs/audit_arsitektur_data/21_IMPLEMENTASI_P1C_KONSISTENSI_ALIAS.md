# 21 — LAPORAN IMPLEMENTASI P1-C: KONSISTENSI REFERENSI DAN ALIAS DATA

**Proyek:** Admin SUN89 — Biro Jasa Management System  
**Root Proyek:** `D:\Admin\adminsunbirojasa`  
**Basis Data:** `server/data/database.sqlite` (Read-only, skema dan data tidak diubah)  
**Tanggal Implementasi:** 22 Oktober 2026  
**Status Implementasi:** Selesai (Static Inspection & Code Integration)  
**Dokumen Acuan:**
- `docs/audit_arsitektur_data/02_INVENTARIS_VARIABEL_FRONTEND.md`
- `docs/audit_arsitektur_data/03_DATA_DICTIONARY_DATABASE.md`
- `docs/audit_arsitektur_data/04_DATA_LINEAGE_FRONTEND_BACKEND_DB.md`
- `docs/audit_arsitektur_data/05_KATALOG_API.md`
- `docs/audit_arsitektur_data/11_REGISTER_TEMUAN_DAN_PRIORITAS.md` (`FND-P1-02`)
- `docs/audit_arsitektur_data/19_IMPLEMENTASI_P1A_INTEGRITAS_RELASI.md`
- `docs/audit_arsitektur_data/20_IMPLEMENTASI_P1B_OTORISASI_BACKEND.md`

---

## 1. Temuan Alias dan Referensi yang Terbukti Bermasalah

Berdasarkan audit komprehensif terhadap kode aktual, ditemukan ketidakkonsistenan penamaan properti, aliasing ganda, dan celah keamanan bypass otorisasi:

1. **Celah Keamanan Bypass Otorisasi P1-B via Varian `snake_case`:**
   - Pada implementasi P1-B, proteksi `PROTECTED_FIELD_VIOLATION` di `server/src/middleware/validation.ts` dan `server/src/services/orderService.ts` hanya memeriksa properti berformat `camelCase` (misalnya `approvedBySpv`, `stage6Approved`, `currentStep`, `totalBiaya`, `finalCost`).
   - Namun, pada `server/src/repositories/dbOrderRepository.ts`, mapper SQL masih membaca varian `snake_case` seperti `(updates as any).payment_status`, `(updates as any).total_biaya`, `(updates as any).nomor_hp`.
   - **Vulnerabilitas Riil:** Penyerang yang mengirim payload `PUT /api/orders/:orderNo` dengan `{ "payment_status": "Lunas", "total_biaya": 0 }` atau `{ "approved_by_spv": true }` berhasil melewati filter P1-B karena key `snake_case` tidak ada di `protectedRootFields`, dan langsung mengubah kolom fisik database SQLite!
   - **Solusi P1-C:** Dibuat kamus proteksi komprehensif (`assertNoProtectedFieldViolations`) yang memeriksa seluruh varian `camelCase`, `snake_case`, dan alias singkat, menjamin penolakan mutlak HTTP 403 `PROTECTED_FIELD_VIOLATION`.

2. **Inkonsistensi Properti Ganda Finansial & Piutang (`FND-P1-02`):**
   - Kontrak TypeScript frontend `InvoiceBillingRecord` mendefinisikan alias ganda: `invoice` vs `invoiceNo`, `dibayar` vs `terbayar`.
   - Di endpoint pembayaran `payInvoice`, controller mengambil `const amount = req.body.amount !== undefined ? req.body.amount : req.body.nominal;`. Jika pemanggil mengirim keduanya dengan nominal berbeda (misal `amount: 500000` dan `nominal: 1000000`), backend secara diam-diam memprioritaskan salah satu tanpa validasi konflik.
   - **Solusi P1-C:** Diterapkan deteksi konflik ketat pada field finansial/sensitif: jika dua alias dikirim bersamaan dengan nilai bertentangan, server menolak dengan HTTP 400 `CONFLICTING_ALIASES`.

3. **Inkonsistensi Naming Order (`nomorHP` vs `nomor_hp` vs `phone` vs `noHp`):**
   - Form input UI menggunakan `nomorHP`, kolom SQL fisik bernama `nomor_hp`, sedangkan modul kontak pelanggan terkadang mengirim `phone` atau `noHp`.
   - Di `validateOrderCreatePayload`, server sebelumnya hanya memeriksa `req.body.nomorHP`. Jika frontend mengirim `phone` atau `nomor_hp`, request ditolak dengan error palsu "Nomor HP wajib diisi".
   - **Solusi P1-C:** Normalisasi dilakukan sebelum validasi mandatory fields: alias dinormalisasi ke `nomorHP`, lalu divalidasi.

4. **Inkonsistensi Parameter Reimbursement & Messenger:**
   - Parameter pencarian dan mutasi reimbursement menggunakan campuran `employeeId` / `employee_id`, `messengerName` / `messenger`, `orderNo` / `order_no`, serta `amount` / `nominal`.
   - Konflik antar-alias kini dicegah, dan parameter query dinormalisasi secara deterministik.

5. **Penanganan Falsy Values (`0`, `false`, `""`, `null`):**
   - Pada mapper lama, terdapat penggunaan operator `||` yang salah pada nominal angka, misalnya `Number(invoice.biayaSamsat || (existing as any)?.biayaSamsat || 0)`.
   - Jika nominal diubah menjadi `0` (misalnya penghapusan denda atau subsidi biaya), evaluasi `0 || existing` mengembalikan nilai lama yang bukan 0, sehingga nilai 0 tertimpa kembali secara diam-diam.
   - **Solusi P1-C:** Seluruh fallback angka diperbaiki menggunakan operator *nullish coalescing* (`??`), memastikan nilai `0`, `false`, dan string kosong dipertahankan secara utuh.

---

## 2. Matriks Alias Sumber ──> Alias Kanonis ──> Layer Normalisasi

| Domain | Properti Sumber (Alias Input) | Properti Kanonis (Target) | Layer Normalisasi | Aturan Konflik (Jika Dua Alias Dikirim) | Sifat Properti |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Order** | `customerName`, `customer_name` | `customer` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Wajib saat create, Sensitif |
| **Order** | `nomor_hp`, `phone`, `noHp` | `nomorHP` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Wajib saat create, Sensitif |
| **Order** | `serviceType`, `service_type`, `tipe_layanan` | `layanan` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Wajib saat create, Sensitif |
| **Order** | `platNomor`, `plat_nomor` | `nopol` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Wajib saat create, Sensitif |
| **Order** | `order_no` | `orderNo` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Immutable / Protected |
| **Order** | `biaya_jasa` | `biayaJasa` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif, Angka |
| **Order** | `biaya_antar_jemput` | `biayaAntarJemput` | API Boundary / Validation | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif, Angka |
| **Order** | `nama_pemilik` | `namaPemilik` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `jenis_kendaraan`, `tipeKendaraan`, `tipe_kendaraan` | `jenisKendaraan` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `statusKepemilikan` | `kepemilikanKendaraan` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `catatan_order`, `catatan` | `catatanOrder` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `alasan_pending`, `alasan` | `alasanPending` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `namaPemilikRekeningKeluar`, `nama_penerima_keluar` | `namaPenerimaKeluar` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `bank_uang_keluar` | `bankUangKeluar` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Order** | `metode_pembayaran_keluar` | `metodePembayaranKeluar` | API Boundary / Normalizer | Kanonis menang (Non-sensitif) | Opsional |
| **Invoice** | `invoice`, `no_invoice`, `noInvoice`, `invoice_no` | `invoiceNo` | Repository & Controller | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Primary Key Bisnis |
| **Invoice** | `order_no` | `orderNo` | Repository & Controller | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Foreign Key Relasional |
| **Invoice** | `total_tagihan`, `totalBiaya`, `total_biaya` | `totalTagihan` | Repository & Mapper | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif Finansial |
| **Invoice** | `terbayar` (UI) / `dibayar` (DB) | `dibayar` & `terbayar` | Repository Mapper | Disinkronkan identik di respons API | Sensitif Finansial |
| **Pembayaran**| `nominal`, `jumlah` | `amount` | API Validation / Controller | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Wajib, Sensitif Angka |
| **Pembayaran**| `metode_pembayaran`, `paymentMethod` | `metodePembayaran` | API Validation / Service | Kanonis menang (Non-sensitif) | Opsional |
| **Pembayaran**| `noRekening`, `nomor_rekening` | `nomorRekening` | Service Boundary | Kanonis menang (Non-sensitif) | Opsional |
| **Pembayaran**| `bank` | `namaBank` | Service Boundary | Kanonis menang (Non-sensitif) | Opsional |
| **Pembayaran**| `document_id` | `documentId` | Service Boundary | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Foreign Key Dokumen |
| **Dokumen** | `order_no` | `orderNo` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Foreign Key Relasional |
| **Dokumen** | `invoice_id` | `invoiceId` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Foreign Key Relasional |
| **Dokumen** | `type`, `tipe_dokumen` | `documentType` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Klasifikasi Dokumen |
| **Reimbursement**| `employee_id`, `id_pegawai` | `employeeId` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Foreign Key Pegawai |
| **Reimbursement**| `messenger_name`, `messenger`, `nama` | `messengerName` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Identitas Pegawai |
| **Reimbursement**| `nominal` | `amount` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif Angka |
| **Reimbursement**| `tanggal` | `date` | Controller / Service | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Tanggal Pengajuan |
| **Reimbursement**| `kategori` | `category` | Controller / Service | Kanonis menang (Non-sensitif) | Klasifikasi |
| **Reimbursement**| `receipt_url` | `receiptUrl` | Controller / Service | Kanonis menang (Non-sensitif) | Bukti Pengeluaran |
| **Tarif Samsat**| `biayaDasar`, `biaya_dasar` | `basePrice` | Validation / Repository | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif Tarif |
| **Tarif Samsat**| `namaItem`, `nama_item` | `name` | Validation / Repository | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Identitas Tarif |
| **Biaya Layanan**| `layanan`, `service_name` | `serviceName` | Validation / Repository | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Mandatory Master |
| **Biaya Layanan**| `namaSamsat` | `wilayah` | Validation / Repository | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Mandatory Master |
| **Biaya Layanan**| `biaya_jasa`, `biayaJasaLengkap` | `biayaJasa` | Validation / Repository | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif Tarif |
| **Biaya Layanan**| `biaya_antar_jemput` | `biayaAntarJemput` | Validation / Repository | Tolak HTTP 400 `CONFLICTING_ALIASES` jika beda | Sensitif Tarif |

---

## 3. Berkas yang Diubah dan Ringkasan Perubahan

1. **`server/src/utils/aliasNormalizer.ts` (BERKAS BARU):**
   - Modul independen untuk normalisasi alias, pendeteksian konflik nilai, evaluasi kesetaraan tipe, dan pemetaan seluruh varian field yang dilindungi sistem.
   - Menyediakan fungsi normalisasi domain:
     - `assertNoProtectedFieldViolations(body)`
     - `normalizeOrderPayload(body)`
     - `normalizeInvoicePaymentPayload(body)`
     - `normalizeDocumentUploadPayload(body)`
     - `normalizeReimbursementPayload(body)`
     - `normalizeServicePricingPayload(body)`
     - `normalizeSamsatPricingPayload(body)`

2. **`server/src/middleware/validation.ts`:**
   - Menghubungkan `assertNoProtectedFieldViolations` pada `validateOrderUpdatePayload` sehingga semua varian `snake_case` dari 30 root fields dan 15 payment fields dilindungi secara absolut dengan HTTP 403 `PROTECTED_FIELD_VIOLATION`.
   - Mengintegrasikan pemeriksaan kecocokan URL parameter `orderNo` dengan body `orderNo`/`order_no`.
   - Memanggil `normalizeOrderPayload` pada `validateOrderCreatePayload` sebelum validasi mandatory fields.
   - Memanggil `normalizeInvoicePaymentPayload` pada `validateInvoicePaymentPayload` dan memvalidasi angka positif.
   - Memanggil `normalizeServicePricingPayload` pada `validateServicePricingPayload`.
   - Memanggil `normalizeSamsatPricingPayload` pada `validatePricingUpdatePayload`.

3. **`server/src/services/orderService.ts`:**
   - Menghubungkan `assertNoProtectedFieldViolations(updates)` dan `normalizeOrderPayload(updates)` pada `updateOrder` untuk pertahanan berlapis (*defense-in-depth*).
   - Menghubungkan `normalizeOrderPayload(data)` pada `createOrderWithIdempotency`.
   - Menjaga logika pencabutan supervisi jika data dasar order berubah.

4. **`server/src/controllers/financeController.ts`:**
   - Menambahkan validasi integritas integer positif pada `req.params.id`.
   - Menghubungkan `normalizeInvoicePaymentPayload(req.body)` dan `normalizeInvoicePaymentPayload(rawDetails)`.
   - Mencegah konflik nilai antara `amount` dan `nominal`.

5. **`server/src/repositories/dbFinanceRepository.ts`:**
   - Memperbaiki penanganan *falsy values* pada `saveInvoice` dan `updateInvoice`: mengubah operator `||` menjadi `??` pada `biayaSamsat`, `totalTagihan`, `overpayment`, `cashback`, `profit`, `biayaJasa`, dan `biayaAntarJemput`.
   - Memperkaya mapper `mapRowToInvoice` agar mengembalikan properti kanonis dan properti alias (`invoice` & `invoiceNo`, `dibayar` & `terbayar`, `totalTagihan` & `total_tagihan`, `biayaSamsat` & `biaya_samsat`, `pendapatanJasa` & `pendapatan_jasa`), menjamin kompatibilitas 100% dengan kode frontend.

6. **`server/src/controllers/documentController.ts`:**
   - Menghubungkan `normalizeDocumentUploadPayload(req.body)` pada `uploadDocument` dan `linkDocumentToOrder`.
   - Mencegah konflik antara `orderNo` vs `order_no`, `invoiceId` vs `invoice_id`, serta `documentType` vs `tipe_dokumen`.

7. **`server/src/controllers/messengerController.ts`:**
   - Menghubungkan `normalizeReimbursementPayload(req.body)` pada `createReimbursement`.
   - Menormalisasi alias query params pada `getMessengerHistory` (`messenger` / `messengerName`, `employeeId` / `employee_id`) dan `getReimbursements` (`employeeId` / `employee_id`, `orderNo` / `order_no`).

8. **`server/src/services/messengerService.ts`:**
   - Menghubungkan `normalizeReimbursementPayload(data)` pada `createReimbursement` service method.

9. **`server/src/services/pricingService.ts`:**
   - Menghubungkan `normalizeSamsatPricingPayload(updates)` pada `updateSamsatItem`.
   - Menghubungkan `normalizeServicePricingPayload(payload)` pada `createServicePricing`.

---

## 4. Aturan Penanganan Konflik Antar-Alias

Jika payload permintaan berisi dua properti atau lebih yang merujuk pada satu konsep bisnis (misal `orderNo` dan `order_no`, atau `amount` dan `nominal`):

1. **Pemeriksaan Kesetaraan Nilai:**
   - Nilai dibandingkan berdasarkan tipe:
     - String: perbandingan setelah `.trim()`, atau perbandingan case-insensitive untuk nomor identifikasi/kode referensi.
     - Number: perbandingan numerik `Number(a) === Number(b)`.
     - Boolean: perbandingan nilai boolean `Boolean(a) === Boolean(b)`.
   - Jika nilai-nilai yang dikirimkan **setara**: nilai kanonis ditetapkan, dan alias pendamping dibersihkan dari payload agar tidak mengotori persistensi `data_json`.

2. **Jika Nilai Bertentangan:**
   - **Untuk Field Sensitif atau Menjadi Referensi Relasi** (`orderNo`, `invoiceNo`, `invoiceId`, `amount`, `nominal`, `dibayar`, `terbayar`, `customer`, `nopol`, `employeeId`, dsb.):
     - Permintaan **langsung ditolak** dengan HTTP 400 Bad Request:
       ```json
       {
         "success": false,
         "error": {
           "code": "CONFLICTING_ALIASES",
           "message": "Payload berisi alias bertentangan untuk 'amount': properti 'amount' ('500000') berbeda dengan 'nominal' ('1000000'). Harap gunakan satu nilai kanonis yang konsisten."
         },
         "timestamp": "2026-10-22T15:00:00.000Z"
       }
       ```
     - Sistem **tidak pernah** menebak atau memilih secara diam-diam nilai yang menguntungkan salah satu pihak.
   - **Untuk Field Non-Sensitif** (`catatanOrder` vs `catatan`, `alasanPending` vs `alasan`, `namaPemilik` vs `nama_pemilik`):
     - Nilai kanonis diprioritaskan secara deterministik jika tersedia; jika tidak tersedia, alias pertama digunakan. Alias sekunder dihapus dari payload.

---

## 5. Penanganan Tipe Data, Nilai Kosong, `0`, `false`, dan `null`

1. **Preservasi Nilai Angka Nol (`0`):**
   - Menghapus pola berbahaya `val || default` yang mengubah `0` menjadi default.
   - Menggunakan pemeriksaan eksplisit `val !== undefined && val !== null && val !== ""` atau operator *nullish coalescing* (`??`).
   - Contoh: Diskon 0 rupiah, biaya denda 0, atau saldo sisa 0 tetap bernilai `0` dan tidak kembali ke nilai konfigurasi default.

2. **Preservasi Nilai Boolean `false`:**
   - Field seperti `isArchived`, `pickupCompleted`, `isPaymentVerified`, `stage6Approved` diperlakukan secara strictly boolean. Nilai `false` tidak dianggap absen.

3. **Preservasi String Kosong (`""`) dan `null`:**
   - Field catatan opsional (`notes`, `catatan`, `alasanPending`) jika dikirimkan `""` atau `null` dipertahankan maknanya sebagai pengosongan catatan, bukan diabaikan.

4. **Nilai Tanggal Deterministik:**
   - Tanggal pembuatan transaksi (`createdAt`, `submittedAt`) tidak digenerate ulang saat operasi update jika data asli sudah ada di database.

---

## 6. Dampak terhadap Kontrak API dan Kompatibilitas Frontend

1. **Tidak Ada Breaking Changes pada Frontend yang Patuh:**
   - Seluruh payload resmi yang dikirimkan oleh frontend saat ini tetap diterima secara penuh.
   - Respons API dari `orders`, `finance_invoices`, `kas_kantor`, `pricing`, dan `reimbursements` tetap menyertakan properti kanonis sekaligus properti historis yang diharapkan oleh komponen frontend:
     - `invoice` dan `invoiceNo` tetap ada di respons invoice.
     - `dibayar` dan `terbayar` tetap ada di respons invoice.
     - `totalTagihan` dan `total_tagihan` tetap ada di respons invoice.
     - `totalBiaya` dan `total_biaya` tetap ada di respons order.
     - `biayaJasa` dan `biaya_jasa` tetap ada di respons order.
     - `biayaAntarJemput` dan `biaya_antar_jemput` tetap ada di respons order.
     - `paymentStatus` dan `payment_status` tetap ada di respons order.

2. **Penolakan Permintaan yang Cacat / Memanipulasi:**
   - Klien nakal yang mengirimkan nilai ambigu pada field finansial/identitas kini menerima HTTP 400 `CONFLICTING_ALIASES`.
   - Klien nakal yang mencoba mem-bypass otorisasi supervisor via field `snake_case` kini menerima HTTP 403 `PROTECTED_FIELD_VIOLATION`.

---

## 7. Hubungan Perubahan dengan Perlindungan P1-A dan P1-B

1. **Menutup Celah Bypass Otorisasi P1-B:**
   - Perlindungan P1-B terhadap 30 root fields dan 15 payment fields kini kebal terhadap serangan variasi penamaan (misal `approved_by_spv`, `stage_6_approved`, `current_step`, `total_biaya`, `biaya_samsat`, `uang_keluar`, `status_pembayaran`, `is_verified`).
   - Celah penulisan langsung kolom fisik SQLite melalui `dbOrderRepository.ts` ditutup sepenuhnya.

2. **Memperkuat Validasi Integritas Relasi P1-A:**
   - Normalisasi alias `orderNo` dan `invoiceId` memastikan pengecekan referensial P1-A (seperti `getByOrderNo` dan `getInvoiceById`) selalu menerima format identitas kanonis tanpa risiko salah tafsir format ID vs nomor dokumen.

3. **Mempertahankan Transaksi Atomik P0/P1-A/P1-B:**
   - Tidak ada transaksi yang diputus atau dikurangi lingkupnya. Mutasi order, invoice, reimbursement, dan kas tetap berjalan dalam blok transaksi atomik SQLite.

---

## 8. Risiko dan Keputusan yang Belum Terselesaikan

1. **Duplikasi Kolom Fisik vs JSON:**
   - Pola single source of truth yang telah diperbaiki pada P0 Fase 3 & Fase 4 tetap bekerja: kolom SQL fisik adalah kanonis, sedangkan atribut tambahan dinamis tetap hidup di `data_json`.
2. **Ketiadaan DDL Foreign Key Fisik SQLite:**
   - Sesuai batasan P1-A dan P1-C, skema fisik SQLite tidak diubah (tidak ada DDL migrasi). Integritas relasional ditegakkan pada lapisan service dan validasi backend.
3. **Standarisasi Menyeluruh TypeScript Domain:**
   - Di masa depan (fase refaktor lanjutan P3), properti alias pada deklarasi `src/domain/*/types.ts` dapat didepresiasi secara bertahap setelah seluruh komponen UI dimigrasikan ke nama kanonis tunggal.

---

## 9. Pernyataan Batasan dan Kepatuhan

Dengan ini ditegaskan bahwa:
- **TIDAK ADA test suite, unit test, build runner, atau final check yang dijalankan** (`npm test`, `jest`, `npm run build`, dll.).
- **TIDAK ADA migrasi skema, alter table, atau perubahan DDL** pada basis data SQLite `server/data/database.sqlite`.
- **TIDAK ADA mutasi, seed, reset, purge, atau perubahan data operasional/tarif** yang dilakukan pada basis data.
- Server backend dev (`npm run dev:server` pada port 3001) mengompilasi seluruh kode baru secara bersih (*clean compilation*) tanpa galat TypeScript.
- Pekerjaan dihentikan secara tegas setelah fase P1-C selesai tanpa melangkah ke fase berikutnya.
