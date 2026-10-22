# 05 — KATALOG LENGKAP API
## INVENTARISASI ENDPOINT AKTIF & KONTRAK INTERFACE DORMAN

**Tanggal Audit:** 22 Oktober 2026  
**Status:** READ-ONLY API Catalog  
**Root Backend:** `server/src/`  
**Total Endpoint Aktif:** 38 Endpoint (35 Rute Bisnis + 3 Health Probes)  
**Total Kontrak Dorman:** 50 Tanda Tangan Interface (`src/api/endpoints/`)  
**File Output:** `docs/audit_arsitektur_data/05_KATALOG_API.md`

---

### 1. Ikhtisar Arsitektur API

Backend **Admin SUN89** dibangun menggunakan Express.js 4.19 dengan TypeScript, berjalan pada port default 3001. Seluruh endpoint bisnis dilindungi oleh rate limiter (`apiRateLimiter`), CORS origin whitelist, security headers, dan parser JSON berkapasitas 10MB.

Autentikasi menggunakan standar **Bearer JSON Web Token (JWT)** yang ditandatangani oleh `authService`. Validasi role dilakukan via middleware `requireRoles(...)`. Operasi finansial dan mutasi multi-tabel menggunakan transaksi atomik berbasis `runInTransaction()`.

---

### 2. Katalog Endpoint Backend Aktif (38 Endpoints)

#### A. Health Probes (`server/src/app.ts`)
| ID | Method | Path | Auth | Roles | Target / Keterangan |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `EP-HLT-01` | `GET` | `/api/health` | Public | All | Liveness probe, status koneksi SQLite dan uptime. |
| `EP-HLT-02` | `GET` | `/api/health/live` | Public | All | Alias liveness probe untuk orkestrasi container/k8s. |
| `EP-HLT-03` | `GET` | `/api/health/ready` | Public | All | Readiness probe, uji responsivitas DB dan izin tulis folder upload. |

#### B. Autentikasi Pengguna (`authRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-AUTH-01` | `POST` | `/api/auth/login` | Public | All | `authController.login` | `users` (Read), `audit_logs` (Write) | Tidak |
| `EP-AUTH-02` | `GET` | `/api/auth/me` | Bearer JWT | All | `authController.me` | `users` (Read) | Tidak |
| `EP-AUTH-03` | `POST` | `/api/auth/change-password` | Bearer JWT | All | `authController.changePassword` | `users` (Write), `audit_logs` (Write) | Ya |

#### C. Order & Alur Operasional (`orderRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-ORD-01` | `GET` | `/api/orders` | Bearer JWT | All | `orderController.getOrders` | `orders` (Read) | Tidak |
| `EP-ORD-02` | `GET` | `/api/orders/archived` | Bearer JWT | All | `orderController.getArchivedOrders`| `orders` (Read) | Tidak |
| `EP-ORD-03` | `GET` | `/api/orders/:orderNo` | Bearer JWT | All | `orderController.getOrderByNo` | `orders` (Read) | Tidak |
| `EP-ORD-04` | `POST` | `/api/orders` | Bearer JWT | Admin, SVP | `orderController.createOrder` | `orders`, `finance_invoices`, `audit_logs` | **Ya** |
| `EP-ORD-05` | `PUT` | `/api/orders/:orderNo` | Bearer JWT | Admin, Messenger, Finance, SVP | `orderController.updateOrder` | `orders` (Write), `audit_logs` | **Tidak (FND-P0-02)** |
| `EP-ORD-06` | `POST` | `/api/orders/:orderNo/advance` | Bearer JWT | Admin, Messenger, Finance, SVP | `orderController.advanceOrder` | `orders` (Write), `audit_logs` | **Ya** |
| `EP-ORD-07` | `POST` | `/api/orders/:orderNo/rollback`| Bearer JWT | Admin, SVP | `orderController.rollbackOrder` | `orders` (Write), `audit_logs` | **Tidak (FND-P0-02)** |
| `EP-ORD-08` | `POST` | `/api/orders/:orderNo/cancel` | Bearer JWT | Admin, SVP | `orderController.cancelOrder` | `orders`, `finance_invoices`, `audit_logs` | **Ya** |
| `EP-ORD-09` | `POST` | `/api/orders/:orderNo/archive`| Bearer JWT | Admin, SVP | `orderController.archiveOrder` | `orders` (Write), `audit_logs` | Tidak |
| `EP-ORD-10` | `DELETE`| `/api/orders/archived/:orderNo`| Bearer JWT| Administrator, Admin | `orderController.deleteArchivedOrder` | `orders` (Delete hard), `audit_logs` | Tidak |
| `EP-ORD-11` | `DELETE`| `/api/orders/archived` | Bearer JWT | Administrator, Admin | `orderController.clearArchivedOrders` | `orders` (Delete all archived) | Ya |
| `EP-ORD-12` | `POST` | `/api/orders/:orderNo/verify-payment` | Bearer JWT | Finance, Admin, SVP | `orderController.verifyPayment` | `orders`, `finance_invoices`, `kas_kantor` | **Ya** |
| `EP-ORD-13` | `POST` | `/api/orders/:orderNo/approve-documents` | Bearer JWT | SVP, Administrator | `orderController.approveOrderDocuments` | `orders` (Write `data_json`), `audit_logs` | Tidak |

#### D. Keuangan & Invoicing (`financeRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-FIN-01` | `GET` | `/api/finance/invoices` | Bearer JWT | All | `financeController.getInvoices` | `finance_invoices` (Read) | Tidak |
| `EP-FIN-02` | `GET` | `/api/finance/invoices/:id` | Bearer JWT | All | `financeController.getInvoiceById` | `finance_invoices` (Read) | Tidak |
| `EP-FIN-03` | `POST` | `/api/finance/invoices` | Bearer JWT | Finance, Admin | `financeController.createInvoice` | `finance_invoices`, `audit_logs` | Ya |
| `EP-FIN-04` | `PUT` | `/api/finance/invoices/:id` | Bearer JWT | Finance, Admin | `financeController.updateInvoice` | `finance_invoices`, `audit_logs` | Tidak |
| `EP-FIN-05` | `POST` | `/api/finance/invoices/:id/payments` | Bearer JWT | Finance, Admin | `financeController.payInvoice` | `finance_invoices`, `invoice_payments`, `kas_kantor` | **Ya** |
| `EP-FIN-06` | `POST` | `/api/finance/invoices/:id/cashback-payout` | Bearer JWT | Finance, Admin | `financeController.payoutCashback` | `finance_invoices`, `kas_kantor` | **Ya** |
| `EP-FIN-07` | `POST` | `/api/finance/invoices/:id/complete` | Bearer JWT | Finance, Admin | `financeController.completeInvoice` | `finance_invoices` (Write) | **Ya** |
| `EP-FIN-08` | `GET` | `/api/finance/kas-kantor` | Bearer JWT | Finance, Admin, SVP | `financeController.getKasKantor` | `kas_kantor` (Read) | Tidak |
| `EP-FIN-09` | `GET` | `/api/finance/profit/summary` | Bearer JWT | Finance, Admin, SVP | `financeController.getProfitSummary` | `finance_invoices` (Aggregate) | Tidak |
| `EP-FIN-10` | `GET` | `/api/finance/profit/items` | Bearer JWT | Finance, Admin, SVP | `financeController.getProfitItems` | `finance_invoices` (Read) | Tidak |

#### E. Pengelolaan Dokumen & Berkas (`documentRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-DOC-01` | `POST` | `/api/documents/upload` | Bearer JWT | All | `documentController.upload` | `documents`, Disk `uploads/` | Tidak |
| `EP-DOC-02` | `GET` | `/api/documents/order/:orderNo` | Bearer JWT | All | `documentController.getDocumentsByOrder` | `documents` (Read) | Tidak |
| `EP-DOC-03` | `GET` | `/api/documents/invoice/:invoiceId` | Bearer JWT | All | `documentController.getDocumentsByInvoice` | `documents` (Read) | Tidak |
| `EP-DOC-04` | `POST` | `/api/documents/:id/ticket` | Bearer JWT | All | `documentController.generateTicket` | In-memory token ticket | Tidak |
| `EP-DOC-05` | `GET` | `/api/documents/:id/download` | Public (via Ticket)| All | `documentController.download` | Disk File Stream | Tidak |
| `EP-DOC-06` | `GET` | `/api/documents/:id/preview` | Public (via Ticket)| All | `documentController.preview` | Disk File Stream | Tidak |
| `EP-DOC-07` | `DELETE`| `/api/documents/:id` | Bearer JWT | Admin, SVP | `documentController.deleteDocument` | `documents` (Soft delete) | Tidak |

#### F. Master Tarif Samsat & Biaya Layanan (`pricingRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-PRC-01` | `GET` | `/api/pricing/samsat` | Bearer JWT | All | `pricingController.getSamsatPricing` | `samsat_pricing` (Read) | Tidak |
| `EP-PRC-02` | `PUT` | `/api/pricing/samsat/:id` | Bearer JWT | Administrator, Admin | `pricingController.updateSamsatPricing` | `samsat_pricing` (Write) | Tidak |
| `EP-PRC-03` | `GET` | `/api/pricing/services` | Bearer JWT | All | `pricingController.getServicePricing` | `service_pricing_configs` (Read)| Tidak |
| `EP-PRC-04` | `POST` | `/api/pricing/services` | Bearer JWT | Administrator, Admin | `pricingController.createServicePricing` | `service_pricing_configs` (Insert)| Tidak |
| `EP-PRC-05` | `PUT` | `/api/pricing/services/:id` | Bearer JWT | Administrator, Admin | `pricingController.updateServicePricing` | `service_pricing_configs` (Write) | Tidak |
| `EP-PRC-06` | `DELETE`| `/api/pricing/services/:id` | Bearer JWT | Administrator, Admin | `pricingController.deleteServicePricing` | `service_pricing_configs` (Delete)| Tidak |

#### G. Manajemen Akun & Pengguna (`userRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-USR-01` | `GET` | `/api/users` | Bearer JWT | Administrator, Admin | `userController.getUsers` | `users` (Read) | Tidak |
| `EP-USR-02` | `POST` | `/api/users` | Bearer JWT | Administrator, Admin | `userController.createUser` | `users` (Insert), `audit_logs` | Tidak |
| `EP-USR-03` | `PUT` | `/api/users/:id` | Bearer JWT | Administrator, Admin | `userController.updateUser` | `users` (Write), `audit_logs` | Tidak |
| `EP-USR-04` | `DELETE`| `/api/users/:id` | Bearer JWT | Administrator, Admin | `userController.deleteUser` | `users` (Soft delete), `audit_logs`| Tidak |
| `EP-USR-05` | `POST` | `/api/users/:id/reset-password` | Bearer JWT | Administrator, Admin | `userController.resetPassword` | `users` (Write hash), `audit_logs` | Tidak |

#### H. Master Wilayah & Samsat 514 Kab/Kota (`wilayahRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-WIL-01` | `GET` | `/api/wilayah` | Bearer JWT | All | `wilayahController.getWilayahList` | `wilayah_administratif` | Tidak |
| `EP-WIL-02` | `GET` | `/api/wilayah/provinces` | Bearer JWT | All | `wilayahController.getProvinces` | `wilayah_administratif` | Tidak |
| `EP-WIL-03` | `GET` | `/api/wilayah/:kode` | Bearer JWT | All | `wilayahController.getWilayahByKode` | `wilayah_administratif` | Tidak |
| `EP-WIL-04` | `GET` | `/api/samsat/offices` | Bearer JWT | All | `wilayahController.getSamsatOffices` | `samsat_offices` | Tidak |
| `EP-WIL-05` | `POST` | `/api/samsat/offices` | Bearer JWT | Administrator, Admin | `wilayahController.createSamsatOffice`| `samsat_offices` | Tidak |
| `EP-WIL-06` | `PUT` | `/api/samsat/offices/:id` | Bearer JWT | Administrator, Admin | `wilayahController.updateSamsatOffice`| `samsat_offices` | Tidak |
| `EP-WIL-07` | `DELETE`| `/api/samsat/offices/:id` | Bearer JWT | Administrator, Admin | `wilayahController.deleteSamsatOffice`| `samsat_offices` | Tidak |

#### I. Master Metode Pembayaran (`paymentMethodRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-PAY-01` | `GET` | `/api/payment-methods` | Bearer JWT | All | `paymentMethodController.getAll` | `payment_methods` (Read) | Tidak |
| `EP-PAY-02` | `POST` | `/api/payment-methods` | Bearer JWT | Administrator, Admin | `paymentMethodController.create` | `payment_methods` (Insert) | Tidak |
| `EP-PAY-03` | `PUT` | `/api/payment-methods/:id` | Bearer JWT | Administrator, Admin | `paymentMethodController.update` | `payment_methods` (Write) | Tidak |
| `EP-PAY-04` | `DELETE`| `/api/payment-methods/:id` | Bearer JWT | Administrator, Admin | `paymentMethodController.delete` | `payment_methods` (Delete) | Tidak |

#### J. Logistik Messenger & Reimbursement (`messengerRoutes.ts`)
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target | Transaksi |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- | :---: |
| `EP-MSG-01` | `GET` | `/api/messenger/tasks` | Bearer JWT | All | `messengerController.getTasks` | In-memory / Derived from Orders | Tidak |
| `EP-MSG-02` | `POST` | `/api/messenger/reimbursements` | Bearer JWT | Messenger, Admin | `messengerController.createReimbursement` | `messenger_reimbursements` | Tidak |
| `EP-MSG-03` | `POST` | `/api/messenger/reimbursements/:id/pay` | Bearer JWT | Finance, Admin | `messengerController.payReimbursement` | `messenger_reimbursements`, `kas_kantor` | **Ya** |

#### K. Template Estimasi, Hak Akses, Notifikasi & Audit
| ID | Method | Path | Auth | Roles | Controller / Service | Tabel Target |
| :--- | :---: | :--- | :---: | :---: | :--- | :--- |
| `EP-EST-01` | `GET` | `/api/estimation/templates` | Bearer JWT | All | `estimationController.getTemplates` | `estimation_templates` |
| `EP-PRM-01` | `GET` | `/api/permissions` | Bearer JWT | All | `permissionController.getPermissions` | `role_permissions` |
| `EP-PRM-02` | `PUT` | `/api/permissions/:role` | Bearer JWT | Administrator | `permissionController.updatePermissions` | `role_permissions` |
| `EP-NOT-01` | `GET` | `/api/notifications/settings` | Bearer JWT | Administrator | `notificationController.getSettings` | `notification_settings` |
| `EP-NOT-02` | `GET` | `/api/notifications/logs` | Bearer JWT | Admin, SVP | `notificationController.getLogs` | `notification_logs` |
| `EP-AUD-01` | `GET` | `/api/audit-logs` | Bearer JWT | Administrator, SVP | `auditController.getLogs` | `audit_logs` |

---

### 3. Analisis Kontrak Interface Dorman (`src/api/endpoints/`)

Di frontend ditemukan 7 file interface kontrak dengan total **50 tanda tangan metode** yang tidak dipanggil oleh modul runtime manapun:

1. `customersApi.ts` (5 metode): `getCustomers`, `getCustomer`, `createCustomer`, `updateCustomer`, `deleteCustomer`.
2. `financeApi.ts` (12 metode): `getInvoices`, `createInvoice`, `recordPayment`, `getPnLReport`, `getLedgerSummary`, dsb.
3. `messengersApi.ts` (6 metode): `getTasks`, `assignTask`, `updateTaskStatus`, `submitProof`, dsb.
4. `notificationsApi.ts` (7 metode): `getNotifications`, `sendNotification`, `getTemplates`, dsb.
5. `ordersApi.ts` (7 metode): `getOrders`, `getOrder`, `createOrder`, `updateOrder`, `advanceOrder`, `rollbackOrder`, `archiveOrder`.
6. `usersApi.ts` (8 metode): `getUsers`, `getUser`, `createUser`, `updateUser`, `deleteUser`, `resetPassword`, dsb.
7. `vehiclesApi.ts` (5 metode): `getVehicles`, `getVehicle`, `registerVehicle`, `updateVehicle`, `getTaxHistory`.

**Temuan:**
- Seluruh file di atas memiliki komentar eksplisit: `NOTE: Future contract interface only. Not called at runtime during Phase 1.`
- Komponen UI sebenarnya memanggil backend melalui `src/data/api/api*Provider.ts` yang mengimplementasikan interface `src/data/mock/mock*Provider.ts`.
- **Rekomendasi:** Berikan penandaan arsip atau hapus kontrak dorman ini pada fase refaktor arsitektur guna mencegah developer baru mengira file tersebut aktif.
