/**
 * SQLite Order Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";
import { OperationalOrder, StageName, STAGES } from "../../../src/domain/order/types";

export class DbOrderRepository {
  public getAllFlat(archived = false): OperationalOrder[] {
    const stmt = db.prepare("SELECT data_json FROM orders WHERE is_archived = ? ORDER BY created_at DESC");
    const rows = stmt.all(archived ? 1 : 0) as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as OperationalOrder);
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
      const stage = order.currentStageName as StageName;
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
    const stmt = db.prepare("SELECT data_json FROM orders WHERE order_no = ?");
    const row = stmt.get(orderNo) as { data_json: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.data_json) as OperationalOrder;
  }

  public getByStage(stage: StageName): OperationalOrder[] {
    const stmt = db.prepare("SELECT data_json FROM orders WHERE current_stage_name = ? AND is_archived = 0 ORDER BY created_at DESC");
    const rows = stmt.all(stage) as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as OperationalOrder);
  }

  public saveOrder(order: OperationalOrder): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO orders (
        order_no, customer, nomor_hp, layanan, nopol, current_step,
        current_stage_name, payment_status, total_biaya, is_archived,
        data_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
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
      order.createdAt || new Date().toISOString()
    );
  }

  public updateOrder(orderNo: string, updates: Partial<OperationalOrder>): boolean {
    const existing = this.getByOrderNo(orderNo);
    if (!existing) return false;

    const merged: OperationalOrder = {
      ...existing,
      ...updates,
      payment: updates.payment ? { ...existing.payment, ...updates.payment } : existing.payment,
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
        data_json = ?,
        updated_at = datetime('now')
      WHERE order_no = ?
    `);

    const res = stmt.run(
      merged.customer,
      merged.nomorHP,
      merged.layanan,
      merged.nopol,
      merged.currentStep || 1,
      merged.currentStageName,
      merged.payment?.statusPembayaran || "Belum Lunas",
      merged.payment?.totalBiaya || 0,
      JSON.stringify(merged),
      orderNo
    );

    return res.changes > 0;
  }

  public advanceOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    const existing = this.getByOrderNo(orderNo);
    if (!existing) return false;

    const stageIndex = (STAGES as readonly string[]).indexOf(targetStage);
    const newStep = stageIndex >= 0 ? stageIndex + 1 : existing.currentStep;

    return this.updateOrder(orderNo, {
      ...updates,
      currentStageName: targetStage,
      currentStep: newStep,
    });
  }

  public rollbackOrder(orderNo: string, targetStage: StageName, updates: Partial<OperationalOrder> = {}): boolean {
    return this.advanceOrder(orderNo, targetStage, updates);
  }

  public archiveOrder(orderNo: string): boolean {
    const stmt = db.prepare("UPDATE orders SET is_archived = 1, updated_at = datetime('now') WHERE order_no = ?");
    const res = stmt.run(orderNo);
    return res.changes > 0;
  }
}

export const dbOrderRepository = new DbOrderRepository();
