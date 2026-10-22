/**
 * Database Seeder
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "./db";
import { hashPassword } from "../utils/crypto";
import { DEMO_CREDENTIALS } from "../../../src/data/repositories/userRepository";
import { pricingStore } from "../../../src/app/data/pricingStore";
import { tagihanData, kasKantorData, pengeluaranKantorData } from "../../../src/app/data/financeDummyData";
import {
  DEFAULT_R4_ANNUAL_TEMPLATE,
  DEFAULT_R2_ANNUAL_TEMPLATE,
  DEFAULT_R4_5YEAR_TEMPLATE,
  DEFAULT_R2_5YEAR_TEMPLATE,
  DEFAULT_R4_BBN_TEMPLATE,
  DEFAULT_R2_BBN_TEMPLATE,
  DEFAULT_R4_MUTASI_AS_TEMPLATE,
  DEFAULT_R2_MUTASI_AS_TEMPLATE,
  DEFAULT_R4_MUTASI_LD_TEMPLATE,
  DEFAULT_R2_MUTASI_LD_TEMPLATE,
} from "../../../src/domain/estimation/defaultTemplates";
import { sanitizeEstimationTemplate } from "../../../src/app/data/estimationStore";
import { WILAYAH_ADMINISTRATIF_LIST, SAMSAT_OFFICES_514 } from "./wilayahData";
import { CANONICAL_PERMISSIONS } from "../config/defaultPermissions";

export function seedDatabase(): void {
  // 1. Seed Users if table is empty
  const userCountStmt = db.prepare("SELECT COUNT(*) as count FROM users");
  const userCount = (userCountStmt.get() as { count: number }).count;

  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (email, password_hash, password_salt, nama, jabatan, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const usersToSeed = [
      {
        email: DEMO_CREDENTIALS.administrator.email,
        password: DEMO_CREDENTIALS.administrator.password,
        nama: DEMO_CREDENTIALS.administrator.name,
        jabatan: "SVP",
        status: "Aktif",
      },
      {
        email: DEMO_CREDENTIALS.admin.email,
        password: DEMO_CREDENTIALS.admin.password,
        nama: DEMO_CREDENTIALS.admin.name,
        jabatan: "ADMIN",
        status: "Aktif",
      },
      {
        email: DEMO_CREDENTIALS.finance.email,
        password: DEMO_CREDENTIALS.finance.password,
        nama: DEMO_CREDENTIALS.finance.name,
        jabatan: "FINANCE",
        status: "Aktif",
      },
      {
        email: DEMO_CREDENTIALS.messenger1.email,
        password: DEMO_CREDENTIALS.messenger1.password,
        nama: DEMO_CREDENTIALS.messenger1.name,
        jabatan: "MESSENGER",
        status: "Aktif",
      },
      {
        email: DEMO_CREDENTIALS.messenger2.email,
        password: DEMO_CREDENTIALS.messenger2.password,
        nama: DEMO_CREDENTIALS.messenger2.name,
        jabatan: "MESSENGER",
        status: "Aktif",
      },
      {
        email: DEMO_CREDENTIALS.messenger.email,
        password: DEMO_CREDENTIALS.messenger.password,
        nama: DEMO_CREDENTIALS.messenger.name,
        jabatan: "MESSENGER",
        status: "Aktif",
      },
    ];

    for (const u of usersToSeed) {
      const { hash, salt } = hashPassword(u.password);
      insertUser.run(u.email, hash, salt, u.nama, u.jabatan, u.status);
    }
  }

  // 2. Orders: Start completely clean with 0 dummy orders
  // The system initiates with an empty operational order book as requested.

  // 3. Seed Samsat Pricing if table is empty
  const pricingCountStmt = db.prepare("SELECT COUNT(*) as count FROM samsat_pricing");
  const pricingCount = (pricingCountStmt.get() as { count: number }).count;

  if (pricingCount === 0) {
    const samsatItems = pricingStore.getSamsatItems();
    if (Array.isArray(samsatItems) && samsatItems.length > 0) {
      const insertPricing = db.prepare(`
        INSERT INTO samsat_pricing (id, nama_item, kategori, tipe_kendaraan, biaya_dasar, deskripsi, data_json)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of samsatItems) {
        insertPricing.run(
          item.id,
          item.name || "Item Samsat",
          item.category || "Layanan Standar",
          "Mobil",
          item.basePrice || 0,
          item.description || "",
          JSON.stringify(item)
        );
      }
    }
  }

  // 4. Seed Estimation Templates if table is empty, or migrate existing templates
  const estimationCountStmt = db.prepare("SELECT COUNT(*) as count FROM estimation_templates");
  const estimationCount = (estimationCountStmt.get() as { count: number }).count;

  if (estimationCount === 0) {
    const templatesToSeed = [
      DEFAULT_R4_ANNUAL_TEMPLATE,
      DEFAULT_R2_ANNUAL_TEMPLATE,
      DEFAULT_R4_5YEAR_TEMPLATE,
      DEFAULT_R2_5YEAR_TEMPLATE,
      DEFAULT_R4_BBN_TEMPLATE,
      DEFAULT_R2_BBN_TEMPLATE,
      DEFAULT_R4_MUTASI_AS_TEMPLATE,
      DEFAULT_R2_MUTASI_AS_TEMPLATE,
      DEFAULT_R4_MUTASI_LD_TEMPLATE,
      DEFAULT_R2_MUTASI_LD_TEMPLATE,
    ].map(sanitizeEstimationTemplate);

    const insertTemplate = db.prepare(`
      INSERT INTO estimation_templates (id, name, service_type, tipe_kendaraan, koefisien_denda, data_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    for (const tpl of templatesToSeed) {
      insertTemplate.run(
        tpl.id,
        tpl.name,
        tpl.serviceType,
        tpl.vehicleType,
        tpl.koefisienDenda,
        JSON.stringify(tpl)
      );
    }
  } else {
    // Auto-migrate existing templates in SQLite to remove any legacy Excel cell references safely
    try {
      const selectStmt = db.prepare("SELECT id, data_json FROM estimation_templates");
      const rows = selectStmt.all() as { id: string; data_json: string }[];
      const updateStmt = db.prepare("UPDATE estimation_templates SET data_json = ?, updated_at = datetime('now') WHERE id = ?");

      for (const row of rows) {
        try {
          const parsed = JSON.parse(row.data_json);
          const sanitized = sanitizeEstimationTemplate(parsed);
          const cleanJson = JSON.stringify(sanitized);
          if (cleanJson !== row.data_json) {
            updateStmt.run(cleanJson, row.id);
          }
        } catch {
          // ignore individual parse errors
        }
      }
    } catch {
      // non-fatal
    }
  }

  // 5. Seed Finance Invoices linked directly to Orders
  const invoiceCountStmt = db.prepare("SELECT COUNT(*) as count FROM finance_invoices");
  const invoiceCount = (invoiceCountStmt.get() as { count: number }).count;

  if (invoiceCount === 0) {
    const ordersStmt = db.prepare("SELECT data_json FROM orders");
    const orderRows = ordersStmt.all() as { data_json: string }[];
    const insertInvoice = db.prepare(`
      INSERT INTO finance_invoices (invoice_no, order_no, customer, layanan, status, total_tagihan, dibayar, sisa, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let invIdx = 1;
    for (const row of orderRows) {
      const ord = JSON.parse(row.data_json);
      const invNo = ord.payment?.invoiceNo || `INV-${ord.orderNo}`;
      const total = ord.payment?.totalBiaya || 1500000;
      const dibayar = ord.payment?.dibayar || (ord.payment?.statusPembayaran === "Lunas" ? total : 0);
      const sisa = Math.max(0, total - dibayar);
      const status = sisa === 0 ? "PAID" : "UNPAID";

      const invoiceRecord = {
        id: invIdx++,
        invoiceNo: invNo,
        orderNo: ord.orderNo,
        customer: ord.customer,
        layanan: ord.layanan,
        nopol: ord.nopol,
        status,
        totalTagihan: total,
        dibayar,
        sisa,
        jatuhTempo: "2026-10-15",
        tanggalInvoice: ord.createdAt || "2026-10-01",
      };

      insertInvoice.run(
        invNo,
        ord.orderNo,
        ord.customer,
        ord.layanan,
        status,
        total,
        dibayar,
        sisa,
        JSON.stringify(invoiceRecord)
      );
    }
  }

  // 5. Kas Kantor: Starts clean with 0 dummy records (Realized from confirmed transactions)
  // 6. Pengeluaran: Starts clean with 0 dummy records (Recorded from actual expenses)

  // 7. Seed Wilayah Administratif (514 Kabupaten/Kota di 38 Provinsi) if empty
  const wilayahCountStmt = db.prepare("SELECT COUNT(*) as count FROM wilayah_administratif");
  const wilayahCount = (wilayahCountStmt.get() as { count: number }).count;

  if (wilayahCount === 0) {
    const insertWilayah = db.prepare(`
      INSERT OR REPLACE INTO wilayah_administratif (
        kode_kabupaten_kota, kode_provinsi, nama_provinsi, nama_kabupaten_kota,
        jenis_wilayah, status_aktif, sumber_referensi, tahun_referensi, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const seedTx = db.transaction(() => {
      for (const item of WILAYAH_ADMINISTRATIF_LIST) {
        insertWilayah.run(
          item.kode_kabupaten_kota,
          item.kode_provinsi,
          item.nama_provinsi,
          item.nama_kabupaten_kota,
          item.jenis_wilayah,
          item.status_aktif ? 1 : 0,
          item.sumber_referensi,
          item.tahun_referensi
        );
      }
    });
    seedTx();
  }

  // 8. Seed Samsat Offices (514 Samsat linked to Kemendagri codes)
  const samsatOfficeCountStmt = db.prepare("SELECT COUNT(*) as count FROM samsat_offices");
  const samsatOfficeCount = (samsatOfficeCountStmt.get() as { count: number }).count;

  if (samsatOfficeCount < 514) {
    const insertSamsatOffice = db.prepare(`
      INSERT OR REPLACE INTO samsat_offices (
        id, name, wilayah, alamat, kode_kabupaten_kota, is_verified, status_aktif, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const samsatTx = db.transaction(() => {
      for (const office of SAMSAT_OFFICES_514) {
        insertSamsatOffice.run(
          office.id,
          office.name,
          office.wilayah,
          office.alamat,
          office.kode_kabupaten_kota,
          1,
          1
        );
      }
    });
    samsatTx();
  }

  // 6. Seed default notification_settings if empty
  const notifCountStmt = db.prepare("SELECT COUNT(*) as count FROM notification_settings");
  const notifCount = (notifCountStmt.get() as { count: number }).count;
  if (notifCount === 0) {
    db.prepare(`
      INSERT INTO notification_settings (id, recipient_emails, notify_tagihan_reminder, notify_tagihan_perubahan, notify_order_update, notify_proses_gagal, updated_by)
      VALUES ('global', ?, 1, 1, 1, 1, 'system')
    `).run(JSON.stringify(["admin@sunbirojasa.com"]));
  }

  // 7. Seed default role_permissions if empty
  const permCountStmt = db.prepare("SELECT COUNT(*) as count FROM role_permissions");
  const permCount = (permCountStmt.get() as { count: number }).count;
  if (permCount === 0) {
    const insertPerm = db.prepare(`
      INSERT INTO role_permissions (role, permissions_json, updated_by)
      VALUES (?, ?, 'system')
    `);
    // Seed manageable roles (admin, finance, messenger)
    const seedRoles = ["admin", "finance", "messenger"];
    for (const roleKey of seedRoles) {
      if (CANONICAL_PERMISSIONS[roleKey]) {
        insertPerm.run(roleKey, JSON.stringify(CANONICAL_PERMISSIONS[roleKey]));
      }
    }
  }

  // 8. Seed default payment_methods if empty
  try {
    const pmCountStmt = db.prepare("SELECT COUNT(*) as count FROM payment_methods");
    const pmCount = (pmCountStmt.get() as { count: number }).count;
    if (pmCount === 0) {
      const insertPm = db.prepare(`
        INSERT INTO payment_methods (id, nama_metode, bank, nama_rekening, nomor_rekening, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);
      const initialMethods = [
        { id: "pm-bca", nama_metode: "Transfer BCA", bank: "BCA", nama_rekening: "PT Biro Jasa SUN89 Abadi", nomor_rekening: "772-019-2831", status: "Aktif" },
        { id: "pm-bri", nama_metode: "Transfer BRI", bank: "BRI", nama_rekening: "PT Biro Jasa SUN89 Abadi", nomor_rekening: "0123-01-001234-56-7", status: "Aktif" },
        { id: "pm-mandiri", nama_metode: "Transfer Mandiri", bank: "Mandiri", nama_rekening: "PT Biro Jasa SUN89 Abadi", nomor_rekening: "133-00-1928374-1", status: "Aktif" },
        { id: "pm-cash", nama_metode: "Cash", bank: "Tunai", nama_rekening: "", nomor_rekening: "", status: "Aktif" },
        { id: "pm-qris", nama_metode: "QRIS", bank: "QRIS", nama_rekening: "Biro Jasa SUN89", nomor_rekening: "ID936005230001889", status: "Aktif" },
      ];
      for (const m of initialMethods) {
        insertPm.run(m.id, m.nama_metode, m.bank, m.nama_rekening, m.nomor_rekening, m.status);
      }
    }
  } catch (err) {
    console.error("Error seeding payment_methods:", err);
  }
}

