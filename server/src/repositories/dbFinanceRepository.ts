/**
 * SQLite Finance Repository
 * Admin SUN89 — Biro Jasa Management System
 */

import { db } from "../database/db";
import { InvoiceBillingRecord, KasKantorItem, PengeluaranItem } from "../../../src/domain/finance/types";

export class DbFinanceRepository {
  public getAllInvoices(): InvoiceBillingRecord[] {
    const stmt = db.prepare("SELECT data_json FROM finance_invoices ORDER BY id DESC");
    const rows = stmt.all() as { data_json: string }[];
    return rows.map((r) => JSON.parse(r.data_json) as InvoiceBillingRecord);
  }

  public getInvoiceById(id: number): InvoiceBillingRecord | undefined {
    const stmt = db.prepare("SELECT data_json FROM finance_invoices WHERE id = ?");
    const row = stmt.get(id) as { data_json: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.data_json) as InvoiceBillingRecord;
  }

  public getInvoiceByOrderNo(orderNo: string): InvoiceBillingRecord | undefined {
    const stmt = db.prepare("SELECT data_json FROM finance_invoices WHERE order_no = ?");
    const row = stmt.get(orderNo) as { data_json: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.data_json) as InvoiceBillingRecord;
  }

  public getInvoiceByNo(invoiceNo: string): InvoiceBillingRecord | undefined {
    const stmt = db.prepare("SELECT data_json FROM finance_invoices WHERE invoice_no = ?");
    const row = stmt.get(invoiceNo) as { data_json: string } | undefined;
    if (!row) return undefined;
    return JSON.parse(row.data_json) as InvoiceBillingRecord;
  }

  public saveInvoice(invoice: InvoiceBillingRecord): number {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO finance_invoices (
        id, invoice_no, order_no, customer, layanan, status,
        total_tagihan, dibayar, sisa, data_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const res = stmt.run(
      invoice.id,
      invoice.invoiceNo,
      invoice.orderNo,
      invoice.customer,
      invoice.layanan,
      invoice.status,
      invoice.totalTagihan,
      invoice.dibayar,
      invoice.sisa,
      JSON.stringify(invoice)
    );

    return Number(res.lastInsertRowid);
  }

  public updateInvoice(id: number, updates: Partial<InvoiceBillingRecord>): boolean {
    const existing = this.getInvoiceById(id);
    if (!existing) return false;

    const merged: InvoiceBillingRecord = { ...existing, ...updates };

    const stmt = db.prepare(`
      UPDATE finance_invoices SET
        status = ?,
        dibayar = ?,
        sisa = ?,
        data_json = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `);

    const res = stmt.run(
      merged.status,
      merged.dibayar,
      merged.sisa,
      JSON.stringify(merged),
      id
    );

    return res.changes > 0;
  }

  public getAllKasKantor(): KasKantorItem[] {
    const stmt = db.prepare("SELECT * FROM kas_kantor ORDER BY id DESC");
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      status: r.status,
      debit: r.debit,
      kredit: r.kredit,
      saldo: r.saldo,
      total: r.saldo,
      penanggungJawab: r.penanggung_jawab || undefined,
    })) as unknown as KasKantorItem[];
  }

  public addKasKantor(item: Omit<KasKantorItem, "id">): KasKantorItem {
    const lastStmt = db.prepare("SELECT saldo FROM kas_kantor ORDER BY id DESC LIMIT 1");
    const lastRow = lastStmt.get() as { saldo: number } | undefined;
    const lastSaldo = lastRow ? lastRow.saldo : 15000000;

    const isDebit = item.status === "Pemasukan" || item.status === "Debit";
    const newSaldo = isDebit 
      ? lastSaldo + item.debit 
      : lastSaldo - item.kredit;

    const insertStmt = db.prepare(`
      INSERT INTO kas_kantor (tanggal, keterangan, status, debit, kredit, saldo, penanggung_jawab)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const res = insertStmt.run(
      item.tanggal,
      item.keterangan,
      item.status,
      item.debit,
      item.kredit,
      newSaldo,
      item.penanggungJawab || null
    );

    return {
      id: Number(res.lastInsertRowid),
      tanggal: item.tanggal,
      keterangan: item.keterangan,
      status: item.status,
      debit: item.debit,
      kredit: item.kredit,
      saldo: newSaldo,
      total: newSaldo,
      penanggungJawab: item.penanggungJawab,
    } as unknown as KasKantorItem;
  }

  public getAllPengeluaran(): PengeluaranItem[] {
    const stmt = db.prepare("SELECT * FROM pengeluaran ORDER BY id DESC");
    const rows = stmt.all() as any[];
    return rows.map((r) => ({
      id: r.id,
      tanggal: r.tanggal,
      keterangan: r.keterangan,
      nominal: r.nominal,
      penanggungJawab: r.penanggung_jawab || undefined,
    })) as PengeluaranItem[];
  }

  public addPengeluaran(item: Omit<PengeluaranItem, "id">): PengeluaranItem {
    const insertStmt = db.prepare(`
      INSERT INTO pengeluaran (tanggal, keterangan, nominal, penanggung_jawab)
      VALUES (?, ?, ?, ?)
    `);

    const res = insertStmt.run(
      item.tanggal,
      item.keterangan,
      item.nominal,
      item.penanggungJawab || null
    );

    return {
      id: Number(res.lastInsertRowid),
      tanggal: item.tanggal,
      keterangan: item.keterangan,
      nominal: item.nominal,
      penanggungJawab: item.penanggungJawab,
    };
  }
}

export const dbFinanceRepository = new DbFinanceRepository();
