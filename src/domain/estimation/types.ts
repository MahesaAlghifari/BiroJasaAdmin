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

export type ComponentCategory =
  | "PKB"
  | "DENDA_PKB"
  | "SWDKLLJ"
  | "DENDA_SWDKLLJ"
  | "ADMIN"
  | "JASA"
  | "INSIDENTAL"
  | "ACC_ID";

export type ComponentValueType = "formula" | "conditional" | "manual";

export interface EstimationComponentRule {
  id: string;
  code: string;
  name: string;
  category: ComponentCategory;
  valueType: ComponentValueType;
  defaultValue: number;
  isActive: boolean;
  displayOrder: number;
  includesInTotal: boolean;
  ruleId?: string;
  isEditable?: boolean;
  description?: string;
}

export interface EstimationTemplateConfig {
  id: string;
  name: string;
  serviceType: "Tahunan" | "5 Tahunan";
  vehicleType: "Mobil" | "Motor";
  koefisienDenda: number;
  biayaJasa: number;
  swdklljPokok: number;
  dendaSwdklljPokok: number;
  biayaCetakSkp: number;
  components: EstimationComponentRule[];
  accIdRates: Record<string, number>;
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
