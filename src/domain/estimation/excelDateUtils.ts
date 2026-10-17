/**
 * Excel Calendar Date Utilities for Estimation Engine
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Replicates Excel DATEDIF logic:
 * DATEDIF(H21, I21, "Y")
 * DATEDIF(H21, I21, "YM")
 * DATEDIF(H21, I21, "MD")
 * 
 * If remaining days > 0, adds 1 month.
 * If total months reaches 12, normalizes to +1 year and 0 months.
 */

import { OverdueDuration } from "./types";

export interface DateParts {
  y: number;
  m: number;
  d: number;
}

export function parseDateParts(dateStr: string): DateParts | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // 1. Check YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { y, m, d };
    }
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const idMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (idMatch) {
    const d = parseInt(idMatch[1], 10);
    const m = parseInt(idMatch[2], 10);
    const y = parseInt(idMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { y, m, d };
    }
  }

  // 3. Fallback to standard Date parse
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return {
      y: parsed.getUTCFullYear(),
      m: parsed.getUTCMonth() + 1,
      d: parsed.getUTCDate(),
    };
  }

  return null;
}

export function toIsoDateString(parts: DateParts): string {
  return `${parts.y}-${String(parts.m).padStart(2, "0")}-${String(parts.d).padStart(2, "0")}`;
}

export function addYearsToIso(isoDate: string, years: number): string {
  const parts = parseDateParts(isoDate);
  if (!parts) return isoDate;
  const targetYear = parts.y + years;
  const maxDays = new Date(Date.UTC(targetYear, parts.m, 0)).getUTCDate();
  const targetDay = Math.min(parts.d, maxDays);
  return `${targetYear}-${String(parts.m).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

export function addMonthsToIso(isoDate: string, months: number): string {
  const parts = parseDateParts(isoDate);
  if (!parts) return isoDate;
  const totalMonths = parts.y * 12 + (parts.m - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const maxDays = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(parts.d, maxDays);
  return `${targetYear}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/**
 * Calculates calendar overdue duration matching Excel sheet formula:
 * =(DATEDIF(H21,I21,"Y")+((DATEDIF(H21,I21,"YM")+(DATEDIF(H21,I21,"MD")>0))=12))&" Tahun "&MOD(DATEDIF(H21,I21,"YM")+(DATEDIF(H21,I21,"MD")>0),12)&" Bulan"
 */
export function calculateOverdueDuration(
  dueDateInput: string,
  currentDateInput?: string
): OverdueDuration {
  const dueParts = parseDateParts(dueDateInput);
  if (!dueParts) {
    return { years: 0, months: 0, formatted: "0 Tahun 0 Bulan" };
  }

  const currentParts = currentDateInput
    ? parseDateParts(currentDateInput)
    : {
        y: new Date().getFullYear(),
        m: new Date().getMonth() + 1,
        d: new Date().getDate(),
      };

  if (!currentParts) {
    return { years: 0, months: 0, formatted: "0 Tahun 0 Bulan" };
  }

  const dueIso = toIsoDateString(dueParts);
  const currentIso = toIsoDateString(currentParts);

  // If due date is today or in the future, delay is zero
  if (dueIso >= currentIso) {
    return { years: 0, months: 0, formatted: "0 Tahun 0 Bulan" };
  }

  // 1. Calculate full elapsed years
  let years = 0;
  while (addYearsToIso(dueIso, years + 1) <= currentIso) {
    years++;
  }
  const dateAfterYears = addYearsToIso(dueIso, years);

  // 2. Calculate remaining full elapsed months (0..11)
  let months = 0;
  while (months < 12 && addMonthsToIso(dateAfterYears, months + 1) <= currentIso) {
    months++;
  }
  const dateAfterMonths = addMonthsToIso(dateAfterYears, months);

  // 3. Check if there are remaining days (DATEDIF "MD" > 0)
  const hasExtraDays = dateAfterMonths < currentIso;

  // 4. Excel rounding logic: remaining days bump months by +1
  const totalMonths = months + (hasExtraDays ? 1 : 0);
  let finalYears = years;
  let finalMonths = totalMonths;

  if (totalMonths === 12) {
    finalYears += 1;
    finalMonths = 0;
  } else {
    finalMonths = totalMonths % 12;
  }

  return {
    years: finalYears,
    months: finalMonths,
    formatted: `${finalYears} Tahun ${finalMonths} Bulan`,
  };
}
