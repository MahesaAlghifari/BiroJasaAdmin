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
    if (ctx.programSamsat === "FREE Biaya Denda") return 0;
    const pkbTertunggak = ctx.pkbDasar * ctx.tahunTunggakan;
    const raw = pkbTertunggak * ctx.template.koefisienDenda;
    return Math.ceil(raw / 1000) * 1000;
  },

  // Cell F16: =ROUNDUP(IF(I11="free biaya denda",0,IF(I11="normal",SUM(I14*I6/12*I13),"")),-3)
  DENDA_PKB_PAJAK_BARU: (ctx) => {
    if (ctx.programSamsat === "FREE Biaya Denda") return 0;
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
  const bulanTunggakan = overdue.months;

  const ctx: RuleCalculationContext = {
    pkbDasar,
    tahunTunggakan,
    bulanTunggakan,
    programSamsat: input.programSamsat,
    template,
    manualValues,
  };

  // 2. Evaluate all active template components in display order
  const sortedComponents = [...template.components]
    .filter((c) => c.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  const items: EstimationResultItem[] = [];

  for (const comp of sortedComponents) {
    let amount = 0;
    const isManual = comp.valueType === "manual" || comp.isEditable === true;

    if (isManual) {
      const overrideVal = manualValues[comp.id];
      amount = typeof overrideVal === "number" && !isNaN(overrideVal) && isFinite(overrideVal)
        ? Math.max(0, overrideVal)
        : comp.defaultValue;
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
      isManual,
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

  // 4. ACC ID (evaluated separately, strictly EXCLUDED from totalEstimasi)
  let accIdAmount: number | null = null;
  let accIdStatus: "LENGKAP" | "CALCULATED" | "NOT_AVAILABLE" = "NOT_AVAILABLE";

  const kondisiBerkas = input.kondisiBerkas ? input.kondisiBerkas.trim().toUpperCase() : undefined;
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

  // 5. Final total with Excel ROUNDUP(..., -3) (up to nearest 1.000)
  const totalEstimasi = Math.ceil(sumForTotal / 1000) * 1000;

  return {
    tahunTunggakan,
    bulanTunggakan,
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
