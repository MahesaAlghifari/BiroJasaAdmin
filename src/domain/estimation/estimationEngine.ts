/**
 * Pure Calculation Engine for Estimation Templates
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Replicates authoritative Excel logic from sheet 'PAJAK TAHUNAN  R4'
 * Pure deterministic functions with 0 React/DOM dependencies.
 */

import {
  EstimationInput,
  EstimationTemplateConfig,
  EstimationResult,
  EstimationResultItem,
  ProgramSamsat,
  KondisiBerkas,
  WilayahAccId,
} from "./types";
import { calculateOverdueDuration } from "./excelDateUtils";
import { DEFAULT_R4_ANNUAL_TEMPLATE } from "./defaultTemplates";

export interface RuleCalculationContext {
  pkbDasar: number;
  tahunTunggakan: number;
  bulanTunggakan: number;
  programSamsat: ProgramSamsat;
  template: EstimationTemplateConfig;
  manualValues: Record<string, number>;
  kondisiBerkas?: KondisiBerkas;
  wilayahAccId?: WilayahAccId;
}

export type RuleHandler = (ctx: RuleCalculationContext) => number;

/**
 * Built-in validated rule handlers mapping strictly to Excel formulas
 */
export const BUILTIN_RULE_HANDLERS: Record<string, RuleHandler> = {
  // Cell C15: =I14*I12
  PKB_TERTUNGGAK: (ctx) => {
    return ctx.pkbDasar * ctx.tahunTunggakan;
  },

  // Cell C16: =IF(I12=0,I14,I14/12*12) => equals PKB Dasar
  PAJAK_BARU: (ctx) => {
    return ctx.pkbDasar;
  },

  // Cell F15: =ROUNDUP(IF(I11="free biaya denda",0,IF(I11="normal",IF(C15<>"",SUM(C15*I6/12*12),""),"")),-3)
  DENDA_PKB_TERTUNGGAK: (ctx) => {
    const program = (ctx.programSamsat || "").trim().toLowerCase();
    if (program === "free biaya denda") return 0;
    const pkbTertunggak = ctx.pkbDasar * ctx.tahunTunggakan;
    const raw = pkbTertunggak * ctx.template.koefisienDenda;
    return Math.ceil(raw / 1000) * 1000;
  },

  // Cell F16: =ROUNDUP(IF(I11="free biaya denda";0;IF(I11="normal";SUM(I14*I6/12*I13);""));-3)
  DENDA_PKB_PAJAK_BARU: (ctx) => {
    const program = (ctx.programSamsat || "").trim().toLowerCase();
    if (program === "free biaya denda") return 0;
    // SUM(I14*I6/12*I13) where I14 = PKB Dasar, I6 = Koefisien Denda (0.48), I13 = Bulan Denda
    const raw = (ctx.pkbDasar * ctx.template.koefisienDenda / 12) * ctx.bulanTunggakan;
    return Math.ceil(raw / 1000) * 1000;
  },

  // Cell C20: =C21*I12
  SWDKLLJ_TERTUNGGAK: (ctx) => {
    return ctx.template.swdklljPokok * ctx.tahunTunggakan;
  },

  // Cell C21: =IF(I9="mobil",143000,IF(I9="motor",35000,"Kondisi Tidak Valid"))
  SWDKLLJ_PAJAK_BARU: (ctx) => {
    return ctx.template.swdklljPokok;
  },

  // Cell F20: =IF(I12>0,IF(I9="mobil",100000*I12,IF(I9="motor",32000*I12,"Tipe kendaraan tidak dikenali")),"")
  // NOTE: Workbook does NOT zero this out when Program Samsat is "FREE Biaya Denda"
  DENDA_SWDKLLJ_TERTUNGGAK: (ctx) => {
    return ctx.tahunTunggakan > 0 ? ctx.template.dendaSwdklljPokok * ctx.tahunTunggakan : 0;
  },

  // Cell F21: =IF(AND(I13>0,I9="mobil"),100000,IF(AND(I13>0,I9="motor"),32000,0))
  // NOTE: Workbook does NOT zero this out when Program Samsat is "FREE Biaya Denda"
  DENDA_SWDKLLJ_PAJAK_BARU: (ctx) => {
    return ctx.bulanTunggakan > 0 ? ctx.template.dendaSwdklljPokok : 0;
  },

  // Cell C24: =IF(AND(I7="5 tahunan",I9="mobil"),200000,IF(AND(I7="5 tahunan",I9="motor"),100000,IF(I7="tahunan",0,"")))
  ADMIN_STNK: () => 0,

  // Cell C25: =IF(AND(I7="5 tahunan",I9="mobil"),100000,IF(AND(I7="5 tahunan",I9="motor"),60000,IF(I7="tahunan",0,"")))
  ADMIN_TNKB: () => 0,

  // Cell C27: proses dan acc id (Sheet 5)
  // Masuk dalam total C30. Default Rp 350.000 untuk Motor.
  // Jika berkas LENGKAP -> 0.
  // Jika wilayah spesifik dipilih selain NON ACC ID -> ikuti tarif wilayah.
  // Jika berkas tidak diisi/kosong -> 0 (tidak menebak biaya).
  PROSES_DAN_ACC_ID: (ctx) => {
    const manualVal = ctx.manualValues ? ctx.manualValues["proses-dan-acc-id"] : undefined;
    if (typeof manualVal === "number" && !isNaN(manualVal) && isFinite(manualVal)) {
      return Math.max(0, manualVal);
    }
    if (ctx.kondisiBerkas === "LENGKAP") {
      return 0;
    }
    if (ctx.wilayahAccId && ctx.template.accIdRates[ctx.wilayahAccId] !== undefined && ctx.wilayahAccId !== "NON ACC ID") {
      return ctx.template.accIdRates[ctx.wilayahAccId];
    }
    if (!ctx.kondisiBerkas) {
      return 0;
    }
    return ctx.template.components.find((c) => c.id === "proses-dan-acc-id")?.defaultValue ?? 350000;
  },

  // Cell C28: =IF(I13+I12>0,IF(I9="motor",50000,IF(I9="mobil",100000,"Nilai F9 tidak valid")),"")
  CETAK_SKP: (ctx) => {
    return ctx.tahunTunggakan + ctx.bulanTunggakan > 0 ? ctx.template.biayaCetakSkp : 0;
  },

  // Cell C29: =IF(AND(I7="tahunan",I9="mobil"),250000,...)
  JASA: (ctx) => {
    return ctx.template.biayaJasa;
  },
};

/**
 * Extensible rule registry allowing registration of new custom formulas
 */
export class EstimationRuleRegistry {
  private handlers = new Map<string, RuleHandler>();

  constructor() {
    for (const [key, handler] of Object.entries(BUILTIN_RULE_HANDLERS)) {
      this.handlers.set(key, handler);
    }
  }

  public register(ruleId: string, handler: RuleHandler): void {
    this.handlers.set(ruleId, handler);
  }

  public get(ruleId: string): RuleHandler | undefined {
    return this.handlers.get(ruleId);
  }
}

export const defaultRuleRegistry = new EstimationRuleRegistry();

/**
 * Normalizes string matching for ACC ID rates lookup
 */
function resolveAccIdRate(rates: Record<string, number>, wilayah?: string): number {
  if (!wilayah) return 0;
  const target = wilayah.trim().toLowerCase();
  for (const [key, val] of Object.entries(rates)) {
    if (key.trim().toLowerCase() === target) {
      return val;
    }
  }
  return 0;
}

/**
 * Pure calculation engine for estimation templates
 */
export function calculateEstimation(
  input: EstimationInput,
  template: EstimationTemplateConfig = DEFAULT_R4_ANNUAL_TEMPLATE,
  registry: EstimationRuleRegistry = defaultRuleRegistry
): EstimationResult {
  const pkbDasar = Math.max(0, Number(input.pkbDasar) || 0);
  const manualValues = input.manualValues || {};

  // 1. Calculate calendar overdue duration
  const overdue = calculateOverdueDuration(input.tanggalJatuhTempo, input.tanggalEstimasi);
  const tahunTunggakan = overdue.years;
  const isDelay = overdue.years > 0 || overdue.months > 0;

  // Sheet 5 cell I13 rule:
  // For Motor (R2), if overdue, bulan denda is calendar months + 5
  // For Mobil (R4), bulan denda is calendar months
  const bulanTunggakan = isDelay
    ? (template.vehicleType === "Motor" ? overdue.months + 5 : overdue.months)
    : 0;
  const bulanKalender = overdue.months;

  const ctx: RuleCalculationContext = {
    pkbDasar,
    tahunTunggakan,
    bulanTunggakan,
    programSamsat: input.programSamsat,
    template,
    manualValues,
    kondisiBerkas: input.kondisiBerkas,
    wilayahAccId: input.wilayahAccId,
  };

  // 2. Evaluate all active template components in display order
  const sortedComponents = [...template.components]
    .filter((c) => c.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const items: EstimationResultItem[] = [];

  for (const comp of sortedComponents) {
    let amount = 0;
    const isManual = comp.valueType === "manual" || comp.isEditable === true;
    const hasManualOverride =
      manualValues[comp.id] !== undefined &&
      typeof manualValues[comp.id] === "number" &&
      !isNaN(manualValues[comp.id]) &&
      isFinite(manualValues[comp.id]);

    if (hasManualOverride) {
      amount = Math.max(0, manualValues[comp.id]);
    } else if (comp.ruleId) {
      const handler = registry.get(comp.ruleId);
      if (handler) {
        amount = handler(ctx);
      } else {
        amount = comp.defaultValue;
      }
    } else {
      amount = comp.defaultValue;
    }

    items.push({
      id: comp.id,
      code: comp.code,
      name: comp.name,
      category: comp.category,
      amount: Math.max(0, amount),
      isManual: hasManualOverride || comp.valueType === "manual",
      includesInTotal: comp.includesInTotal,
      description: comp.description,
    });
  }

  // 3. Category aggregates
  let totalPkb = 0;
  let totalDendaPkb = 0;
  let totalSwdkllj = 0;
  let totalDendaSwdkllj = 0;
  let totalAdminDanJasa = 0;
  let totalInsidental = 0;
  let sumForTotal = 0;

  for (const it of items) {
    if (it.category === "PKB") totalPkb += it.amount;
    else if (it.category === "DENDA_PKB") totalDendaPkb += it.amount;
    else if (it.category === "SWDKLLJ") totalSwdkllj += it.amount;
    else if (it.category === "DENDA_SWDKLLJ") totalDendaSwdkllj += it.amount;
    else if (it.category === "ADMIN" || it.category === "JASA") totalAdminDanJasa += it.amount;
    else if (it.category === "INSIDENTAL") totalInsidental += it.amount;

    if (it.includesInTotal) {
      sumForTotal += it.amount;
    }
  }

  // 4. ACC ID handling
  let accIdAmount: number | null = null;
  let accIdStatus: "LENGKAP" | "CALCULATED" | "NOT_AVAILABLE" = "NOT_AVAILABLE";

  const kondisiBerkas = input.kondisiBerkas ? input.kondisiBerkas.trim().toUpperCase() : undefined;
  if (template.vehicleType === "Motor") {
    // For R2, "Proses dan ACC ID" is part of the items breakdown and included in totalEstimasi
    const prosesAccItem = items.find((i) => i.id === "proses-dan-acc-id");
    if (kondisiBerkas === "LENGKAP") {
      accIdAmount = 0;
      accIdStatus = "LENGKAP";
    } else if (kondisiBerkas === "TIDAK ADA KTP") {
      accIdAmount = prosesAccItem ? prosesAccItem.amount : 350000;
      accIdStatus = "CALCULATED";
    } else {
      accIdAmount = null;
      accIdStatus = "NOT_AVAILABLE";
    }
  } else {
    // For R4, ACC ID is evaluated separately and strictly EXCLUDED from totalEstimasi
    if (kondisiBerkas === "LENGKAP") {
      accIdAmount = 0;
      accIdStatus = "LENGKAP";
    } else if (kondisiBerkas === "TIDAK ADA KTP") {
      if (input.wilayahAccId) {
        accIdAmount = resolveAccIdRate(template.accIdRates, input.wilayahAccId);
        accIdStatus = "CALCULATED";
      } else {
        accIdAmount = null;
        accIdStatus = "NOT_AVAILABLE";
      }
    } else {
      accIdAmount = null;
      accIdStatus = "NOT_AVAILABLE";
    }
  }

  // 5. Final total with Excel ROUNDUP(..., -3) (up to nearest 1.000)
  const totalEstimasi = Math.ceil(sumForTotal / 1000) * 1000;

  return {
    tahunTunggakan,
    bulanTunggakan,
    bulanKalender,
    durasiKeterlambatan: overdue.formatted,
    items,
    totalPkb,
    totalDendaPkb,
    totalSwdkllj,
    totalDendaSwdkllj,
    totalAdminDanJasa,
    totalInsidental,
    accIdAmount,
    accIdStatus,
    totalEstimasi,
  };
}
