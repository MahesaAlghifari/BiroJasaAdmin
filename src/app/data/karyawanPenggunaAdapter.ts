/**
 * Karyawan -> Pengguna Authoritative Data Adapter
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Rules:
 * 1. Karyawan is the authoritative source of employee data.
 * 2. Pengguna manages access accounts linked strictly to an existing employee (employeeId).
 * 3. NO user creation in Manajemen Pengguna (must be added via Manajemen Karyawan).
 * 4. Password reset format is strictly DDMMYYYY derived from employee date of birth (tanggalLahir).
 */

import { useState, useEffect } from "react";
import { auditLog } from "../utils/auditLog";
import { userRepository } from "../../data/repositories/userRepository";
import { APP_CONFIG } from "../config/appConfig";

export interface KaryawanRecord {
  id: string; // e.g. "EMP-001"
  nama: string;
  jabatan: "ADMIN" | "FINANCE" | "SVP" | "MESSENGER" | "CLILEN";
  wilayah: string;
  status: "Aktif" | "Nonaktif";
  noHp: string;
  email: string;
  jenisKelamin: "Laki-laki" | "Perempuan";
  alamat: string;
  gajiPokok: number;
  tanggalBergabung: string;
  tanggalLahir: string; // Format: "YYYY-MM-DD" or "DD/MM/YYYY"
}

export interface PenggunaRecord {
  id: string; // e.g. "USR-001"
  employeeId: string; // FK -> KaryawanRecord.id
  nama: string; // Mirrored from Karyawan
  jabatan: string; // Mirrored from Karyawan
  email: string; // Username/email
  role: "admin" | "finance" | "svp" | "messenger" | "clilen";
  statusAkun: "Aktif" | "Nonaktif" | "Belum Aktif";
  terakhirLogin: string;
  passwordHash?: string; // In-memory/mock storage
  lastResetAt?: string;
}

// Initial Employees with exact test-case DOBs
export const INITIAL_KARYAWAN: KaryawanRecord[] = [
  {
    id: "EMP-001",
    nama: "Budi Santoso",
    jabatan: "SVP",
    wilayah: "Jakarta Barat",
    status: "Aktif",
    noHp: "081234567896",
    email: "budi.santoso@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Kenanga No. 12, Jakarta Barat",
    gajiPokok: 8500000,
    tanggalBergabung: "2021-09-05",
    tanggalLahir: "2001-10-10", // 10 Oktober 2001 -> Reset Password: 10102001
  },
  {
    id: "EMP-002",
    nama: "Siti Nurhaliza",
    jabatan: "ADMIN",
    wilayah: "Jakarta Timur",
    status: "Aktif",
    noHp: "081234567893",
    email: "siti.nur@birojasa.com",
    jenisKelamin: "Perempuan",
    alamat: "Jl. Melati No. 123, Jakarta Timur",
    gajiPokok: 5000000,
    tanggalBergabung: "2023-01-15",
    tanggalLahir: "2000-01-05", // 05 Januari 2000 -> Reset Password: 05012000
  },
  {
    id: "EMP-003",
    nama: "Andi Wijaya",
    jabatan: "FINANCE",
    wilayah: "Jakarta Selatan",
    status: "Aktif",
    noHp: "081234567894",
    email: "andi.wijaya@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Mawar No. 45, Jakarta Selatan",
    gajiPokok: 7000000,
    tanggalBergabung: "2022-06-10",
    tanggalLahir: "1998-07-15",
  },
  {
    id: "EMP-004",
    nama: "Dewi Lestari",
    jabatan: "CLILEN",
    wilayah: "Depok",
    status: "Aktif",
    noHp: "081234567895",
    email: "dewi.lestari@birojasa.com",
    jenisKelamin: "Perempuan",
    alamat: "Jl. Anggrek No. 78, Depok",
    gajiPokok: 5500000,
    tanggalBergabung: "2023-03-20",
    tanggalLahir: "1999-04-20",
  },
  {
    id: "EMP-005",
    nama: "Maya Safitri",
    jabatan: "ADMIN",
    wilayah: "Bekasi",
    status: "Aktif",
    noHp: "081234567897",
    email: "maya.safitri@birojasa.com",
    jenisKelamin: "Perempuan",
    alamat: "Jl. Dahlia No. 90, Bekasi",
    gajiPokok: 4800000,
    tanggalBergabung: "2023-07-12",
    tanggalLahir: "2002-09-12",
  },
  {
    id: "EMP-006",
    nama: "Rudi Hartono",
    jabatan: "MESSENGER",
    wilayah: "Jakarta Timur",
    status: "Aktif",
    noHp: "081234567898",
    email: "rudi.hartono@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Melati Jaya No. 34, Jakarta Timur",
    gajiPokok: 4500000,
    tanggalBergabung: "2023-02-10",
    tanggalLahir: "1997-12-03",
  },
  {
    id: "EMP-007",
    nama: "Joko Prasetyo",
    jabatan: "MESSENGER",
    wilayah: "Bekasi",
    status: "Aktif",
    noHp: "081234567899",
    email: "joko.prasetyo@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Raya Bekasi No. 56, Bekasi",
    gajiPokok: 4500000,
    tanggalBergabung: "2023-05-20",
    tanggalLahir: "1996-08-25",
  },
  {
    id: "EMP-008",
    nama: "Eko Santoso",
    jabatan: "MESSENGER",
    wilayah: "Tangerang",
    status: "Aktif",
    noHp: "081234567890",
    email: "eko.santoso@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Sudirman No. 10, Tangerang",
    gajiPokok: 4500000,
    tanggalBergabung: "2023-11-01",
    tanggalLahir: "2001-03-14",
  },
  {
    id: "EMP-009",
    nama: "Nina Rahayu",
    jabatan: "CLILEN",
    wilayah: "Jakarta Utara",
    status: "Aktif",
    noHp: "081234567891",
    email: "nina.rahayu@birojasa.com",
    jenisKelamin: "Perempuan",
    alamat: "Jl. Danau Sunter No. 4, Jakarta Utara",
    gajiPokok: 5200000,
    tanggalBergabung: "2023-08-15",
    tanggalLahir: "1999-11-22",
  },
  {
    id: "EMP-010",
    nama: "Dedi Cahyadi",
    jabatan: "SVP",
    wilayah: "Jakarta Pusat",
    status: "Aktif",
    noHp: "081234567892",
    email: "dedi.cahyadi@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Thamrin No. 88, Jakarta Pusat",
    gajiPokok: 8500000,
    tanggalBergabung: "2021-04-10",
    tanggalLahir: "1995-06-18",
  },
  {
    id: "EMP-011",
    nama: "Linda Permata",
    jabatan: "ADMIN",
    wilayah: "Depok",
    status: "Aktif",
    noHp: "081234567888",
    email: "linda.permata@birojasa.com",
    jenisKelamin: "Perempuan",
    alamat: "Jl. Margonda Raya No. 100, Depok",
    gajiPokok: 5000000,
    tanggalBergabung: "2023-09-01",
    tanggalLahir: "2000-08-30",
  },
  {
    id: "EMP-012",
    nama: "Agus Salim",
    jabatan: "MESSENGER",
    wilayah: "Bogor",
    status: "Aktif",
    noHp: "081234567889",
    email: "agus.salim@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Pajajaran No. 22, Bogor",
    gajiPokok: 4500000,
    tanggalBergabung: "2024-01-10",
    tanggalLahir: "1998-02-14",
  },
  {
    id: "EMP-013",
    nama: "Hadi Gunawan",
    jabatan: "SVP",
    wilayah: "Tangerang Selatan",
    status: "Aktif",
    noHp: "081234567880",
    email: "hadi.gunawan@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. BSD Raya No. 50, Tangerang Selatan",
    gajiPokok: 8500000,
    tanggalBergabung: "2022-01-05",
    tanggalLahir: "1994-12-05",
  },
  {
    id: "EMP-014",
    nama: "Aris Budiman",
    jabatan: "MESSENGER",
    wilayah: "Jakarta Barat",
    status: "Aktif",
    noHp: "081234567881",
    email: "aris.budiman@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Daan Mogot No. 67, Jakarta Barat",
    gajiPokok: 4500000,
    tanggalBergabung: "2023-10-15",
    tanggalLahir: "1997-05-19",
  },
  {
    id: "EMP-015",
    nama: "Wati Kurniasih",
    jabatan: "FINANCE",
    wilayah: "Jakarta Pusat",
    status: "Aktif",
    noHp: "081234567882",
    email: "wati.kurniasih@birojasa.com",
    jenisKelamin: "Perempuan",
    alamat: "Jl. Salemba Raya No. 12, Jakarta Pusat",
    gajiPokok: 7000000,
    tanggalBergabung: "2022-11-20",
    tanggalLahir: "1996-03-28",
  },
  {
    id: "EMP-MSG-001",
    nama: "Budi Santoso",
    jabatan: "MESSENGER",
    wilayah: "Jakarta Pusat",
    status: "Aktif",
    noHp: "081299887766",
    email: "budi.messenger@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Lapangan Banteng Barat No. 10, Jakarta Pusat",
    gajiPokok: 4800000,
    tanggalBergabung: "2023-01-10",
    tanggalLahir: "1998-05-15",
  },
  {
    id: "EMP-MSG-002",
    nama: "Andi Pratama",
    jabatan: "MESSENGER",
    wilayah: "Jakarta Selatan",
    status: "Aktif",
    noHp: "081299887755",
    email: "andi.messenger@birojasa.com",
    jenisKelamin: "Laki-laki",
    alamat: "Jl. Panglima Polim No. 25, Jakarta Selatan",
    gajiPokok: 4800000,
    tanggalBergabung: "2023-02-15",
    tanggalLahir: "1999-08-20",
  },
];

// Initial Accounts linked to Employees
const INITIAL_PENGGUNA: PenggunaRecord[] = INITIAL_KARYAWAN.map((emp, index) => {
  let statusAkun: "Aktif" | "Nonaktif" | "Belum Aktif" = "Aktif";
  if (emp.id === "EMP-009") statusAkun = "Nonaktif";
  if (emp.id === "EMP-012" || emp.id === "EMP-014") statusAkun = "Belum Aktif";

  const roleMap: Record<string, "admin" | "finance" | "svp" | "messenger" | "clilen"> = {
    ADMIN: "admin",
    FINANCE: "finance",
    SVP: "svp",
    MESSENGER: "messenger",
    CLILEN: "clilen",
  };

  return {
    id: `USR-${String(index + 1).padStart(3, "0")}`,
    employeeId: emp.id,
    nama: emp.nama,
    jabatan: emp.jabatan,
    email: emp.email,
    role: roleMap[emp.jabatan] || "admin",
    statusAkun,
    terakhirLogin: statusAkun === "Aktif" ? "2026-09-24 14:32" : "-",
    passwordHash: formatDobToPassword(emp.tanggalLahir),
  };
});

/**
 * Convert any date of birth format into strict DDMMYYYY format
 * Example:
 * 10/10/2001 -> 10102001
 * 05/01/2000 -> 05012000 (preserves leading zero)
 * 2001-10-10 -> 10102001
 * 2000-01-05 -> 05012000
 */
export function formatDobToPassword(dobInput: string): string {
  if (!dobInput) return "01011990";
  const str = String(dobInput).trim();

  // YYYY-MM-DD or YYYY/MM/DD
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const y = parts[0];
    const m = parts[1].padStart(2, "0");
    const d = parts[2].padStart(2, "0");
    return `${d}${m}${y}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(str)) {
    const parts = str.split(/[-/]/);
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${d}${m}${y}`;
  }

  // Fallback with standard Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const d = String(parsed.getDate()).padStart(2, "0");
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const y = String(parsed.getFullYear());
    return `${d}${m}${y}`;
  }

  return "01011990";
}

// In-Memory Authoritative Data Store
let isApiMode = APP_CONFIG.dataProvider === "api";
let karyawanList: KaryawanRecord[] = isApiMode ? [] : [...INITIAL_KARYAWAN];
let penggunaList: PenggunaRecord[] = isApiMode ? [] : [...INITIAL_PENGGUNA];
let lastApiError: string | null = null;
let isDataStale = false;
let hasSuccessfullyLoaded = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function syncFromUserRepository() {
  const repoError = userRepository.getError ? userRepository.getError() : null;
  const repoLoading = userRepository.isLoading ? userRepository.isLoading() : false;

  if (repoError) {
    lastApiError = repoError;
    // If previously loaded data exists, keep it but mark as stale
    if (karyawanList.length > 0 || hasSuccessfullyLoaded) {
      isDataStale = true;
    }
    notify();
    return;
  }

  if (repoLoading && !hasSuccessfullyLoaded) {
    notify();
    return;
  }

  const users = userRepository.getAll();
  lastApiError = null;
  isDataStale = false;

  if (!Array.isArray(users)) {
    return;
  }

  hasSuccessfullyLoaded = true;

  if (users.length === 0) {
    penggunaList = [];
    karyawanList = [];
    notify();
    return;
  }

  const roleMap: Record<string, "admin" | "finance" | "svp" | "messenger" | "clilen"> = {
    ADMIN: "admin",
    FINANCE: "finance",
    SVP: "svp",
    MESSENGER: "messenger",
    CLILEN: "clilen",
  };

  const syncedPengguna: PenggunaRecord[] = users.map((u) => {
    const rawJabatan = (u.jabatan || "ADMIN").toUpperCase();
    const role = roleMap[rawJabatan] || "admin";
    const statusAkun = u.status === "Aktif" ? "Aktif" : (u.status === "Nonaktif" ? "Nonaktif" : "Belum Aktif");
    const empId = (u as any).employeeId || (u as any).employee_id || `EMP-${String(u.id).padStart(3, "0")}`;

    return {
      id: String(u.id),
      employeeId: empId,
      nama: u.nama,
      jabatan: rawJabatan,
      email: u.email,
      role,
      statusAkun,
      terakhirLogin: (u as any).lastLogin || (statusAkun === "Aktif" ? "2026-09-24 14:32" : "-"),
      passwordHash: "01011990",
    };
  });

  const syncedKaryawan: KaryawanRecord[] = users.map((u) => {
    const rawJabatan = (u.jabatan || "ADMIN").toUpperCase() as any;
    const empId = (u as any).employeeId || (u as any).employee_id || `EMP-${String(u.id).padStart(3, "0")}`;
    return {
      id: empId,
      nama: u.nama,
      jabatan: rawJabatan,
      wilayah: (u as any).wilayah || "Jakarta",
      status: u.status === "Aktif" ? "Aktif" : "Nonaktif",
      noHp: (u as any).phone || (u as any).noHp || (u as any).telepon || "081234567890",
      email: u.email,
      jenisKelamin: (u as any).jenisKelamin || (u as any).jenis_kelamin || "Laki-laki",
      alamat: (u as any).alamat || "Kantor SUN89",
      gajiPokok: (u as any).gajiPokok ? Number((u as any).gajiPokok) : ((u as any).gaji_pokok ? Number((u as any).gaji_pokok) : 5000000),
      tanggalBergabung: (u as any).tanggalBergabung || (u as any).tanggal_bergabung || "2023-01-01",
      tanggalLahir: (u as any).tanggalLahir || (u as any).tanggal_lahir || "2000-01-01",
    };
  });

  penggunaList = syncedPengguna;
  karyawanList = syncedKaryawan;
  notify();
}

if (isApiMode) {
  syncFromUserRepository();
  userRepository.subscribe(() => {
    syncFromUserRepository();
  });
}

export const karyawanPenggunaAdapter = {
  // ─── KARYAWAN OPERATIONS ──────────────────────────────────────────────
  getKaryawan(): KaryawanRecord[] {
    return [...karyawanList];
  },

  getKaryawanById(id: string): KaryawanRecord | undefined {
    return karyawanList.find((k) => k.id === id);
  },

  addKaryawan(data: Omit<KaryawanRecord, "id">): KaryawanRecord {
    const nextNum = karyawanList.length + 1;
    const newId = `EMP-${String(nextNum).padStart(3, "0")}`;
    const newKaryawan: KaryawanRecord = {
      ...data,
      id: newId,
    };
    karyawanList = [...karyawanList, newKaryawan];

    // Automatically provision user account stub with status "Belum Aktif"
    const nextUsrNum = penggunaList.length + 1;
    const roleMap: Record<string, "admin" | "finance" | "svp" | "messenger" | "clilen"> = {
      ADMIN: "admin",
      FINANCE: "finance",
      SVP: "svp",
      MESSENGER: "messenger",
      CLILEN: "clilen",
    };

    const newPengguna: PenggunaRecord = {
      id: `USR-${String(nextUsrNum).padStart(3, "0")}`,
      employeeId: newId,
      nama: newKaryawan.nama,
      jabatan: newKaryawan.jabatan,
      email: newKaryawan.email,
      role: roleMap[newKaryawan.jabatan] || "admin",
      statusAkun: "Belum Aktif",
      terakhirLogin: "-",
      passwordHash: formatDobToPassword(newKaryawan.tanggalLahir),
    };
    penggunaList = [...penggunaList, newPengguna];

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "CREATE",
      module: "Karyawan",
      details: `Menambahkan karyawan baru: ${newKaryawan.nama} (${newId})`,
      userRole: "admin",
    });

    if (isApiMode) {
      userRepository.createUser({
        nama: data.nama,
        email: data.email,
        jabatan: data.jabatan,
        status: data.status === "Aktif" ? "Aktif" : "Nonaktif",
        employeeId: newId,
        phone: data.noHp,
        wilayah: data.wilayah,
        alamat: data.alamat,
        tanggalLahir: data.tanggalLahir,
        gajiPokok: data.gajiPokok,
        tanggalBergabung: data.tanggalBergabung,
        jenisKelamin: data.jenisKelamin,
      } as any);
    }

    notify();
    return newKaryawan;
  },

  updateKaryawan(id: string, data: Partial<KaryawanRecord>): boolean {
    const idx = karyawanList.findIndex((k) => k.id === id);
    if (idx === -1) return false;

    const updated = { ...karyawanList[idx], ...data };
    karyawanList[idx] = updated;

    // Sync mirrored properties in Pengguna
    penggunaList = penggunaList.map((p) => {
      if (p.employeeId === id) {
        return {
          ...p,
          nama: updated.nama,
          jabatan: updated.jabatan,
          email: updated.email,
          ...(data.tanggalLahir ? { passwordHash: formatDobToPassword(updated.tanggalLahir) } : {}),
        };
      }
      return p;
    });

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "UPDATE",
      module: "Karyawan",
      details: `Mengubah data karyawan: ${updated.nama} (${id})`,
      userRole: "admin",
    });

    if (isApiMode) {
      const match = userRepository.getAll().find((u: any) => u.employeeId === id || u.email === updated.email);
      if (match) {
        userRepository.updateUser(match.id, {
          nama: updated.nama,
          email: updated.email,
          jabatan: updated.jabatan,
          status: updated.status === "Aktif" ? "Aktif" : "Nonaktif",
          employeeId: updated.id,
          phone: updated.noHp,
          wilayah: updated.wilayah,
          alamat: updated.alamat,
          tanggalLahir: updated.tanggalLahir,
          gajiPokok: updated.gajiPokok,
          tanggalBergabung: updated.tanggalBergabung,
          jenisKelamin: updated.jenisKelamin,
        } as any);
      }
    }

    notify();
    return true;
  },

  deleteKaryawan(id: string): boolean {
    const target = karyawanList.find((k) => k.id === id);
    if (!target) return false;

    karyawanList = karyawanList.filter((k) => k.id !== id);
    // Remove associated user account when employee is deleted from HR master
    penggunaList = penggunaList.filter((p) => p.employeeId !== id);

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "DELETE",
      module: "Karyawan",
      details: `Menghapus karyawan: ${target.nama} (${id})`,
      userRole: "admin",
    });

    if (isApiMode) {
      const match = userRepository.getAll().find((u: any) => u.employeeId === id || u.email === target.email);
      if (match) {
        userRepository.deleteUser(match.id);
      }
    }

    notify();
    return true;
  },

  // ─── PENGGUNA OPERATIONS ──────────────────────────────────────────────
  getPengguna(): PenggunaRecord[] {
    return [...penggunaList];
  },

  getPenggunaById(id: string): PenggunaRecord | undefined {
    return penggunaList.find((p) => p.id === id);
  },

  getPenggunaByEmployeeId(empId: string): PenggunaRecord | undefined {
    return penggunaList.find((p) => p.employeeId === empId);
  },

  activateAccount(userId: string): boolean {
    const idx = penggunaList.findIndex((p) => p.id === userId);
    if (idx === -1) return false;

    penggunaList[idx] = {
      ...penggunaList[idx],
      statusAkun: "Aktif",
    };

    const empIdx = karyawanList.findIndex((k) => k.id === penggunaList[idx].employeeId);
    if (empIdx !== -1) {
      karyawanList[empIdx] = { ...karyawanList[empIdx], status: "Aktif" };
    }

    if (isApiMode) {
      userRepository.updateUser(userId, { status: "Aktif" });
    }

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "UPDATE",
      module: "Manajemen Pengguna",
      details: `Mengaktifkan akun pengguna: ${penggunaList[idx].nama} (${userId})`,
      userRole: "admin",
    });

    notify();
    return true;
  },

  deactivateAccount(userId: string): boolean {
    const idx = penggunaList.findIndex((p) => p.id === userId);
    if (idx === -1) return false;

    penggunaList[idx] = {
      ...penggunaList[idx],
      statusAkun: "Nonaktif",
    };

    const empIdx = karyawanList.findIndex((k) => k.id === penggunaList[idx].employeeId);
    if (empIdx !== -1) {
      karyawanList[empIdx] = { ...karyawanList[empIdx], status: "Nonaktif" };
    }

    if (isApiMode) {
      userRepository.updateUser(userId, { status: "Nonaktif" });
    }

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "UPDATE",
      module: "Manajemen Pengguna",
      details: `Menonaktifkan akun pengguna: ${penggunaList[idx].nama} (${userId})`,
      userRole: "admin",
    });

    notify();
    return true;
  },

  updateRole(userId: string, role: PenggunaRecord["role"]): boolean {
    const idx = penggunaList.findIndex((p) => p.id === userId);
    if (idx === -1) return false;

    const savedUserStr = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    let currentUserRole = "admin";
    if (savedUserStr) {
      try { currentUserRole = JSON.parse(savedUserStr).role || "admin"; } catch {}
    }
    const isCallerSvp = currentUserRole === "administrator" || currentUserRole === "svp";

    // Strictly protect SVP account from role change by non-SVP
    if (penggunaList[idx].role === "svp" && !isCallerSvp) {
      return false;
    }

    // Prevent non-SVP from elevating to SVP
    if (role === "svp" && !isCallerSvp) {
      return false;
    }

    penggunaList[idx] = {
      ...penggunaList[idx],
      role,
      jabatan: role.toUpperCase(),
    };

    const empIdx = karyawanList.findIndex((k) => k.id === penggunaList[idx].employeeId);
    if (empIdx !== -1) {
      karyawanList[empIdx] = { ...karyawanList[empIdx], jabatan: role.toUpperCase() as any };
    }

    if (isApiMode) {
      userRepository.updateUser(userId, { jabatan: role.toUpperCase() });
    }

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "UPDATE",
      module: "Manajemen Pengguna",
      details: `Mengubah role pengguna ${penggunaList[idx].nama} menjadi ${role}`,
      userRole: "admin",
    });

    notify();
    return true;
  },

  /**
   * Reset Password strictly using the Employee's Date of Birth formatted as DDMMYYYY
   * Returns the new plaintext password for feedback dialog
   */
  async resetPassword(userId: string): Promise<{ success: boolean; newPassword?: string; error?: string }> {
    const user = penggunaList.find((p) => p.id === userId);
    if (!user) return { success: false, error: "Pengguna tidak ditemukan." };

    const savedUserStr = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    let currentUserRole = "admin";
    if (savedUserStr) {
      try { currentUserRole = JSON.parse(savedUserStr).role || "admin"; } catch {}
    }
    const isCallerSvp = currentUserRole === "administrator" || currentUserRole === "svp";

    if (user.role === "svp" && !isCallerSvp) {
      return { success: false, error: "Akun SVP dilindungi oleh sistem dan tidak dapat direset oleh role lain." };
    }

    const employee = karyawanList.find((k) => k.id === user.employeeId);
    if (!employee || !employee.tanggalLahir) {
      return { success: false, error: "Tanggal lahir karyawan tidak tersedia." };
    }

    const newPassword = formatDobToPassword(employee.tanggalLahir);

    if (isApiMode && userRepository.resetPassword) {
      try {
        await userRepository.resetPassword(userId);
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "Gagal mereset kata sandi pada server.",
        };
      }
    }

    penggunaList = penggunaList.map((p) => {
      if (p.id === userId) {
        return {
          ...p,
          passwordHash: newPassword,
          lastResetAt: new Date().toISOString(),
        };
      }
      return p;
    });

    auditLog.log({
      userId: "usr-admin-system",
      userName: "Administrator",
      action: "RESET_PASSWORD",
      module: "Manajemen Pengguna",
      details: `Reset kata sandi akun ${user.nama} (${userId}) menggunakan tanggal lahir karyawan`,
      userRole: "admin",
    });

    notify();
    return { success: true, newPassword };
  },

  // Reset to initial baseline (for tests)
  _resetToInitial() {
    if (isApiMode) {
      syncFromUserRepository();
    } else {
      karyawanList = [...INITIAL_KARYAWAN];
      penggunaList = [...INITIAL_PENGGUNA];
      notify();
    }
  },

  _setApiMode(enabled: boolean) {
    isApiMode = enabled;
    if (enabled) {
      syncFromUserRepository();
    } else {
      karyawanList = [...INITIAL_KARYAWAN];
      penggunaList = [...INITIAL_PENGGUNA];
      notify();
    }
  },

  isLoading(): boolean {
    if (!isApiMode) return false;
    return Boolean(userRepository.isLoading && userRepository.isLoading() && !hasSuccessfullyLoaded);
  },

  getError(): string | null {
    if (!isApiMode) return null;
    return lastApiError || (userRepository.getError ? userRepository.getError() : null);
  },

  isStale(): boolean {
    return isDataStale;
  },

  async refresh(): Promise<void> {
    const provider = (userRepository as any).getProvider ? (userRepository as any).getProvider() : null;
    if (provider && typeof provider.initFromApi === "function") {
      await provider.initFromApi();
    }
    syncFromUserRepository();
  },

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function useKaryawanPengguna() {
  const [, setTick] = useState(0);

  useEffect(() => {
    return karyawanPenggunaAdapter.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  return {
    karyawan: karyawanPenggunaAdapter.getKaryawan(),
    karyawanList: karyawanPenggunaAdapter.getKaryawan(),
    pengguna: karyawanPenggunaAdapter.getPengguna(),
    penggunaList: karyawanPenggunaAdapter.getPengguna(),
    isLoading: karyawanPenggunaAdapter.isLoading(),
    error: karyawanPenggunaAdapter.getError(),
    isStale: karyawanPenggunaAdapter.isStale(),
    refresh: () => karyawanPenggunaAdapter.refresh(),
    activateAccount: karyawanPenggunaAdapter.activateAccount,
    deactivateAccount: karyawanPenggunaAdapter.deactivateAccount,
    resetPassword: karyawanPenggunaAdapter.resetPassword,
    updateRole: karyawanPenggunaAdapter.updateRole,
    addKaryawan: karyawanPenggunaAdapter.addKaryawan,
    updateKaryawan: karyawanPenggunaAdapter.updateKaryawan,
    deleteKaryawan: karyawanPenggunaAdapter.deleteKaryawan,
  };
}
