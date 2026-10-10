/**
 * Real API Finance Data Provider
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Implements IFinanceDataProvider connecting to the Express REST API.
 * Keeps an in-memory cache synchronized with the backend (/api/finance)
 * and handles optimistic updates with deterministic rollback on failure.
 */

import {
  InvoiceBillingRecord,
  ProfitItem,
  KasKantorItem,
  KasMessengerItem,
  PengeluaranItem,
} from "../../domain/finance/types";
import { IFinanceDataProvider } from "../mock/mockFinanceProvider";
import { isFullyPaid, toFinancePaymentStatus, toCanonicalPaymentStatus } from "../../domain/finance/paymentMapping";
import { APP_CONFIG } from "../../app/config/appConfig";

export class ApiFinanceProvider implements IFinanceDataProvider {
  private baseUrl: string;
  private invoices: InvoiceBillingRecord[] = [];
  private kasKantor: KasKantorItem[] = [];
  private kasMessenger: KasMessengerItem[] = [];
  private pengeluaran: PengeluaranItem[] = [];
  private profitData: ProfitItem[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;
  private isLoadingState = false;
  private lastError: Error | null = null;

  constructor(baseUrl = APP_CONFIG.apiBaseUrl) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.initFromApi();
  }

  private getAuthHeader(): Record<string, string> {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const token = window.localStorage.getItem("auth_token");
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      }
      if (typeof process !== "undefined" && process.env?.AUTH_TOKEN) {
        return { Authorization: `Bearer ${process.env.AUTH_TOKEN}` };
      }
    } catch {
      // ignore in non-browser env
    }
    return {};
  }

  private normalizeInvoice(inv: any): InvoiceBillingRecord {
    const totalTagihan = Number(inv.totalTagihan ?? inv.total_tagihan ?? 0);
    const dibayar = Number(inv.dibayar ?? inv.terbayar ?? 0);
    const sisa = inv.sisa !== undefined ? Number(inv.sisa) : Math.max(0, totalTagihan - dibayar);
    const canonicalStatus = toCanonicalPaymentStatus(inv.status, totalTagihan, dibayar);
    const financeStatus = toFinancePaymentStatus(canonicalStatus);

    return {
      id: Number(inv.id),
      invoiceNo: inv.invoiceNo || inv.invoice_no || inv.invoice || `INV-${inv.id}`,
      orderNo: inv.orderNo || inv.order_no,
      customer: inv.customer || "Pelanggan",
      layanan: inv.layanan || inv.jenisLayanan || "Layanan Samsat",
      jenisLayanan: inv.jenisLayanan || inv.layanan || "Layanan Samsat",
      nopol: inv.nopol || "-",
      totalTagihan,
      terbayar: dibayar,
      dibayar,
      sisa,
      status: financeStatus,
      tanggal: inv.tanggal || inv.tanggalInvoice || inv.createdAt || new Date().toLocaleDateString("id-ID"),
      jatuhTempo: inv.jatuhTempo || "2026-10-15",
      invoice: inv.invoice || inv.invoiceNo || `INV-${inv.id}`,
      phone: inv.phone || inv.nomorHp,
      email: inv.email,
      alamat: inv.alamat,
      biayaSamsat: inv.biayaSamsat || Math.round(totalTagihan * 0.75),
      profit: inv.profit || Math.round(totalTagihan * 0.25),
      profitStatus: isFullyPaid(financeStatus) ? "REALIZED" : "PENDING",
      cashback: inv.cashback || 0,
      cashbackStatus: isFullyPaid(financeStatus) ? "REALIZED" : "PENDING",
      isCashRealized: dibayar > 0,
      cashRecordedAmount: dibayar,
      metodePembayaran: inv.metodePembayaran || (dibayar > 0 ? "Transfer Bank" : "Tempo"),
      bank: inv.bank || (dibayar > 0 ? "BCA" : "Kas Kantor"),
      billingStatus: isFullyPaid(financeStatus) ? "COMPLETED" : "ACTIVE",
      settlementCondition: inv.settlementCondition,
      refundStatus: inv.refundStatus,
      overpayment: inv.overpayment,
    };
  }

  public async initFromApi(): Promise<void> {
    this.isLoadingState = true;
    this.lastError = null;
    try {
      const invRes = await fetch(`${this.baseUrl}/finance/invoices`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });
      if (!invRes.ok) {
        throw new Error(`Gagal memuat invoice dari server (HTTP ${invRes.status})`);
      }
      const payload = await invRes.json();
      if (payload.success && Array.isArray(payload.data)) {
        this.invoices = payload.data.map((inv: any) => this.normalizeInvoice(inv));
        this.deriveProfitFromInvoices();
      }

      const kasRes = await fetch(`${this.baseUrl}/finance/kas-kantor`, {
        headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      });
      if (kasRes.ok) {
        const kasPayload = await kasRes.json();
        if (kasPayload.success && Array.isArray(kasPayload.data)) {
          this.kasKantor = kasPayload.data.map((k: any) => ({
            id: Number(k.id),
            tanggal: k.tanggal,
            keterangan: k.keterangan,
            status: k.status,
            debit: Number(k.debit || 0),
            kredit: Number(k.kredit || 0),
            total: Number(k.total ?? k.saldo ?? 0),
            saldo: Number(k.saldo ?? k.total ?? 0),
          }));
        }
      }

      this.isInitialized = true;
      this.isLoadingState = false;
      this.notify();
    } catch (err: any) {
      this.isLoadingState = false;
      this.lastError = err instanceof Error ? err : new Error(String(err));
      this.notify();
      // In API mode, do NOT silently inject mock fixtures on error!
    }
  }

  private deriveProfitFromInvoices(): void {
    this.profitData = this.invoices
      .filter((inv) => isFullyPaid(inv.status))
      .map((inv, idx) => ({
        id: idx + 1,
        tanggal: inv.tanggal,
        customer: inv.customer,
        nopol: inv.nopol,
        pengurusan: inv.jenisLayanan,
        uangMasuk: inv.totalTagihan,
        biayaSamsat: inv.biayaSamsat || Math.round(inv.totalTagihan * 0.75),
        profit: inv.profit || Math.round(inv.totalTagihan * 0.25),
        namaBerkas: (inv as any).namaBerkas || inv.customer,
        rekening: inv.bank || "BCA",
        tanggalTTB: inv.tanggal,
        ttb: "-",
        status: "Selesai",
        invoice: inv.invoice || inv.invoiceNo || "-",
      }));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error("ApiFinanceProvider listener error:", err);
      }
    });
  }

  public isLoading(): boolean {
    return this.isLoadingState;
  }

  public getError(): Error | null {
    return this.lastError;
  }

  public getInvoices(): InvoiceBillingRecord[] {
    return this.invoices;
  }

  public getTagihanList(): InvoiceBillingRecord[] {
    return this.invoices.filter((inv) => !isFullyPaid(inv.status) && inv.billingStatus !== "COMPLETED");
  }

  public getCompletedTagihanList(): InvoiceBillingRecord[] {
    return this.invoices.filter((inv) => isFullyPaid(inv.status) || inv.billingStatus === "COMPLETED");
  }

  public getInvoiceById(id: number): InvoiceBillingRecord | undefined {
    return this.invoices.find((inv) => inv.id === id);
  }

  public getInvoiceByOrderNo(orderNo: string): InvoiceBillingRecord | undefined {
    return this.invoices.find((inv) => inv.orderNo === orderNo);
  }

  public getProfitList(): ProfitItem[] {
    return this.profitData;
  }

  public getKasKantorList(): KasKantorItem[] {
    return this.kasKantor;
  }

  public getKasMessengerList(): KasMessengerItem[] {
    return this.kasMessenger;
  }

  public getPengeluaranList(): PengeluaranItem[] {
    return this.pengeluaran;
  }

  public recordPayment(idOrInvoice: number | string, paymentAmount: number, details?: any): boolean {
    if (paymentAmount <= 0) return false;

    const idx = this.invoices.findIndex(
      (inv) => inv.id === idOrInvoice || inv.invoiceNo === String(idOrInvoice) || (inv as any).invoice === String(idOrInvoice)
    );
    if (idx === -1) return false;

    const previousRecord = { ...this.invoices[idx] };
    const record = this.invoices[idx];

    const currentPaid = record.dibayar ?? (record as any).terbayar ?? 0;
    const newDibayar = Math.min(record.totalTagihan, currentPaid + paymentAmount);
    const newSisa = Math.max(0, record.totalTagihan - newDibayar);
    const newStatus = newSisa === 0 ? "Lunas" : "Kurang Bayar";

    record.dibayar = newDibayar;
    (record as any).terbayar = newDibayar;
    record.sisa = newSisa;
    record.status = newStatus;

    if (newSisa === 0) {
      record.billingStatus = "COMPLETED";
      record.profitStatus = "REALIZED";
    }

    this.deriveProfitFromInvoices();
    this.notify();

    // Persist to backend with rollback on failure
    fetch(`${this.baseUrl}/finance/invoices/${encodeURIComponent(record.id)}/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify({ amount: paymentAmount, details }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Server returned status ${res.status}`);
        }
        return res.json();
      })
      .then((payload) => {
        if (payload?.success && payload.data) {
          const currentIdx = this.invoices.findIndex((inv) => inv.id === record.id);
          if (currentIdx !== -1) {
            this.invoices[currentIdx] = this.normalizeInvoice(payload.data);
            this.deriveProfitFromInvoices();
            this.notify();
          }
        }
      })
      .catch((err) => {
        console.error("Failed to persist payment to server, rolling back:", err);
        // Rollback optimistic update
        const currentIdx = this.invoices.findIndex((inv) => inv.id === record.id);
        if (currentIdx !== -1) {
          this.invoices[currentIdx] = previousRecord;
          this.deriveProfitFromInvoices();
          this.notify();
        }
      });

    return true;
  }

  public resolveInvoice(id: number, details?: any): boolean {
    const record = this.getInvoiceById(id);
    if (!record) return false;
    return this.recordPayment(id, record.sisa, details);
  }

  public completeInvoice(id: number, completedBy?: string): boolean {
    const record = this.getInvoiceById(id);
    if (!record) return false;
    record.billingStatus = "COMPLETED";
    if (completedBy) record.completedBy = completedBy;
    this.notify();
    return true;
  }

  public addKasKantor(item: Omit<KasKantorItem, "id">): KasKantorItem | null {
    const lastTotal = this.kasKantor.length > 0
      ? (this.kasKantor[this.kasKantor.length - 1].total ?? (this.kasKantor[this.kasKantor.length - 1] as any).saldo ?? 0)
      : 0;

    const newEntry: KasKantorItem = {
      id: Date.now(),
      tanggal: item.tanggal,
      status: item.status,
      keterangan: item.keterangan,
      debit: item.debit || 0,
      kredit: item.kredit || 0,
      total: (item.status === "Debit" || item.status === "Pemasukan") ? lastTotal + (item.debit || 0) : lastTotal - (item.kredit || 0),
    };

    this.kasKantor.push(newEntry);
    this.notify();

    fetch(`${this.baseUrl}/finance/kas-kantor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.getAuthHeader() },
      body: JSON.stringify(item),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((payload) => {
        if (payload?.success && payload.data) {
          const idx = this.kasKantor.findIndex((k) => k.id === newEntry.id);
          if (idx !== -1) {
            this.kasKantor[idx] = {
              ...payload.data,
              total: Number(payload.data.total ?? payload.data.saldo ?? 0),
              saldo: Number(payload.data.saldo ?? payload.data.total ?? 0),
            };
            this.notify();
          }
        }
      })
      .catch((err) => {
        console.error("Failed to persist kas entry, rolling back:", err);
        const idx = this.kasKantor.findIndex((k) => k.id === newEntry.id);
        if (idx !== -1) {
          this.kasKantor.splice(idx, 1);
          this.notify();
        }
      });

    return newEntry;
  }

  public saveInvoice(invoice: InvoiceBillingRecord): void {
    const normalized = this.normalizeInvoice(invoice);
    const idx = this.invoices.findIndex((inv) => inv.id === normalized.id || inv.invoiceNo === normalized.invoiceNo);
    if (idx !== -1) {
      this.invoices[idx] = normalized;
    } else {
      this.invoices.unshift(normalized);
    }
    this.deriveProfitFromInvoices();
    this.notify();
  }
}
