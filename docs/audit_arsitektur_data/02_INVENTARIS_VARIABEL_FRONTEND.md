# 02 — INVENTARISASI VARIABEL FRONTEND
## PROYEK ADMIN SUN89 — BIRO JASA MANAGEMENT SYSTEM

**Tanggal:** 22 Oktober 2026  
**Status:** READ-ONLY Frontend Variables Inventory  
**File Output:** `docs/audit_arsitektur_data/02_INVENTARIS_VARIABEL_FRONTEND.md`

---

### 1. Metodologi Inventarisasi

Inventarisasi ini mencakup variabel state React (`useState`, `useReducer`), custom store observer (`src/app/data/`), kontrak interface domain (`src/domain/*/types.ts`), form schema, dan cache lokal. Seluruh variabel dikelompokkan berdasarkan **Domain Bisnis**, bukan hanya nama file komponen.

Setiap variabel dianalisis berdasarkan 8 parameter kunci:
1. **Nama Variabel / Field**
2. **Tipe TypeScript**
3. **Nullable (Ya/Tidak)**
4. **Nilai Default**
5. **Lokasi Deklarasi (File & Baris)**
6. **Sumber Nilai (Input Pengguna, REST API, Computed, dsb.)**
7. **Tujuan Bisnis**
8. **Status Persistensi (SQLite Kolom, SQLite `data_json`, In-Memory, dsb.)**

---

### 2. Domain 1: Order & Alur Operasional (Stages 1–8)

File Acuan: `src/domain/order/types.ts`, `src/app/data/orderStore.ts`, `src/app/components/BuatOrderSamsat.tsx`, `src/app/components/OrderTracking.tsx`.

| Nama Variabel / Field | Tipe TypeScript | Null? | Nilai Default | Lokasi Deklarasi | Sumber Nilai | Tujuan Bisnis | Status Persistensi |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `orderNo` | `string` | Tidak | `"ORD-..."` (Auto) | `types.ts:165` | Server Generator / UUID | Nomor identitas kanonis order | SQLite `orders.order_no` & `data_json` |
| `customer` | `string` | Tidak | `""` | `types.ts:167` | Form Buat Order | Nama klien / pemohon jasa | SQLite `orders.customer` & `data_json` |
| `nomorHP` | `string` | Tidak | `""` | `types.ts:168` | Form Buat Order | Kontak WhatsApp pemohon | SQLite `orders.nomor_hp` & `data_json` |
| `layanan` | `string` | Tidak | `"Mutasi Antar Samsat"` | `types.ts:169` | Dropdown Pilihan | Kategori layanan pengurusan | SQLite `orders.layanan` & `data_json` |
| `currentStep` | `number` (1–8) | Tidak | `1` | `types.ts:170` | State Machine Order | Indikator tahap operasional | SQLite `orders.current_step` & `data_json` |
| `currentStageName` | `string` | Tidak | `"Order Masuk"` | `types.ts:171` | Derived from `currentStep`| Label nama tahap untuk UI | SQLite `orders.current_stage_name` |
| `nopol` | `string` | Tidak | `""` | `types.ts:182` | Form Buat Order | Nomor Plat Polisi Kendaraan | SQLite `orders.nopol` & `data_json` |
| `namaPemilik` | `string` | Tidak | `""` | `types.ts:178` | Form Pemilik Kendaraan | Nama pemilik di BPKB/STNK | SQLite `data_json` |
| `jenisKendaraan` | `string` | Tidak | `"Roda 4"` | `types.ts:180` | Radio Button R2/R4 | Klasifikasi kendaraan fiskal | SQLite `data_json` |
| `tahunKendaraan` | `number \| string`| Tidak | `2020` | `types.ts:181` | Form Kendaraan | Tahun perakitan kendaraan | SQLite `data_json` |
| `wilayahSamsatAsal`| `string` | Tidak | `""` | `types.ts:189` | Dropdown 514 Kab/Kota | Kantor Samsat asal berkas | SQLite `orders.wilayah_samsat_asal` & `data_json` |
| `wilayahSamsatTujuan`|`string` | Ya | `undefined` | `types.ts:190` | Dropdown 514 Kab/Kota | Kantor Samsat tujuan mutasi | SQLite `orders.wilayah_samsat_tujuan` & `data_json` |
| `alamatPenjemputan`| `StructuredAddress` | Tidak | `{ kota: "", ... }` | `types.ts:193` | Form Alamat 7 Field | Alamat kurir jemput berkas | SQLite `data_json` |
| `alamatPengantaran`| `StructuredAddress` | Tidak | `{ kota: "", ... }` | `types.ts:194` | Form Alamat 7 Field | Alamat kurir antar berkas | SQLite `data_json` |
| `clientDocuments` | `Record<string, OrderDocument>` | Tidak | `{}` | `types.ts:197` | Upload Component | Status fisik berkas klien | SQLite `data_json` + tabel `documents` |
| `biayaJasa` | `number` | Tidak | `0` | `types.ts:204` | Kalkulasi Estimasi | Biaya jasa dasar biro | SQLite `orders.biaya_jasa` & `data_json` |
| `biayaAntarJemput`| `number` | Ya | `0` | `types.ts:205` | Form Estimasi | Ongkir logistik kurir | SQLite `orders.biaya_antar_jemput` & `data_json` |
| `totalEstimasi` | `number` | Tidak | `0` | `types.ts:209` | Formula Estimasi | Estimasi total awal order | SQLite `orders.total_biaya` & `data_json` |
| `finalBiayaJasa` | `number` | Ya | `undefined` | `types.ts:217` | Input Tahap 5 | Biaya jasa riil disetujui | SQLite `data_json` |
| `finalPkb` | `number` | Ya | `undefined` | `types.ts:218` | Input Tagihan Samsat | Nominal PKB riil SKKP | SQLite `data_json` |
| `finalSwdkllj` | `number` | Ya | `undefined` | `types.ts:219` | Input Tagihan Samsat | Nominal SWDKLLJ riil SKKP | SQLite `data_json` |
| `assignedMessengerId`| `string` | Ya | `undefined` | `types.ts:233` | Dropdown Kurir Tahap 2| ID Kurir penjemputan | SQLite `data_json` |
| `samsatProcesses` | `SamsatProcessItem[]` | Tidak | `[]` | `types.ts:241` | Checklist Tahap 4 | Sub-proses loket Samsat | SQLite `data_json` |
| `documentApproval`| `DocumentApprovalMetadata` | Ya | `undefined` | `types.ts:201` | Modal Approval SVP | Jejak persetujuan berkas | SQLite `data_json` |

---

### 3. Domain 2: Keuangan, Invoice & Laba Rugi

File Acuan: `src/domain/finance/types.ts`, `src/app/data/financeStore.ts`, `src/app/components/FinanceContent.tsx`, `src/app/components/DataPenjualanTable.tsx`.

| Nama Variabel / Field | Tipe TypeScript | Null? | Nilai Default | Lokasi Deklarasi | Sumber Nilai | Tujuan Bisnis | Status Persistensi |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `invoice` / `invoiceNo`| `string` | Tidak | `"INV-..."` | `types.ts:46-47` | Server Generator | Nomor resmi tagihan keuangan | SQLite `finance_invoices.invoice_no` |
| `totalTagihan` | `number` | Tidak | `0` | `types.ts:37` | Kalkulasi Order | Total piutang yang ditagihkan | SQLite `finance_invoices.total_tagihan` |
| `terbayar` / `dibayar` | `number` | Tidak | `0` | `types.ts:38-39` | Akumulasi Kas Masuk | Total dana diterima klien | SQLite `finance_invoices.terbayar` |
| `sisa` | `number` | Tidak | `0` | `types.ts:40` | `totalTagihan - terbayar` | Sisa piutang tertunggak | SQLite `finance_invoices.sisa` |
| `status` | `PaymentStatus` | Tidak | `"Belum Bayar"` | `types.ts:41` | State Machine Kas | Status pelunasan tagihan | SQLite `finance_invoices.status` |
| `biayaSamsat` | `number` | Tidak | `0` | `types.ts:62` | Realisasi Pengeluaran | Pokok biaya riil loket | SQLite `finance_invoices.biaya_samsat` |
| `profit` | `number` | Tidak | `0` | `types.ts:63` | Formula Laba Bersih | Keuntungan kotor biro jasa | SQLite `finance_invoices.profit_final` |
| `profitStatus` | `RealizationStatus` | Tidak | `"PENDING"` | `types.ts:64` | Kondisi Pelunasan | Kesiapan realisasi laba | SQLite `finance_invoices.profit_status` |
| `cashback` | `number` | Tidak | `0` | `types.ts:65` | Input Diskon/Komisi | Nilai cashback ke pemohon | SQLite `finance_invoices.cashback_nominal` |
| `cashbackStatus` | `RealizationStatus` | Tidak | `"PENDING"` | `types.ts:67` | Tombol Cairkan | Status pencairan komisi | SQLite `finance_invoices.cashback_status` |
| `isCashRealized` | `boolean` | Tidak | `false` | `types.ts:70` | Flag Kas Masuk | Mencegah dobel catat kas | SQLite `data_json` |
| `cashRecordedAmount` | `number` | Tidak | `0` | `types.ts:71` | Tracker Kas | Akumulasi debit kas kantor | SQLite `data_json` |
| `settlementCondition`| `SettlementCondition`| Ya | `undefined` | `types.ts:81` | Audit Pelunasan Akhir | Status seimbang/kurang/lebih | SQLite `data_json` |

---

### 4. Domain 3: Messenger & Operasional Lapangan

File Acuan: `src/domain/messenger/types.ts`, `src/app/data/messengerTaskAdapter.ts`, `src/app/components/MessengerWorkspace.tsx`.

| Nama Variabel / Field | Tipe TypeScript | Null? | Nilai Default | Lokasi Deklarasi | Sumber Nilai | Tujuan Bisnis | Status Persistensi |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `taskId` | `string` | Tidak | `"TSK-..."` | `types.ts:60` | Server Generator | ID unik penugasan lapangan | SQLite `data_json` via Order |
| `taskType` | `MessengerTaskType` | Tidak | `"Jemput Dokumen"` | `types.ts:8` | Tahapan Order | Jenis tugas kurir | SQLite `data_json` via Order |
| `statusCode` | `MessengerTaskStatusCode`| Tidak | `"NOT_STARTED"` | `types.ts:11` | Mobile/Web Kurir | Status eksekusi tugas | SQLite `data_json` via Order |
| `priority` | `TaskPriority` | Tidak | `"NORMAL"` | `types.ts:22` | Form Assign Kurir | Tingkat urgensi pekerjaan | SQLite `data_json` via Order |
| `reimbursementNominal`| `number` | Ya | `0` | Modal Reimburse | Input Kurir | Klaim bensin/parkir | SQLite `messenger_reimbursements.nominal` |
| `reimbursementStatus` | `"PENDING" \| "APPROVED" \| "REJECTED"` | Ya | `"PENDING"` | Modal Approval Kasir | Keputusan Finance | SQLite `messenger_reimbursements.status` |

---

### 5. Domain 4: Master Tarif Samsat & Biaya Layanan

File Acuan: `src/domain/pricing/types.ts`, `src/app/data/pricingStore.ts`, `src/app/components/HargaDasarSamsat.tsx`.

| Nama Variabel / Field | Tipe TypeScript | Null? | Nilai Default | Lokasi Deklarasi | Sumber Nilai | Tujuan Bisnis | Status Persistensi |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `samsatId` | `string` | Tidak | `""` | `types.ts:7` | Slug Wilayah | Identifier kanonis Samsat | SQLite `samsat_pricing.samsat_id` |
| `category` | `string` | Tidak | `"Mutasi Keluar"` | `types.ts:36` | Master Kategori | Pengelompokan tarif | SQLite `samsat_pricing.category` |
| `basePrice` | `number` | Tidak | `0` | `types.ts:42` | Form Master Harga | Tarif dasar resmi Samsat | SQLite `samsat_pricing.base_price` |
| `servicePricingId` | `string` | Tidak | `""` | `types.ts:58` | Master Layanan | ID konfigurasi biaya jasa | SQLite `service_pricing_configs.service_id` |
| `serviceFee` | `number` | Tidak | `0` | Form Biaya Layanan | Nilai margin jasa kantor | SQLite `service_pricing_configs.selling_price` |

---

### 6. Domain 5: Manajemen Pengguna, Karyawan & Hak Akses

File Acuan: `src/domain/user/types.ts`, `src/app/data/karyawanPenggunaAdapter.ts`, `src/app/data/permissionStore.ts`.

| Nama Variabel / Field | Tipe TypeScript | Null? | Nilai Default | Lokasi Deklarasi | Sumber Nilai | Tujuan Bisnis | Status Persistensi |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| `userId` / `id` | `string` | Tidak | `""` | `types.ts:10` | Auto Incremental/UUID | ID kanonis user sistem | SQLite `users.id` |
| `username` | `string` | Tidak | `""` | `types.ts:11` | Input Akun | Identitas login pengguna | SQLite `users.username` |
| `role` | `string` | Tidak | `"admin"` | `types.ts:14` | Role Dropdown | Wewenang hak akses RBAC | SQLite `users.role` |
| `status` | `"active" \| "inactive"` | Tidak | `"active"` | `types.ts:15` | Toggle Status | Status aktivasi akun | SQLite `users.status` |
| `passwordHash` | `string` | Tidak | `""` | Backend Security | Bcrypt Salted Hash | Kredensial rahasia | SQLite `users.password_hash` (Tidak ke frontend) |

---

### 7. Temuan Variabel Tidak Digunakan, Naming Collision & Mismatch Casing

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        ANALISIS KELEMAHAN INVENTARISASI VARIABEL                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. NAMING COLLISION & ALIASING:                                                        │
│    • `invoice` vs `invoiceNo`: Digunakan bergantian pada `InvoiceBillingRecord`.       │
│    • `terbayar` vs `dibayar`: Menyebabkan kebingungan saat mapping ke database column. │
│    • `layanan` vs `jenisLayanan`: Berisiko undefined jika salah satu form luput.       │
│    • `customer` vs `namaPemilik`: Keduanya ada di Order, kadang diisi nama yang sama   │
│      tetapi memiliki arti hukum berbeda (Pemohon Jasa vs Pemilik sah di BPKB).         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. MISMATCH CASING LINTAS LAPISAN:                                                     │
│    • Frontend: `nomorHP` (camelCase) ──> Backend SQL: `nomor_hp` (snake_case).         │
│    • Frontend: `orderNo` (camelCase) ──> Backend SQL: `order_no` (snake_case).         │
│    • Frontend: `totalBiaya` (camelCase) ──> Backend SQL: `total_biaya` (snake_case).   │
│    -> Mapping ini dikerjakan manual di `DbOrderRepository`, rentan jika ada properti   │
│       baru yang tidak didaftarkan di translator mapper.                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. VARIABEL STATE MENGAMBANG (IN-MEMORY ONLY):                                         │
│    • `isCashRealized` dan `cashRecordedAmount` hanya hidup di dalam blob `data_json`.  │
│      Tidak ada kolom indeks di SQLite untuk mengecek order mana yang sudah setor kas.  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
