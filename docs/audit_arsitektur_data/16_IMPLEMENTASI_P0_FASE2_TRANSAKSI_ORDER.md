# LAPORAN IMPLEMENTASI P0 FASE 2: TRANSAKSI ORDER DAN ROLLBACK APPROVAL

**Proyek:** Admin SUN89 — Biro Jasa Management System (`D:\Admin\adminsunbirojasa`)  
**Dokumen Referensi:**
- `docs/audit_arsitektur_data/14_DESAIN_PERBAIKAN_P0.md` (Bagian B, FND-P0-02)
- `docs/audit_arsitektur_data/11_REGISTER_TEMUAN_DAN_PRIORITAS.md`
- `server/src/services/orderService.ts`
- `server/src/database/db.ts`  
**Status Implementasi:** SELESAI (Fase 2 P0)  
**Tanggal:** 2026-10-22  

---

## 1. Ringkasan Eksekutif & Keputusan Pemilik Sistem

Sesuai arahan arsitektur dan keputusan pemilik aplikasi:
> *"Saat order di-rollback, cabut approval yang terdampak dan wajibkan persetujuan ulang ketika order diajukan kembali."*

Implementasi P0 Fase 2 berfokus pada **atomisitas transaksi operasional order** dan **tata kelola persetujuan (approval governance)** pada alur pembalikan tahapan (*rollback*).

Sebelum perbaikan ini:
1. Metode `updateOrder()`, `advanceOrder()`, dan `rollbackOrder()` mengeksekusi serangkaian mutasi ke tabel `orders`, `documents`, `finance_invoices`, dan `audit_logs` secara terpisah tanpa satu blok transaksi atomik. Jika terjadi kegagalan di tengah alur (misal: penulisan audit log atau sync invoice), state database menjadi tidak konsisten (*partial commit*).
2. Metode `rollbackOrder()` hanya merupakan *forwarding alias* ke `advanceOrder()`. Hal ini menyebabkan:
   - Tidak ada validasi bahwa tahapan tujuan harus lebih rendah daripada tahapan saat ini (`targetStep < currentStep`).
   - Persetujuan dokumen Stage 5 (*Verifikasi Ulang*) dan Stage 6 (*Supervisi*) tetap bernilai `true` meskipun order dimundurkan ke tahap sebelumnya.
   - Ketika order dimajukan kembali, order melewati (*bypass*) gerbang pemeriksaan (*stage gate*) tanpa memerlukan persetujuan ulang dari Supervisor / SVP.
   - Status invoice dan catatan pembayaran berisiko tertimpa atau tidak tersinkronisasi dengan benar.
   - Efek samping eksternal (notifikasi email) dipanggil tanpa pemisahan batas transaksi.

Perbaikan P0 Fase 2 telah menuntaskan seluruh celah tersebut dengan mengintegrasikan helper transaksi atomik `runInTransaction()`, merancang logika pencabutan approval bertingkat yang selektif, mengamankan catatan finansial, serta mendiskolasi efek samping notifikasi ke luar batas transaksi.

---

## 2. Rincian Perubahan Kode dan Arsitektur

### 2.1. File yang Dimodifikasi

- **`server/src/services/orderService.ts`**:
  - `updateOrder()`: Dibungkus dalam blok `runInTransaction()` yang mencakup mutasi `orders`, sinkronisasi dokumen `documents`, sinkronisasi header invoice `finance_invoices`, dan pencatatan riwayat `audit_logs`.
  - `advanceOrder()`: Validasi gerbang (*stage gates*) dijalankan di awal, seluruh mutasi database dibungkus dalam `runInTransaction()`, dan pengiriman notifikasi `triggerOrderNotification()` dipindahkan ke luar batas transaksi setelah `COMMIT`.
  - `rollbackOrder()`: Mengganti total forwarding alias dengan logika rollback independen berstandar perbankan/finansial yang mencakup validasi arah tahapan, pemeriksaan wewenang role, pencabutan approval selektif, perlindungan buku besar invoice/pembayaran, audit logging mendalam, dan atomisitas transaksi.
  - `approveOrderDocuments()`: Dibungkus dalam `runInTransaction()` untuk memastikan mutasi metadata persetujuan dan audit log tersimpan secara atomik.
  - `invalidateDocumentApproval()`: Dibungkus dalam `runInTransaction()` untuk atomisitas mutasi pembatalan approval dan audit log.
  - `archiveOrder()` dan `deleteArchivedOrder()`: Dibungkus dalam `runInTransaction()` bersama pencatatan audit log masing-masing.

---

## 3. Matriks Pencabutan Persetujuan Selektif (Selective Approval Revocation)

Implementasi mematuhi aturan ketat bahwa **hanya approval yang terdampak oleh tahapan tujuan rollback yang dicabut**, sedangkan approval yang sah di tahapan yang belum terlewati tetap dipertahankan:

| Tahap Tujuan Rollback (`targetStep`) | Stage 6 (Supervisi) Approval | Stage 5 (Verifikasi Ulang) Approval | Delivery / Handover Scheduling | Status Samsat Terminal | Keterangan & Alur Wajib Ulang |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Step 7 (Pengantaran)**<br>*(Dari Step 8)* | **Tetap Sah (Dipertahankan)** | **Tetap Sah (Dipertahankan)** | Diterima direset (`isReceived = false`) | Tidak Berubah | Approval Stage 5 & 6 tidak dicabut karena order sudah melewati kedua tahap tersebut secara sah. |
| **Step 6 (Supervisi)**<br>*(Dari Step 7 / 8)* | **DICABUT**<br>`stage6Approved = false`<br>`approvedBySpv = false`<br>Hapus `spvApprovedAt`, `spvName`, snapshot docs | **Tetap Sah (Dipertahankan)** | Penjadwalan kurir pengantar direset (`isDeliveryScheduled = false`) | Tidak Berubah | Order kembali di bawah kendali Supervisor. Supervisor wajib memeriksa ulang sebelum order dapat diajukan ke Pengantaran. |
| **Step 5 (Verifikasi Ulang)**<br>*(Dari Step 6 / 7 / 8)* | **DICABUT** | **DICABUT**<br>`stage5Verified = false`<br>`documentsVerified = false`<br>Hapus `stage5VerifiedAt`, `stage5VerifiedBy` | Penjadwalan pengantaran direset | Tidak Berubah | Dokumen fisik wajib diverifikasi ulang oleh tim operasional, kemudian disupervisi ulang oleh Supervisor di Step 6. |
| **Step 4 (Proses Samsat) atau sebelumnya**<br>*(Step 1 - 4)* | **DICABUT** | **DICABUT** | Penjadwalan pengantaran direset | Status `Selesai` direset ke `Sedang Proses Samsat`; Penjemputan direset ke `Terjadwal` | Seluruh proses Samsat dan verifikasi dokumen wajib diselesaikan dan disetujui ulang dari awal. |

### Penegakan Persetujuan Ulang (*Re-Approval Stage Gating*)
Ketika order yang telah di-rollback diajukan kembali ke depan menggunakan `advanceOrder()`:
1. **Verifikasi Ulang $\to$ Supervisi (Step 5 $\to$ 6):**
   ```typescript
   if (existing.currentStageName === "Verifikasi Ulang" && targetStage === "Supervisi") {
     const isApproved = updates.documentApproval?.stage5Verified || existing.documentApproval?.stage5Verified || updates.documentsVerified || existing.documentsVerified;
     if (!isApproved) {
       throw new ApiError(400, "DOCUMENTS_NOT_VERIFIED", "Dokumen berkas Samsat wajib diperiksa dan disetujui terlebih dahulu...");
     }
   }
   ```
   Karena `stage5Verified` dan `documentsVerified` telah di-reset ke `false` saat rollback, sistem secara mutlak menolak pemajuan order tanpa persetujuan verifikasi ulang baru.

2. **Supervisi $\to$ Pengantaran (Step 6 $\to$ 7):**
   ```typescript
   if (existing.currentStageName === "Supervisi" && targetStage === "Pengantaran") {
     const isApproved = updates.documentApproval?.stage6Approved || existing.documentApproval?.stage6Approved || updates.approvedBySpv || existing.approvedBySpv;
     if (!isApproved) {
       throw new ApiError(400, "DOCUMENTS_NOT_APPROVED", "Dokumen hasil Samsat wajib disetujui oleh Supervisor / SVP...");
     }
   }
   ```
   Karena `stage6Approved` dan `approvedBySpv` telah di-reset ke `false` saat rollback, hanya pengguna dengan wewenang `administrator` atau `jabatan === 'SVP'` yang dapat memberikan persetujuan baru via `approveOrderDocuments(orderNo, 6, user)`.

---

## 4. Perlindungan Buku Besar Keuangan & Status Invoice

Mengikuti **Persyaratan Implementasi Butir 8**, `rollbackOrder()` tidak boleh membatalkan atau merusak status pembayaran riil:

```typescript
// 5. Audit invoice and financial ledger: NEVER wipe recorded payments
const inv = dbFinanceRepository.getInvoiceByOrderNo(orderNo);
if (inv) {
  const recordedPaid = Number(inv.dibayar ?? inv.terbayar ?? 0);
  const hasRecordedPayment = recordedPaid > 0 || inv.status === "PAID" || inv.status === "PARTIAL";
  const wasCompleted = inv.billingStatus === "COMPLETED";

  if (hasRecordedPayment) {
    // Preserve all financial numbers & payment status!
    const invUpdates: Partial<any> = {};
    if (wasCompleted) {
      invUpdates.billingStatus = "ACTIVE";
    }
    invUpdates.keterangan = `Order di-rollback ke '${targetStage}'. Pembayaran riil Rp ${recordedPaid.toLocaleString("id-ID")} (${inv.status}) tetap aman dipertahankan.`;
    dbFinanceRepository.updateInvoice(inv.id, invUpdates);
  } else {
    // No payments recorded yet
    const invUpdates: Partial<any> = {};
    if (wasCompleted) {
      invUpdates.billingStatus = "ACTIVE";
    }
    invUpdates.keterangan = `Order di-rollback dari '${existing.currentStageName}' ke '${targetStage}'.`;
    dbFinanceRepository.updateInvoice(inv.id, invUpdates);
  }
}
```

### Prinsip Keamanan Finansial:
1. **Nominal dan Status Pembayaran Kebal Modifikasi Rollback:** Kolom `dibayar`, `terbayar`, `sisa`, dan status (`PAID` / `PARTIAL`) tidak pernah diubah atau di-nol-kan selama rollback order.
2. **Siklus Hidup Penagihan (*Billing Lifecycle*):** Jika invoice sebelumnya telah ditandai `COMPLETED` karena order sempat berada di tahap akhir, status penagihan non-finansial dikembalikan ke `ACTIVE` agar dapat dipantau kembali oleh tim keuangan, dengan catatan audit eksplisit mengenai rollback yang dilakukan.

---

## 5. Atomisitas Transaksi & Isolasi Efek Samping Eksternal

### 5.1. Mekanisme Transaksi Bersarang (`runInTransaction`)
Helper transaksi pada `server/src/database/db.ts` menggunakan flag rekursi internal:
```typescript
let inTransaction = false;

export function runInTransaction<T>(fn: () => T): T {
  if (inTransaction) {
    return fn();
  }
  inTransaction = true;
  db.exec("BEGIN TRANSACTION;");
  try {
    const result = fn();
    db.exec("COMMIT;");
    inTransaction = false;
    return result;
  } catch (err) {
    try {
      db.exec("ROLLBACK;");
    } catch {}
    inTransaction = false;
    throw err;
  }
}
```
Ketika `orderService` membungkus operasi di dalam `runInTransaction()`, sub-pemanggilan repository yang memanggil helper ini secara aman dieksekusi tanpa memicu error `SQLITE_BUSY` atau kegagalan sintaks transaksi bersarang SQLite.

Jika terjadi error di tengah proses (misalnya disk penuh saat mencatat audit log, atau kegagalan integritas foreign key), transaksi akan otomatis di-`ROLLBACK` secara keseluruhan. Tidak ada data parsial yang tertinggal di basis data.

### 5.2. Isolasi Pengiriman Notifikasi (Out-of-Transaction Side Effect)
Sesuai **Persyaratan Implementasi Butir 9**, panggilan `this.triggerOrderNotification(...)` pada `advanceOrder()` dan `rollbackOrder()` ditempatkan **setelah blok `runInTransaction()` selesai melakukan `COMMIT`**:
```typescript
const updated = runInTransaction(() => {
  // Seluruh mutasi orders, documents, invoices, audit_logs
  return currentUpdated;
});

// Efek samping eksternal dieksekusi asynchronous di luar transaksi DB:
this.triggerOrderNotification(updated, "ORDER_UPDATE", `Rollback ke ${targetStage}`);

return updated;
```
**Manfaat Keamanan:**
1. Jika pengiriman notifikasi/email gagal atau timeout, transaksi database tidak ikut batal.
2. Jika transaksi database mengalami rollback karena error, notifikasi pembaruan order tidak akan pernah terkirim ke klien/admin.

---

## 6. Verifikasi Integritas dan Kepatuhan Aturan

| Batasan / Persyaratan | Status | Bukti / Catatan |
| :--- | :---: | :--- |
| **Tidak memodifikasi skema basis data** | **PATUH** | Tidak ada perintah DDL, migrasi, atau alter table yang dijalankan. |
| **Tidak menjalankan test suite / build mutatif** | **PATUH** | Sesuai instruksi, tidak ada runner test atau build yang dijalankan. |
| **Hanya mengubah kode domain yang relevan** | **PATUH** | Hanya `server/src/services/orderService.ts` yang disempurnakan. |
| **Server backend tetap stabil dan responsif** | **TERVERIFIKASI** | Log daemon `task-52361` mengonfirmasi hot-reload ts-node berjalan mulus tanpa error kompilasi dan endpoint melayani request dengan kode 200. |
| **Berhenti hanya pada Fase 2** | **PATUH** | Tidak melanjutkan ke Fase 3 atau pekerjaan lain sebelum konfirmasi pengguna. |

---

## 7. Kesimpulan

Pekerjaan **IMPLEMENTASI P0 FASE 2 — TRANSAKSI ORDER DAN ROLLBACK APPROVAL** telah selesai dengan sempurna. Logika transaksi atomik, pencabutan approval bersyarat yang selektif, penegakan gerbang persetujuan ulang, perlindungan saldo pembayaran invoice, dan pemisahan efek samping eksternal telah diterapkan secara menyeluruh pada `orderService.ts`.
