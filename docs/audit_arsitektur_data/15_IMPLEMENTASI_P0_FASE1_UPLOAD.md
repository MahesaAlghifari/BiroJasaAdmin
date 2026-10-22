# 15 — LAPORAN IMPLEMENTASI P0 FASE 1: KEAMANAN UPLOAD DOKUMEN
## PENYELESAIAN TEMUAN FND-P0-03 (FILE UPLOAD SECURITY & BINARY VALIDATION)

**Tanggal Implementasi:** 22 Oktober 2026  
**Status Implementasi:** FASE 1 SELESAI (Code Implemented — No Test/Build Executed)  
**Root Proyek:** `D:\Admin\adminsunbirojasa`  
**Acuan Desain:**  
- `docs/audit_arsitektur_data/14_DESAIN_PERBAIKAN_P0.md` (Bagian C)
- `docs/audit_arsitektur_data/11_REGISTER_TEMUAN_DAN_PRIORITAS.md` (Temuan `FND-P0-03`)

---

### 1. Daftar File yang Diubah

Implementasi perbaikan Fase 1 difokuskan secara presisi pada 5 file backend berikut tanpa mengubah modul lain atau skema database:

| No | File Target | Ringkasan Perubahan Implementasi |
| :-: | :--- | :--- |
| 1 | [`server/src/utils/fileValidation.ts`](file:///D:/Admin/adminsunbirojasa/server/src/utils/fileValidation.ts) | Menambahkan validator biner terpisah per format (PDF, PNG, JPEG, WebP), pemeriksaan penanda akhir berkas (EOF), deteksi serangan ekstensi ganda (*double extension*), deteksi berkas biner terlarang/arsip, dan sanitasi nama berkas kanonis. |
| 2 | [`server/src/routes/documentRoutes.ts`](file:///D:/Admin/adminsunbirojasa/server/src/routes/documentRoutes.ts) | Menambahkan fast pre-filter pada Multer `fileFilter` untuk menolak ekstensi executable/skrip berbahaya sebelum proses buffering penuh di memori. |
| 3 | [`server/src/controllers/documentController.ts`](file:///D:/Admin/adminsunbirojasa/server/src/controllers/documentController.ts) | Memperkuat header keamanan HTTP pada `previewDocument` dan `downloadDocument` (`X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`, CSP spesifik format dokumen, dan RFC 5987/6266 `filename*=UTF-8''...`). |
| 4 | [`server/src/services/documentService.ts`](file:///D:/Admin/adminsunbirojasa/server/src/services/documentService.ts) | Menambahkan penanganan eksplisit kegagalan penghapusan berkas fisik yatim (*orphan cleanup*) saat penyimpanan metadata database gagal, lengkap dengan log audit warning/critical. |
| 5 | [`server/src/storage/localDiskDocumentStorage.ts`](file:///D:/Admin/adminsunbirojasa/server/src/storage/localDiskDocumentStorage.ts) | Menambahkan whitelist ketat ekstensi fisik yang diizinkan (`.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`) sebelum penulisan ke disk dan logging eksplisit kegagalan `unlink`. |

---

### 2. Format yang Didukung dan Metode Validasinya

Sesuai arahan pemilik aplikasi bahwa format upload dapat diperluas dengan syarat setiap format wajib memiliki rancangan validasi dan deteksi struktur biner tersendiri, sistem kini mendukung **4 format dokumen resmi**:

#### A. Dokumen PDF (`application/pdf`, `.pdf`)
- **Tujuan Bisnis:** Berkas scan resmi SKKP, notice pajak, berkas BPKB multipage, atau formulir Samsat digital.
- **Metode Validasi:**
  1. *Magic Bytes Header:* Wajib diawali 4 byte `%PDF-` (`0x25, 0x50, 0x44, 0x46`).
  2. *Batas Ukuran Minimal:* Buffer wajib $\ge 64$ bytes (struktur minimal PDF untuk header, xref, trailer, dan startxref).
  3. *End-of-File (EOF) Marker:* Wajib mengandung penanda `%%EOF` pada 1.024 byte terakhir dari buffer berkas untuk memastikan berkas tidak terpotong (*not truncated*).
  4. *Polyglot Script Check:* Memindai 1.024 byte awal untuk mendeteksi tag terlarang seperti `<script`, `<?php`, `<html`, atau `<svg` yang sering digunakan pada serangan XSS polyglot PDF.

#### B. Gambar PNG (`image/png`, `.png`)
- **Tujuan Bisnis:** Foto KTP, tangkapan layar bukti transfer mobile banking, atau kartu identitas pemohon.
- **Metode Validasi:**
  1. *Magic Bytes Signature:* Wajib diawali 8 byte identitas PNG resmi: `89 50 4E 47 0D 0A 1A 0A`.
  2. *Batas Ukuran Minimal:* Buffer wajib $\ge 57$ bytes.
  3. *Validasi Chunk IHDR:* Chunk pertama (offset 8-15) wajib memiliki panjang 13 bytes (`0x00, 0x00, 0x00, 0x0D`) dan tipe `IHDR` (`0x49, 0x48, 0x44, 0x52`).
  4. *Dimensi Gambar:* Nilai width dan height pada chunk IHDR (offset 16-23) wajib bernilai $> 0$.
  5. *End-of-File Chunk IEND:* 12 byte terakhir berkas wajib berupa chunk penutup resmi `IEND` lengkap dengan CRC-nya: `00 00 00 00 49 45 4E 44 AE 42 60 82`.

#### C. Gambar JPEG / JPG (`image/jpeg`, `.jpg`)
- **Tujuan Bisnis:** Foto fisik kendaraan (cek fisik nopol/rangka), foto STNK asli, kwitansi loket Samsat dari kamera ponsel.
- **Metode Validasi:**
  1. *Start of Image (SOI):* Wajib diawali 2 byte `0xFF, 0xD8`, diikuti oleh byte `0xFF`.
  2. *Batas Ukuran Minimal:* Buffer wajib $\ge 100$ bytes.
  3. *Validasi Marker Pertama:* Byte ke-4 setelah SOI wajib merupakan marker JPEG sah (APP0–APP15 `0xE0`–`0xEF`, DQT `0xDB`, SOF0–SOF3 `0xC0`–`0xC3`, atau COM `0xFE`).
  4. *End of Image (EOI) Marker:* Wajib mengandung penanda `0xFF, 0xD9` dalam 32 byte terakhir dari buffer berkas (memberikan toleransi aman terhadap padding nol yang kerap ditambahkan sensor kamera smartphone).

#### D. Gambar WebP (`image/webp`, `.webp`) — *Format Baru Terverifikasi*
- **Tujuan Bisnis:** Format foto kompresi modern yang banyak dihasilkan oleh kamera smartphone Android dan tangkapan layar browser masa kini untuk pengurusan berkas Samsat.
- **Metode Validasi:**
  1. *Header Kontainer RIFF:* Byte 0–3 wajib berupa string ASCII `RIFF` (`0x52, 0x49, 0x46, 0x46`).
  2. *Signature Format:* Byte 8–11 wajib berupa string ASCII `WEBP` (`0x57, 0x45, 0x42, 0x50`).
  3. *Batas Ukuran Minimal:* Buffer wajib $\ge 30$ bytes.
  4. *Validasi Subtipe Chunk:* Byte 12–15 wajib merupakan salah satu subtipe WebP yang sah:
     - `VP8 ` (Simple lossy image)
     - `VP8L` (Lossless image)
     - `VP8X` (Extended WebP with alpha / metadata)
  5. *Integritas Ukuran:* Ukuran berkas yang dideklarasikan pada header uint32 LE (offset 4) diverifikasi tidak melebihi ukuran buffer aktual guna mencegah berkas terpotong.

#### E. Blacklist Tandatangan Biner Terlarang
Setiap berkas dipindai sebelum penentuan format:
- Executable Windows PE (`MZ`: `0x4D, 0x5A`) -> **Ditolak HTTP 400 (`EXECUTABLE_NOT_ALLOWED`)**
- Binary Linux ELF (`0x7F, 0x45, 0x4C, 0x46`) -> **Ditolak HTTP 400 (`EXECUTABLE_NOT_ALLOWED`)**
- Mach-O Binaries & Java Class (`0xCA, 0xFE, 0xBA, 0xBE`) -> **Ditolak HTTP 400 (`EXECUTABLE_NOT_ALLOWED`)**
- Arsip Terkompresi (ZIP `PK\x03\x04`, RAR, 7z) -> **Ditolak HTTP 400 (`ARCHIVE_NOT_ALLOWED`)**
- Skrip Shell (`#!/bin/`) -> **Ditolak HTTP 400 (`SCRIPT_NOT_ALLOWED`)**

---

### 3. Mitigasi Serangan Ekstensi Ganda & Sanitasi Nama Berkas

Pada fungsi `sanitizeAndValidateFileName()`:
1. **Inspeksi Seluruh Segmen Ekstensi:** Nama berkas dipecah berdasarkan karakter titik (`.`). Jika ditemukan segmen tengah yang cocok dengan ekstensi skrip berbahaya (`php`, `phtml`, `phar`, `exe`, `dll`, `bat`, `cmd`, `sh`, `js`, `vbs`, `ps1`, `py`, `jar`, `svg`, `html`, dsb.), berkas langsung ditolak dengan error `SUSPICIOUS_DOUBLE_EXTENSION`.
2. **Pencocokan Ekstensi Klien vs Biner:** Ekstensi yang diklaim klien wajib cocok dengan ekstensi kanonis hasil deteksi biner. Contoh: file biner JPEG yang dinamai `bukti.pdf` akan ditolak dengan error `EXTENSION_MISMATCH`.
3. **Penyimpanan Fisik Aman di Disk:** Nama asli klien **TIDAK PERNAH** digunakan sebagai path di disk server. Disk penyimpanan selalu menggunakan `UUIDv4 + canonical_ext` (misal: `d3b07384-d113-4632-9c97-4c72cf49c398.jpg`), sehingga path traversal tidak mungkin terjadi pada level filesystem.

---

### 4. Perubahan Alur Penyimpanan dan Pembersihan Berkas Fisik

Alur penulisan dokumen kini menerapkan jaminan atomisitas fisik vs metadata:

```
[1. Validasi Biner Ketat] ──(Lolos)──> [2. Tulis File ke uploads/UUID.ext]
                                                        │
                                                        ▼
                                       [3. INSERT ke SQLite tabel documents]
                                                        │
                         ┌──────────────────────────────┴──────────────────────────────┐
                         ▼ (Sukses)                                                    ▼ (Error Database)
                   [4. Simpan Log Audit]                                    [4. Rollback Pembersihan Disk]
                   [5. HTTP 201 Created]                                    - storage.deleteFile(UUID.ext)
                                                                            - console.warn() jika sukses
                                                                            - console.error() jika unlink gagal
                                                                            - Throw HTTP 500 STORAGE_ERROR
```

**Peningkatan Kunci:**  
Penanganan kegagalan penghapusan berkas fisik tidak lagi disembunyikan dengan `.catch(() => {})`. Jika terjadi kegagalan sistem berkas saat unlink, sistem mencatat pesan log `CRITICAL ROLLBACK FAILURE` dengan menyertakan path absolut dan detail error kode filesystem untuk memudahkan audit sysadmin.

---

### 5. Penguatan Header HTTP pada Preview dan Download

Pada [`documentController.ts`](file:///D:/Admin/adminsunbirojasa/server/src/controllers/documentController.ts):

#### A. Endpoint Preview (`GET /api/documents/:id/preview`)
- **`X-Content-Type-Options: nosniff`:** Mencegah browser melakukan MIME-sniffing atau mengeksekusi konten gambar sebagai HTML/skrip.
- **`Cache-Control: private, no-cache, no-store, must-revalidate`:** Mencegah proxy publik atau CDN menyimpan dokumen identitas sensitif (KTP/STNK).
- **`Content-Disposition: inline; filename="clean.ext"; filename*=UTF-8''clean.ext`:** Standar RFC 5987 / RFC 6266 untuk penanganan nama berkas yang aman.
- **Content Security Policy (CSP):**
  - Untuk PDF:  
    `default-src 'none'; style-src 'unsafe-inline'; object-src 'self'; frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000 http://localhost:3001 http://127.0.0.1:3001 http://localhost:5173 http://127.0.0.1:5173;`
  - Untuk Gambar (JPEG, PNG, WebP):  
    `default-src 'none'; img-src 'self' data: blob:; frame-ancestors 'self' http://localhost:3000 http://127.0.0.1:3000 http://localhost:3001 http://127.0.0.1:3001 http://localhost:5173 http://127.0.0.1:5173;`

#### B. Endpoint Download (`GET /api/documents/:id/download`)
- **`Content-Disposition: attachment; filename="clean.ext"; filename*=UTF-8''clean.ext`:** Memaksa browser untuk mengunduh berkas alih-alih merendernya di tab aktif.
- **`Content-Security-Policy: default-src 'none'; sandbox;`:** Mengisolasi berkas yang diunduh dari eksekusi skrip konteks origin aplikasi.

---

### 6. Pemeriksaan Statis yang Dilakukan (Without Test/Build)

Sesuai batasan operasional (tidak menjalankan test suite atau build compiler):
1. **Syntax & Symbol Check:** Memastikan seluruh tipe, impor modul (`path`, `crypto`, `fs`), dan tanda kurung penutup konsisten.
2. **Signature Compatibility:** Tipe `AllowedMimeType` (`"application/pdf" | "image/jpeg" | "image/png" | "image/webp"`) sepenuhnya kompatibel dengan kolom `mime_type TEXT` pada tabel SQLite `documents`.
3. **No Unhandled Promises:** Seluruh operasi asinkron (`fs.promises.writeFile`, `fs.promises.unlink`, `this.storage.deleteFile`) memiliki blok penanganan error (`try ... catch`).
4. **Zero Database Modifications:** Tidak ada query DDL atau skema yang diubah.

---

### 7. Keterbatasan yang Tersisa & Kriteria Penerimaan Belum Terverifikasi

#### Keterbatasan yang Tersisa:
1. **HEIC / HEIF (Apple iPhone Format):** Kamera iPhone dengan pengaturan "High Efficiency" menghasilkan berkas `.heic`. Format ini memerlukan pustaka decoder biner khusus (seperti `libheif` / `heic-convert`) yang membutuhkan dependensi native binary. Untuk saat ini, pengguna iPhone disarankan mengatur format kamera ke "Most Compatible" (JPEG) atau menggunakan WebP.
2. **Decompression Bomb (Zip/Pixel Bomb):** Gambar PNG berukuran 50KB dengan resolusi dekompresi 50.000 x 50.000 piksel belum memiliki batas resolusi maksimal di tingkat server sebelum di-render browser klien.

#### Kriteria Penerimaan yang Menunggu Verifikasi Runtime:
- Pengujian upload berkas biner `.exe` yang di-rename menjadi `.jpg` harus ditolak dengan kode status HTTP 400.
- Pengujian upload berkas `.pdf` tanpa penanda `%%EOF` harus ditolak dengan error `TRUNCATED_PDF`.
- Pengujian upload berkas dengan nama `dokumen.php.jpg` harus ditolak dengan error `SUSPICIOUS_DOUBLE_EXTENSION`.
- Pengujian upload gambar WebP asli dari smartphone harus tersimpan dan dapat di-preview secara normal di browser.
