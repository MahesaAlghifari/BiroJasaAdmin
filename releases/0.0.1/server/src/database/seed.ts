/**
 * Database Seeder
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "./db";
import { hashPassword } from "../utils/crypto";
import { createInitialOrders } from "../../../src/data/mock/orderMockData";
import { STAGES, StageName, OperationalOrder } from "../../../src/domain/order/types";
import { DEMO_CREDENTIALS } from "../../../src/data/repositories/userRepository";
import { pricingStore } from "../../../src/app/data/pricingStore";
import { tagihanData, kasKantorData } from "../../../src/app/data/financeDummyData";

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

  // 2. Seed Orders if table is empty
  const orderCountStmt = db.prepare("SELECT COUNT(*) as count FROM orders");
  const orderCount = (orderCountStmt.get() as { count: number }).count;

  if (orderCount === 0) {
    const initialOrdersRecord = createInitialOrders();
    const insertOrder = db.prepare(`
      INSERT INTO orders (
        order_no, customer, nomor_hp, layanan, nopol, current_step,
        current_stage_name, payment_status, total_biaya, is_archived,
        data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const stage of STAGES) {
      const orders = initialOrdersRecord[stage as StageName] || [];
      for (const order of orders) {
        insertOrder.run(
          order.orderNo,
          order.customer,
          order.nomorHP,
          order.layanan,
          order.nopol,
          order.currentStep || 1,
          order.currentStageName,
          order.payment?.statusPembayaran || "Belum Lunas",
          order.payment?.totalBiaya || 0,
          0,
          JSON.stringify(order),
          order.createdAt || new Date().toISOString(),
          new Date().toISOString()
        );
      }
    }
  }

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

  // 4. Seed Finance Invoices linked directly to Orders
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

  // 5. Seed Kas Kantor if table is empty
  const kasCountStmt = db.prepare("SELECT COUNT(*) as count FROM kas_kantor");
  const kasCount = (kasCountStmt.get() as { count: number }).count;

  if (kasCount === 0 && Array.isArray(kasKantorData) && kasKantorData.length > 0) {
    const insertKas = db.prepare(`
      INSERT INTO kas_kantor (tanggal, keterangan, status, debit, kredit, saldo)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of kasKantorData) {
      insertKas.run(
        item.tanggal,
        item.keterangan,
        item.status,
        item.debit || 0,
        item.kredit || 0,
        item.total || 0
      );
    }
  }
}

