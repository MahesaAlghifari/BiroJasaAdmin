/**
 * SQLite Order Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";
import { OperationalOrder, StageName, STAGES } from "../../../src/domain/order/types";

export class DbOrderRepository {
  private mapRowToOrder(row: any): OperationalOrder {
    let parsed: any = {};
    if (row.data_json) {
      try {
        parsed = JSON.parse(row.data_json);
      } catch (err) {
        console.warn(`[DbOrderRepository] Gagal parse data_json pada order ${row.order_no}:`, err);
      }
    }

    // 1. Kolom SQL fisik adalah sumber kanonis utama (Single Source of Truth)
    const orderNo = String(row.order_no || parsed.orderNo || "");
    const customer = row.customer !== null && row.customer !== undefined ? String(row.customer) : String(parsed.customer || "");
    const nomorHP = row.nomor_hp !== null && row.nomor_hp !== undefined ? String(row.nomor_hp) : String(parsed.nomorHP || parsed.nomor_hp || "");
    const layanan = row.layanan !== null && row.layanan !== undefined ? String(row.layanan) : String(parsed.layanan || "");
    const nopol = row.nopol !== null && row.nopol !== undefined ? String(row.nopol) : String(parsed.nopol || "");
    const currentStep = row.current_step !== null && row.current_step !== undefined ? Number(row.current_step) : Number(parsed.currentStep || 1);
    const currentStageName = row.current_stage_name !== null && row.current_stage_name !== undefined ? String(row.current_stage_name) : String(parsed.currentStageName || "Verifikasi");
    const paymentStatus = row.payment_status !== null && row.payment_status !== undefined ? String(row.payment_status) : String(parsed.payment?.statusPembayaran || parsed.payment_status || "Belum Lunas");
    const totalBiaya = row.total_biaya !== null && row.total_biaya !== undefined ? Number(row.total_biaya) : Number(parsed.payment?.totalBiaya ?? parsed.totalBiaya ?? 0);
    const biayaJasa = row.biaya_jasa !== null && row.biaya_jasa !== undefined ? Number(row.biaya_jasa) : Number(parsed.biayaJasa ?? 0);
    const biayaAntarJemput = row.biaya_antar_jemput !== null && row.biaya_antar_jemput !== undefined ? Number(row.biaya_antar_jemput) : Number(parsed.biayaAntarJemput ?? 0);
    const namaPenerimaKeluar = row.nama_penerima_keluar !== null && row.nama_penerima_keluar !== undefined ? String(row.nama_penerima_keluar) : (parsed.namaPenerimaKeluar || parsed.namaPemilikRekeningKeluar || "");
    const bankUangKeluar = row.bank_uang_keluar !== null && row.bank_uang_keluar !== undefined ? String(row.bank_uang_keluar) : (parsed.bankUangKeluar || "");
    const metodePembayaranKeluar = row.metode_pembayaran_keluar !== null && row.metode_pembayaran_keluar !== undefined ? String(row.metode_pembayaran_keluar) : (parsed.metodePembayaranKeluar || "");
    const alasanPending = row.alasan_pending !== null && row.alasan_pending !== undefined ? String(row.alasan_pending) : (parsed.alasan_pending || parsed.alasanPending || parsed.alasan || "");
    const createdAt = row.created_at ? String(row.created_at) : (parsed.createdAt || new Date().toISOString());
    const updatedAt = row.updated_at ? String(row.updated_at) : (parsed.updatedAt || new Date().toISOString());

    // 2. Evaluasi status arsip dan tahapan efektif
    let isArchived: boolean | number = false;
    let effectiveStageName = currentStageName;
    let effectiveStep = currentStep;

    if (row.is_archived === 1) {
      isArchived = true;
      if (!parsed.isCancelled && currentStageName !== "Dibatalkan" && parsed.status !== "Dibatalkan") {
        effectiveStageName = "Selesai (Arsip)";
        effectiveStep = 8;
      }
    } else if (row.is_archived === 2) {
      isArchived = 2;
    } else {
      isArchived = false;
    }

    // 3. Rekonsiliasi sub-objek payment
    const existingPayment = parsed.payment || {};
    const payment = {
      ...existingPayment,
      totalBiaya,
      statusPembayaran: paymentStatus as any,
    };

    return {
      ...parsed, // Pertahankan seluruh atribut dinamis dari JSON (alamat, timeline, dokumen, samsat, checklist, approver)
      orderNo,
      customer,
      nomorHP,
      layanan,
      nopol,
      currentStep: effectiveStep,
      currentStageName: effectiveStageName,
      isArchived,
      biayaJasa,
      biayaAntarJemput,
      namaPenerimaKeluar: namaPenerimaKeluar || undefined,
      bankUangKeluar: bankUangKeluar || undefined,
      metodePembayaranKeluar: metodePembayaranKeluar || undefined,
      alasan_pending: alasanPending || undefined,
      alasanPending: alasanPending || undefined,
      payment,
      createdAt,
      updatedAt,
      // Alias reporting kompatibilitas
      totalBiaya,
      total_biaya: totalBiaya,
      paymentStatus,
      payment_status: paymentStatus,
      biaya_jasa: biayaJasa,
      biaya_antar_jemput: biayaAntarJemput,
    };
  }

  public getAllFlat(archived = false): OperationalOrder[] {
    const stmt = db.prepare("SELECT * FROM orders WHERE is_archived = ? ORDER BY created_at DESC");
    const rows = stmt.all(archived ? 1 : 0) as any[];
    return rows.map((r) => this.mapRowToOrder(r));
  }

  public getActiveOrders(): Record<StageName, OperationalOrder[]> {
    const result: Record<StageName, OperationalOrder[]> = {
      "Verifikasi": [],
      "Penjadwalan": [],
      "Verifikasi Dokumen": [],
      "Proses Samsat": [],
      "Verifikasi Ulang": [],
      "Supervisi": [],
      "Pengantaran": [],
      "Dokumen Telah Diterima": [],
    };

    const orders = this.getAllFlat(false);
    for (const order of orders) {
      const stage = ((order as any).stageBeforeCancel || order.currentStageName) as StageName;
      if (result[stage]) {
        result[stage].push(order);
      }
    }
    return result;
  }

  public getArchivedOrders(): OperationalOrder[] {
    return this.getAllFlat(true);
  }

  public getByOrderNo(orderNo: string): OperationalOrder | undefined {
    const cleanNo = (orderNo || "").trim().toUpperCase();
    const stmt = db.prepare("SELECT * FROM orders WHERE UPPER(order_no) = ? OR order_no = ?");
    const row = stmt.get(cleanNo, orderNo) as any;
    if (!row) return undefined;
    return this.mapRowToOrder(row);
  }

  public getByStage(stage: StageName): OperationalOrder[] {
    const stmt = db.prepare("SELECT * FROM orders WHERE current_stage_name = ? AND is_archived = 0 ORDER BY created_at DESC");
    const rows = stmt.all(stage) as any[];
    return rows.map((r) => this.mapRowToOrder(r));
  }

  public saveOrder(order: OperationalOrder): void {
    if (this.getByOrderNo(order.orderNo)) {
      this.updateOrder(order.orderNo, order);
      return;
    }

    const biayaJasa = Number((order as any).biayaJasa || 0);
    const biayaAntarJemput = Number((order as any).biayaAntarJemput || 0);
    const namaPenerimaKeluar = (order as any).namaPenerimaKeluar || (order as any).namaPemilikRekeningKeluar || null;
    const bankUangKeluar = (order as any).bankUangKeluar || null;
    const metodePembayaranKeluar = (order as any).metodePembayaranKeluar || null;
    const alasanPending = (order as any).alasan_pending || (order as any).alasanPending || (order as any).alasan || null;
    const currentStep = Number(order.currentStep || 1);
    const currentStageName = String(order.currentStageName || "Verifikasi");
    const paymentStatus = String(order.payment?.statusPembayaran || "Belum Lunas");
    const totalBiaya = Number(order.payment?.totalBiaya ?? order.totalEstimasi ?? order.biayaJasa ?? 0);
    const isArchived = order.isArchived === true ? 1 : (order.isArchived === 2 ? 2 : 0);
    const createdAt = order.createdAt ? String(order.createdAt) : new Date().toISOString().split("T")[0];

    const synchronizedOrder: OperationalOrder = {
      ...order,
      orderNo: order.orderNo,
      customer: order.customer,
      nomorHP: order.nomorHP,
      layanan: order.layanan,
      nopol: order.nopol,
      currentStep,
      currentStageName,
      biayaJasa,
      biayaAntarJemput,
      namaPenerimaKeluar: namaPenerimaKeluar || undefined,
      bankUangKeluar: bankUangKeluar || undefined,
      metodePembayaranKeluar: metodePembayaranKeluar || undefined,
      alasan_pending: alasanPending || undefined,
      alasanPending: alasanPending || undefined,
      createdAt,
      payment: {
        ...(order.payment || {}),
        totalBiaya,
        statusPembayaran: paymentStatus as any,
      },
    };

    const stmt = db.prepare(`
      INSERT INTO orders (
        order_no, customer, nomor_hp, layanan, nopol, current_step,
        current_stage_name, payment_status, total_biaya, is_archived,
        biaya_jasa, biaya_antar_jemput, nama_penerima_keluar, bank_uang_keluar, metode_pembayaran_keluar,
        alasan_pending, data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      order.orderNo,
      order.customer,
      order.nomorHP,
      order.layanan,
      order.nopol,
      currentStep,
      currentStageName,
      paymentStatus,
      totalBiaya,
      isArchived,
      biayaJasa,
      biayaAntarJemput,
      namaPenerimaKeluar,
      bankUangKeluar,
      metodePembayaranKeluar,
      alasanPending,
      JSON.stringify(synchronizedOrder),
      createdAt
    );
  }

  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean {
    const existing = this.getByOrderNo(orderNo);
    if (!existing) return false;

    // Resolve nilai kanonis dari updates atau existing
    const resolvedCustomer = updates.customer !== undefined ? String(updates.customer).trim() : existing.customer;
    const resolvedNomorHP = updates.nomorHP !== undefined
      ? String(updates.nomorHP).trim()
      : ((updates as any).nomor_hp !== undefined ? String((updates as any).nomor_hp).trim() : existing.nomorHP);
    const resolvedLayanan = updates.layanan !== undefined ? String(updates.layanan).trim() : existing.layanan;
    const resolvedNopol = updates.nopol !== undefined ? String(updates.nopol).trim() : existing.nopol;
    const resolvedStep = updates.currentStep !== undefined ? Number(updates.currentStep) : existing.currentStep;
    const resolvedStageName = updates.currentStageName !== undefined ? String(updates.currentStageName) : existing.currentStageName;

    const resolvedPaymentStatus = updates.payment?.statusPembayaran !== undefined
      ? String(updates.payment.statusPembayaran)
      : ((updates as any).payment_status !== undefined
          ? String((updates as any).payment_status)
          : (existing.payment?.statusPembayaran || "Belum Lunas"));

    const resolvedTotalBiaya = updates.payment?.totalBiaya !== undefined
      ? Number(updates.payment.totalBiaya)
      : ((updates as any).total_biaya !== undefined
          ? Number((updates as any).total_biaya)
          : Number(existing.payment?.totalBiaya ?? 0));

    const resolvedBiayaJasa = (updates as any).biayaJasa !== undefined
      ? Number((updates as any).biayaJasa)
      : ((updates as any).biaya_jasa !== undefined
          ? Number((updates as any).biaya_jasa)
          : Number((existing as any).biayaJasa || 0));

    const resolvedBiayaAntarJemput = (updates as any).biayaAntarJemput !== undefined
      ? Number((updates as any).biayaAntarJemput)
      : ((updates as any).biaya_antar_jemput !== undefined
          ? Number((updates as any).biaya_antar_jemput)
          : Number((existing as any).biayaAntarJemput || 0));

    const resolvedNamaPenerimaKeluar = (updates as any).namaPenerimaKeluar !== undefined
      ? (updates as any).namaPenerimaKeluar
      : ((updates as any).namaPemilikRekeningKeluar !== undefined
          ? (updates as any).namaPemilikRekeningKeluar
          : ((existing as any).namaPenerimaKeluar || null));

    const resolvedBankUangKeluar = (updates as any).bankUangKeluar !== undefined
      ? (updates as any).bankUangKeluar
      : ((existing as any).bankUangKeluar || null);

    const resolvedMetodePembayaranKeluar = (updates as any).metodePembayaranKeluar !== undefined
      ? (updates as any).metodePembayaranKeluar
      : ((existing as any).metodePembayaranKeluar || null);

    const resolvedAlasanPending = (updates as any).alasan_pending !== undefined
      ? (updates as any).alasan_pending
      : ((updates as any).alasanPending !== undefined
          ? (updates as any).alasanPending
          : ((updates as any).alasan !== undefined
              ? (updates as any).alasan
              : ((existing as any).alasan_pending || (existing as any).alasanPending || (existing as any).alasan || null)));

    const synchronizedMerged: OperationalOrder = {
      ...existing,
      ...updates,
      customer: resolvedCustomer,
      nomorHP: resolvedNomorHP,
      layanan: resolvedLayanan,
      nopol: resolvedNopol,
      currentStep: resolvedStep,
      currentStageName: resolvedStageName,
      biayaJasa: resolvedBiayaJasa,
      biayaAntarJemput: resolvedBiayaAntarJemput,
      namaPenerimaKeluar: resolvedNamaPenerimaKeluar || undefined,
      bankUangKeluar: resolvedBankUangKeluar || undefined,
      metodePembayaranKeluar: resolvedMetodePembayaranKeluar || undefined,
      alasan_pending: resolvedAlasanPending || undefined,
      alasanPending: resolvedAlasanPending || undefined,
      payment: {
        ...(existing.payment || {}),
        ...(updates.payment || {}),
        totalBiaya: resolvedTotalBiaya,
        statusPembayaran: resolvedPaymentStatus as any,
      },
    };

    const stmt = db.prepare(`
      UPDATE orders SET
        customer = ?,
        nomor_hp = ?,
        layanan = ?,
        nopol = ?,
        current_step = ?,
        current_stage_name = ?,
        payment_status = ?,
        total_biaya = ?,
        biaya_jasa = ?,
        biaya_antar_jemput = ?,
        nama_penerima_keluar = ?,
        bank_uang_keluar = ?,
        metode_pembayaran_keluar = ?,
        alasan_pending = ?,
        data_json = ?,
        updated_at = datetime('now')
      WHERE order_no = ?
    `);

    const res = stmt.run(
      resolvedCustomer,
      resolvedNomorHP,
      resolvedLayanan,
      resolvedNopol,
      resolvedStep,
      resolvedStageName,
      resolvedPaymentStatus,
      resolvedTotalBiaya,
      resolvedBiayaJasa,
      resolvedBiayaAntarJemput,
      resolvedNamaPenerimaKeluar,
      resolvedBankUangKeluar,
      resolvedMetodePembayaranKeluar,
      resolvedAlasanPending,
      JSON.stringify(synchronizedMerged),
      orderNo
    );

    return res.changes > 0;
  }

  public advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    const existing = this.getByOrderNo(orderNo);
    if (!existing) return false;

    const stageIndex = (STAGES as readonly string[]).indexOf(targetStage);
    const newStep = stageIndex >= 0 ? stageIndex + 1 : existing.currentStep;

    const nowIso = new Date().toISOString();
    const eventDates: Partial<OperationalOrder> = {};
    if (newStep >= 3 && !existing.tanggalMasukBerkas && !updates.tanggalMasukBerkas) {
      eventDates.tanggalMasukBerkas = nowIso;
    }
    if (newStep >= 5 && !existing.tanggalProsesSamsat && !updates.tanggalProsesSamsat) {
      eventDates.tanggalProsesSamsat = nowIso;
    }
    if (updates.tanggalPengeluaranSamsat) {
      eventDates.tanggalPengeluaranSamsat = updates.tanggalPengeluaranSamsat;
    }

    const stageDefaults: Partial<OperationalOrder> = {};
    if (targetStage === "Proses Samsat" && !existing.samsatStatus && !updates.samsatStatus) {
      stageDefaults.samsatStatus = "Belum Terjadwal";
      stageDefaults.isSamsatScheduled = false;
    }

    return this.updateOrder(orderNo, {
      ...updates,
      ...eventDates,
      ...stageDefaults,
      currentStageName: targetStage,
      currentStep: newStep,
    });
  }

  public rollbackOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    return this.advanceOrder(orderNo, targetStage, updates);
  }

  public archiveOrder(orderNo: string): boolean {
    const existing = this.getByOrderNo(orderNo);
    if (!existing) return false;

    const isCancelled = existing.isCancelled || existing.currentStageName === "Dibatalkan";
    const synchronizedJson = {
      ...existing,
      isArchived: true,
      currentStageName: isCancelled ? "Dibatalkan" : "Selesai (Arsip)",
      currentStep: isCancelled ? existing.currentStep : 8,
    };

    const stmt = db.prepare("UPDATE orders SET is_archived = 1, data_json = ?, updated_at = datetime('now') WHERE order_no = ?");
    const res = stmt.run(JSON.stringify(synchronizedJson), orderNo);
    return res.changes > 0;
  }

  public deleteArchivedOrder(orderNo: string): boolean {
    const existing = this.getByOrderNo(orderNo);
    const synchronizedJson = existing ? JSON.stringify({ ...existing, isArchived: 2 }) : null;
    const stmt = synchronizedJson
      ? db.prepare("UPDATE orders SET is_archived = 2, data_json = ?, updated_at = datetime('now') WHERE order_no = ? AND is_archived = 1")
      : db.prepare("UPDATE orders SET is_archived = 2, updated_at = datetime('now') WHERE order_no = ? AND is_archived = 1");
    const res = synchronizedJson ? stmt.run(synchronizedJson, orderNo) : stmt.run(orderNo);
    return res.changes > 0;
  }

  public clearArchivedOrders(): number {
    const stmt = db.prepare("UPDATE orders SET is_archived = 2, updated_at = datetime('now') WHERE is_archived = 1");
    const res = stmt.run();
    return res.changes;
  }
}

export const dbOrderRepository = new DbOrderRepository();
