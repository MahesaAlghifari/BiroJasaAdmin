/**
 * Domain types for Estimation Engine
 * Admin SUN89 — Biro Jasa Management System
 */

export type ProgramSamsat = "NORMAL" | "FREE Biaya Denda";

export type KondisiBerkas = "LENGKAP" | "TIDAK ADA KTP";

export type WilayahAccId =
  | "NON ACC ID"
  | "DKI Jakarta"
  | "Bogor"
  | "Tanggerang"
  | "Tangerang"
  | "Depok"
  | "Bekasi";

export type EstimationServiceType =
  | "Tahunan"
  | "5 Tahunan"
  | "Balik Nama"
  | "Mutasi Antar Samsat"
  | "Mutasi Luar Daerah";

export type ComponentCategory =
  | "PKB"
  | "DENDA_PKB"
  | "SWDKLLJ"
  | "DENDA_SWDKLLJ"
  | "ADMIN"
  | "JASA"
  | "INSIDENTAL"
  | "ACC_ID"
  | "PROSES"
  | "BBN";

export type ComponentValueType = "formula" | "conditional" | "manual";

export type CalculationMethod =
  | "fixed_amount"
  | "manual_amount"
  | "percentage_of_base"
  | "pkb_penalty_by_month"
  | "annual_rate_by_arrears"
  | "regional_allocation"
  | "formula_rule";

export interface EstimationComponentRule {
  id: string;
  code: string;
  name: string;
  category: ComponentCategory;
  valueType: ComponentValueType;
  calculationMethod?: CalculationMethod;
  defaultValue: number;
  minAmount?: number;
  maxAmount?: number;
  ratePercentage?: number;
  applicableVehicles?: "Mobil" | "Motor" | "Semua";
  applicableService?: string;
  isActive: boolean;
  displayOrder: number;
  includesInTotal: boolean;
  ruleId?: string;
  isEditable?: boolean;
  description?: string;
  formulaCondition?: string;
  humanFormula?: string;
}

export interface EstimationTemplateConfig {
  id: string;
  name: string;
  serviceType: EstimationServiceType;
  vehicleType: "Mobil" | "Motor";
  koefisienDenda: number;
  pembagiBulan?: number;
  kelipatanPembulatan?: number;
  biayaJasa: number;
  swdklljPokok: number;
  dendaSwdklljPokok: number;
  biayaCetakSkp: number;
  adminStnk?: number;
  adminTnkb?: number;
  components: EstimationComponentRule[];
  accIdRates: Record<string, number>;
  description?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface EstimationInput {
  pkbDasar: number;
  tanggalJatuhTempo: string; // YYYY-MM-DD or DD/MM/YYYY
  tanggalEstimasi?: string;  // YYYY-MM-DD or DD/MM/YYYY, defaults to today
  programSamsat: ProgramSamsat;
  kondisiBerkas?: KondisiBerkas;
  wilayahAccId?: WilayahAccId;
  manualValues?: Record<string, number>;
  customerName?: string;
  nopol?: string;
  njkb?: number;
  freeBbn?: boolean;
  wilayahAsal?: string;
  wilayahTujuan?: string;
}

export interface EstimationResultItem {
  id: string;
  code: string;
  name: string;
  category: ComponentCategory;
  amount: number;
  isManual: boolean;
  includesInTotal: boolean;
  description?: string;
}

export interface OverdueDuration {
  years: number;
  months: number;
  formatted: string;
}

export interface EstimationResult {
  tahunTunggakan: number;
  bulanTunggakan: number;
  bulanKalender?: number;
  durasiKeterlambatan: string;
  items: EstimationResultItem[];
  totalPkb: number;
  totalDendaPkb: number;
  totalSwdkllj: number;
  totalDendaSwdkllj: number;
  totalAdminDanJasa: number;
  totalInsidental: number;
  accIdAmount: number | null;
  accIdStatus: "LENGKAP" | "CALCULATED" | "NOT_AVAILABLE";
  totalEstimasi: number;
}
