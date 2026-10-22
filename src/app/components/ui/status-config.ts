/**
 * Shared Semantic Status Configuration for Badges
 * Single source of truth for badge status colors and soft badge styling.
 * 
 * Rules (Phase 3 Final Badge Standardization):
 * 1. Semantic color only for status (Success=Green, Info=Blue, Warning=Amber, Error=Red, Neutral=Gray).
 * 2. Jabatan is always Gray.
 * 3. Text color is ALWAYS #333333.
 * 4. Text presentation uses Sentence Case.
 * 5. Non-status items (Jenis layanan, Jenis kas, Status kas kantor, Wilayah Samsat, Aksi, Keterangan Tugas)
 *    are NOT badges and must NOT be in this configuration.
 */

export type StatusSemantic =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'neutral'
  | 'role'
  | 'purple';

/**
 * Standardized soft background & border tokens with #333333 text:
 */
export const STATUS_STYLES: Record<StatusSemantic, string> = {
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/50',
  info: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800/50',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800/50',
  error: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800/50',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700/60',
  role: 'bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700/60',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800/50',
};

/**
 * Backward compatibility alias mapping for legacy color tokens
 */
export const LEGACY_COLOR_MAP: Record<string, StatusSemantic> = {
  emerald: 'success',
  green: 'success',
  yellow: 'warning',
  orange: 'warning',
  amber: 'warning',
  blue: 'info',
  cyan: 'info',
  purple: 'purple',
  indigo: 'purple',
  red: 'error',
  slate: 'neutral',
  gray: 'role',
};

/**
 * Business status to semantic key mapping
 * Only includes valid statuses and jabatans.
 */
export const BUSINESS_STATUS_MAP: Record<string, StatusSemantic> = {
  // === 1. SUCCESS (soft green) ===
  'Selesai': 'success',
  'selesai': 'success',
  'Sukses': 'success',
  'sukses': 'success',
  'Lengkap': 'success',
  'lengkap': 'success',
  'Sudah Diverifikasi': 'success',
  'Terverifikasi': 'success',
  'terverifikasi': 'success',
  'Lunas': 'success',
  'lunas': 'success',
  'Dokumen Telah Diterima': 'success',
  'dokumen telah diterima': 'success',
  'Aktif': 'success',
  'aktif': 'success',

  // === 2. INFO / PROCESSING (soft blue) ===
  'Dalam Proses': 'info',
  'dalam proses': 'info',
  'Proses': 'info',
  'proses': 'info',
  'Terjadwal': 'info',
  'terjadwal': 'info',
  'Normal': 'info',
  'normal': 'info',
  'low': 'info',
  'Low': 'info',

  // === 3. WARNING / PENDING (soft amber) ===
  'Pending': 'warning',
  'pending': 'warning',
  'Belum Diambil': 'warning',
  'belum diambil': 'warning',
  'Profit Pending': 'warning',
  'profit pending': 'warning',
  'Cashback Pending': 'warning',
  'cashback pending': 'warning',
  'Kurang': 'warning',
  'kurang': 'warning',
  'Belum Bayar': 'warning',
  'belum bayar': 'warning',
  'Kurang Bayar': 'warning',
  'kurang bayar': 'warning',
  'medium': 'warning',
  'Medium': 'warning',
  'Siap Diantar': 'warning',
  'siap diantar': 'warning',
  'Belum Diverifikasi': 'warning',
  'Belum Verifikasi': 'warning',
  'belum verifikasi': 'warning',
  'Belum Dijadwalkan': 'warning',
  'belum dijadwalkan': 'warning',
  'Belum Dijadwal': 'warning',
  'belum dijadwal': 'warning',
  'Melebihi Harga Dasar': 'warning',
  'melebihi harga dasar': 'warning',

  // === 4. ERROR / CANCELLED / INACTIVE (soft red) ===
  'Dibatalkan': 'error',
  'dibatalkan': 'error',
  'Batal': 'error',
  'batal': 'error',
  'Belum Lunas': 'error',
  'belum lunas': 'error',
  'Nonaktif': 'error',
  'nonaktif': 'error',
  'Urgent': 'error',
  'urgent': 'error',
  'high': 'error',
  'High': 'error',

  // === 5. JABATAN (ALWAYS GRAY / NEUTRAL) ===
  'ADMIN': 'role',
  'admin': 'role',
  'Admin': 'role',
  'Admin (SVP)': 'role',
  'admin (svp)': 'role',
  'SVP': 'role',
  'svp': 'role',
  'administrator': 'role',
  'Administrator': 'role',
  'FINANCE': 'role',
  'finance': 'role',
  'Finance': 'role',
  'CLIENT': 'role',
  'client': 'role',
  'Client': 'role',
  'CLILEN': 'role',
  'clilen': 'role',
  'Clilen': 'role',
  'MESSENGER': 'role',
  'messenger': 'role',
  'Messenger': 'role',
  'role': 'role',
  'jabatan': 'role',
};

/**
 * Presentation helper: formats text to Sentence Case (Title Case for compound words).
 * Does not mutate underlying data, purely for presentation.
 */
export function formatBadgeText(str: string): string {
  if (!str || typeof str !== 'string') return str;

  return str
    .split(' ')
    .map(word => {
      if (!word) return word;
      if (word.startsWith('(') && word.endsWith(')')) {
        const inner = word.slice(1, -1);
        if (inner.toLowerCase() === 'svp') return '(SVP)';
        return `(${inner.charAt(0).toUpperCase()}${inner.slice(1).toLowerCase()})`;
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Resolver function to get the standardized soft status badge class.
 * Supports business status strings, semantic keys, step numbers, or fuzzy matches.
 */
export function getStatusBadgeClass(status: string | number | undefined | null): string {
  if (status === undefined || status === null) {
    return STATUS_STYLES.neutral;
  }

  // Handle OrderTracking workflow step numbers (1 to 8)
  if (typeof status === 'number') {
    switch (status) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
        return STATUS_STYLES.info; // Processing steps -> blue
      case 7:
      case 8:
        return STATUS_STYLES.success; // Completed / Archive -> green
      default:
        return STATUS_STYLES.neutral;
    }
  }

  const str = String(status).trim();

  // 1. Direct match in business map
  if (BUSINESS_STATUS_MAP[str]) {
    return STATUS_STYLES[BUSINESS_STATUS_MAP[str]];
  }

  // 2. Case-insensitive lookup in business map
  const lower = str.toLowerCase();
  for (const [key, semantic] of Object.entries(BUSINESS_STATUS_MAP)) {
    if (key.toLowerCase() === lower) {
      return STATUS_STYLES[semantic];
    }
  }

  // 3. Direct semantic token match (e.g. "success", "error", "warning", "info", "role", "neutral")
  if (str in STATUS_STYLES) {
    return STATUS_STYLES[str as StatusSemantic];
  }

  // 4. Legacy color token alias match (e.g. "orange", "yellow", "purple")
  if (lower in LEGACY_COLOR_MAP) {
    return STATUS_STYLES[LEGACY_COLOR_MAP[lower]];
  }

  // 5. Fallback pattern matching for compound status texts
  if (lower.includes('selesai') || lower.includes('lunas') || lower.includes('sukses') || lower.includes('lengkap') || lower.includes('terverifikasi')) {
    return STATUS_STYLES.success;
  }
  if (lower.includes('kurang') || lower.includes('pending') || lower.includes('belum diverifikasi') || lower.includes('belum verifikasi') || lower.includes('belum dijadwalkan') || lower.includes('belum dijadwal') || lower.includes('belum bayar') || lower.includes('melebihi')) {
    return STATUS_STYLES.warning;
  }
  if (lower.includes('batal') || lower.includes('gagal') || lower.includes('nonaktif') || lower.includes('belum lunas') || lower.includes('urgent')) {
    return STATUS_STYLES.error;
  }
  if (lower.includes('admin') || lower.includes('finance') || lower.includes('messenger') || lower.includes('svp') || lower.includes('client') || lower.includes('clilen') || lower.includes('jabatan') || lower.includes('role')) {
    return STATUS_STYLES.role;
  }
  if (lower.includes('proses') || lower.includes('terjadwal') || lower.includes('normal')) {
    return STATUS_STYLES.info;
  }

  return STATUS_STYLES.neutral;
}
