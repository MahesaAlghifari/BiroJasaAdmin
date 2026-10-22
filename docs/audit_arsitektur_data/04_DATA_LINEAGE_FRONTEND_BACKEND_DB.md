# 04 — DATA LINEAGE: FRONTEND ──> BACKEND ──> DATABASE
## MATRIKS KETERTELUSURAN ALUR DATA LINTAS LAPISAN

**Tanggal Audit:** 22 Oktober 2026  
**Status:** READ-ONLY Data Lineage Matrix  
**File Output:** `docs/audit_arsitektur_data/04_DATA_LINEAGE_FRONTEND_BACKEND_DB.md`

---

### 1. Metodologi Penelusuran (Lineage Methodology)

Matriks data lineage ini memetakan perjalanan setiap variabel bisnis penting dari:
1. **Frontend UI Form / State Component**
2. **TypeScript Property**
3. **Store / Adapter / Provider**
4. **HTTP REST API Endpoint & Method**
5. **Request & Response DTO**
6. **Backend Controller, Service, dan Repository**
7. **SQLite Database Table & Column**
8. **Transformasi & Normalisasi di setiap lapisan**
9. **Status Persistensi Riil**
10. **Bukti Kode & Risiko Teridentifikasi**

---

### 2. Matriks Penelusuran Data Utama (Lineage Matrix)

| No | Field Bisnis | UI Form / Komponen | TS Property (`src/domain/`) | Store / Provider (`src/app/data/`) | Endpoint & Method | Controller / Service | SQLite Target (`server/data/`) | Status Persistensi | Bukti Kode & Lokasi | Temuan & Risiko |
| :-: | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **L-01** | Nomor Order | `BuatOrderSamsat.tsx`<br>Auto badge | `OperationalOrder.orderNo` (`types.ts:165`) | `orderStore.ts` ──> `ApiOrderProvider.ts` | `POST /api/orders`<br>`GET /api/orders/:orderNo` | `orderController.createOrder`<br>`DbOrderRepository.saveOrder` | `orders.order_no`<br>+ `data_json` | **Tersimpan Ganda** | `orderRoutes.ts:38`<br>`DbOrderRepository.ts:85` | **FND-P0-01**: Jika di-update via SQL, read memprioritaskan `data_json`. |
| **L-02** | Nama Klien / Pemohon | `BuatOrderSamsat.tsx`<br>Input `customer` | `OperationalOrder.customer` (`types.ts:167`) | `orderStore.ts` ──> `ApiOrderProvider.ts` | `POST /api/orders`<br>`PUT /api/orders/:orderNo` | `orderController.updateOrder`<br>`DbOrderRepository.updateOrder` | `orders.customer`<br>+ `data_json` | **Tersimpan Ganda** | `BuatOrderSamsat.tsx:142`<br>`DbOrderRepository.ts:92` | Tidak ada constraint unik. Duplikasi nama dapat terjadi. |
| **L-03** | Nomor HP Pemohon | `BuatOrderSamsat.tsx`<br>Input `nomorHP` | `OperationalOrder.nomorHP` (`types.ts:168`) | `orderStore.ts` ──> `ApiOrderProvider.ts` | `POST /api/orders`<br>`PUT /api/orders/:orderNo` | `orderController.createOrder`<br>`DbOrderRepository.ts` | `orders.nomor_hp`<br>+ `data_json` | **Tersimpan Ganda** | `DbOrderRepository.ts:94` | Casing mismatch: TS `nomorHP` di-map ke SQL `nomor_hp`. |
| **L-04** | Nomor Polisi (Nopol) | `BuatOrderSamsat.tsx`<br>Input `nopol` | `OperationalOrder.nopol` (`types.ts:182`) | `orderStore.ts` ──> `ApiOrderProvider.ts` | `POST /api/orders`<br>`PUT /api/orders/:orderNo` | `orderController.updateOrder`<br>`DbOrderRepository.ts` | `orders.nopol`<br>+ `data_json` | **Tersimpan Ganda** | `orderController.ts:60` | Normalisasi spasi dan huruf kapital dilakukan di UI. |
| **L-05** | Tahapan Order (Step) | `OrderTracking.tsx`<br>Steppers 1–8 | `OperationalOrder.currentStep` (`types.ts:170`) | `orderStore.ts` ──> `ApiOrderProvider.ts` | `POST /api/orders/:orderNo/advance`<br>`POST /api/orders/:orderNo/rollback` | `orderController.advanceOrder`<br>`orderService.advanceOrder` | `orders.current_step`<br>+ `orders.current_stage_name` | **Tersimpan Ganda** | `orderService.ts:145`<br>`orderRoutes.ts:55` | **FND-P0-02**: Rollback order tidak dibungkus `runInTransaction()`. |
| **L-06** | Nomor Invoice | `FinanceContent.tsx`<br>Tabel Tagihan | `InvoiceBillingRecord.invoice` / `invoiceNo` | `financeStore.ts` ──> `ApiFinanceProvider.ts` | `POST /api/finance/invoices`<br>`GET /api/finance/invoices` | `financeController.createInvoice`<br>`DbFinanceRepository.ts` | `finance_invoices.invoice_no` | **Tersimpan di Kolom** | `financeRoutes.ts:25`<br>`DbFinanceRepository.ts:110` | **FND-P1-02**: Aliasing ganda properti TS `invoice` vs `invoiceNo`. |
| **L-07** | Total Tagihan | `FinanceContent.tsx`<br>Modal Tagihan | `InvoiceBillingRecord.totalTagihan` (`types.ts:37`) | `financeStore.ts` ──> `ApiFinanceProvider.ts` | `POST /api/finance/invoices`<br>`PUT /api/finance/invoices/:id` | `financeController.updateInvoice`<br>`financeService.calculateTotal`| `finance_invoices.total_tagihan` | **Tersimpan di Kolom** | `financeService.ts:88` | Harus sama persis dengan `orders.total_biaya`. |
| **L-08** | Nominal Terbayar | `FinanceContent.tsx`<br>Form Bayar | `InvoiceBillingRecord.terbayar` / `dibayar` | `financeStore.ts` ──> `ApiFinanceProvider.ts` | `POST /api/finance/invoices/:id/payments` | `financeController.payInvoice`<br>`financeService.payInvoice` | `finance_invoices.terbayar`<br>+ `invoice_payments.nominal` | **Tersimpan + Transaksional**| `financeService.ts:210`<br>`DbFinanceRepository.ts:180` | Pembayaran diproteksi oleh `runInTransaction()`. |
| **L-09** | Sisa Piutang | `FinanceContent.tsx`<br>Badge Status | `InvoiceBillingRecord.sisa` (`types.ts:40`) | `financeStore.ts` ──> `ApiFinanceProvider.ts` | - (Dihitung di backend/frontend) | `financeService.ts`<br>Formula: `total - terbayar` | `finance_invoices.sisa` | **Tersimpan di Kolom** | `financeService.ts:215` | Redundan dengan `total_tagihan - terbayar`. |
| **L-10** | Laba Kotor (Profit) | `LabaRugiTab.tsx`<br>Kartu KPI Profit | `InvoiceBillingRecord.profit` / `profit_final` | `financeStore.ts` ──> `ApiFinanceProvider.ts` | `GET /api/finance/profit/items`<br>`POST /api/finance/invoices/:id/complete`| `financeController.completeInvoice`<br>`financeService.completeInvoice` | `finance_invoices.profit_final`<br>+ `profit_status` | **Tersimpan di Kolom** | `financeRoutes.ts:55`<br>`DbFinanceRepository.ts:230` | Hanya berubah jadi `REALIZED` jika invoice status `Lunas`. |
| **L-11** | Biaya Pengeluaran Samsat | `Tahap5Form.tsx`<br>Kwitansi Samsat | `OperationalOrder.biayaSamsat` / `finalPkb` | `orderStore.ts` ──> `financeStore.ts` | `PUT /api/orders/:orderNo`<br>`PUT /api/finance/invoices/:id` | `financeController.updateInvoice`<br>`DbFinanceRepository.ts` | `finance_invoices.biaya_samsat`<br>+ `orders.data_json` | **Tersimpan Ganda** | `orderService.ts:310` | Disinkronkan antar store saat Tahap 5 selesai diverifikasi. |
| **L-12** | Cashback Pemohon | `DataPenjualanTable.tsx`<br>Kolom Cashback | `InvoiceBillingRecord.cashback` | `financeStore.ts` ──> `ApiFinanceProvider.ts` | `POST /api/finance/invoices/:id/cashback-payout` | `financeController.payoutCashback`<br>`financeService.payoutCashback` | `finance_invoices.cashback_nominal`<br>+ `cashback_status` | **Tersimpan + Transaksional**| `financeService.ts:280` | Memotong kas kantor jika dicairkan tunai/transfer. |
| **L-13** | Mutasi Kas Masuk Kantor | `FinanceContent.tsx`<br>Tab Kas Kantor | `KasKantorEntry` | `financeStore.ts` ──> `ApiFinanceProvider.ts` | `GET /api/finance/kas-kantor`<br>(Auto-insert via Payment) | `financeService.payInvoice`<br>`DbFinanceRepository.insertKasKantor` | `kas_kantor.nominal`<br>+ `saldo_berjalan` | **Tersimpan di Kolom** | `DbFinanceRepository.ts:290` | Otomatis dibuat saat payment diverifikasi. |
| **L-14** | Berkas Fisik Upload | `OrderTracking.tsx`<br>Upload Box | `OrderDocument.fileUrl` / `documentId` | `ApiDocumentProvider.ts` | `POST /api/documents/upload`<br>`GET /api/documents/:id/download` | `documentController.upload`<br>`DbDocumentRepository.save` | `documents.file_path`<br>+ Disk Storage (`uploads/`) | **Tersimpan di SQLite + Disk** | `documentRoutes.ts:18`<br>`DbDocumentRepository.ts:40` | **FND-P0-03**: File fisik disimpan di disk lokal server. |
| **L-15** | Tarif Dasar Samsat | `HargaDasarSamsat.tsx`<br>Tabel Tarif | `SamsatCostItem.basePrice` (`types.ts:42`) | `pricingStore.ts` ──> `ApiPricingProvider.ts` | `GET /api/pricing/samsat`<br>`PUT /api/pricing/samsat/:id` | `pricingController.updateSamsatPricing`<br>`DbPricingRepository.ts` | `samsat_pricing.base_price`<br>+ `data_json` | **Tersimpan Ganda** | `pricingRoutes.ts:24`<br>`DbPricingRepository.ts:75` | Perbaikan P0 memastikan ID frontend cocok dengan `samsat_id`. |
| **L-16** | Margin Biaya Jasa | `BiayaLayananTab.tsx`<br>Tabel Paket Jasa | `ServiceCostItem.nominal` / `sellingPrice` | `pricingStore.ts` ──> `ApiPricingProvider.ts` | `GET /api/pricing/services`<br>`PUT /api/pricing/services/:id` | `pricingController.updateServicePricing`<br>`DbPricingRepository.ts` | `service_pricing_configs.selling_price` | **Tersimpan Ganda** | `pricingRoutes.ts:32`<br>`DbPricingRepository.ts:120` | Perbaikan P1 menambahkan endpoint POST dan DELETE. |
| **L-17** | Password Pengguna | `ManajemenPengguna.tsx`<br>Modal Reset | Form `newPassword` (Plain text input) | `karyawanPenggunaAdapter.ts` ──> `ApiUserProvider.ts` | `POST /api/users/:id/reset-password` | `userController.resetPassword`<br>`authService.hashPassword` | `users.password_hash` | **Tersimpan Hash Bcrypt** | `userRoutes.ts:28`<br>`authService.ts:45` | Plaintext di-hash dengan bcrypt salt round 10 sebelum SQL. |

---

### 3. Analisis Transformasi & Jebakan Desinkronisasi Data

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        JEBAKAN DESINKRONISASI DATA (DESYNC TRAPS)                      │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. POLA DUA SUMBER KEBENARAN (DUAL SOURCE OF TRUTH):                                   │
│    • Pada saat `createOrder`, objek diserialisasi menjadi teks JSON dan disimpan di     │
│      kolom `orders.data_json`, sementara kolom individual `nopol`, `customer`, dll.    │
│      juga diisi.                                                                       │
│    • Namun, saat pembacaan `DbOrderRepository.getAllFlat()`, repository HANYA membaca │
│      `data_json` dan mem-parse kembali menjadi objek JavaScript.                       │
│    • RESIKO: Kolom relasional SQL menjadi sekadar 'display' yang diabaikan oleh        │
│      lapisan baca. Perubahan melalui query SQL langsung tidak akan pernah terbaca UI.  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. ALIASING & CASING CONVERSION LAYER:                                                 │
│    • Properti `nomorHP` (Frontend) -> `nomor_hp` (Backend SQL).                        │
│    • Properti `orderNo` (Frontend) -> `order_no` (Backend SQL).                        │
│    • Properti `invoice` / `invoiceNo` (Frontend) -> `invoice_no` (Backend SQL).        │
│    • Properti `terbayar` / `dibayar` (Frontend) -> `terbayar` (Backend SQL).           │
│    • Mapping ini tersebar di berbagai layer adapter tanpa schema validator tunggal.    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
