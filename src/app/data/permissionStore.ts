/**
 * Authoritative Permission & Access Control Store (SSoT)
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides:
 * - 4 core roles: SVP (Administrator), Admin, Finance, Messenger
 * - Fine-grained module & submodule permissions (Lihat / Kelola)
 * - Order Tracking stage-level action permissions (Stage 4 & Stage 6 gating)
 * - Navigation menu filtering helper
 * - Route / page guard helper
 * - Reactive state with local persistence
 */

import { useState, useEffect } from "react";
import { MenuItem } from "../config/navigationConfig";

export type Role = "svp" | "administrator" | "admin" | "finance" | "messenger";

export interface ModulePermission {
  view: boolean;
  manage: boolean;
}

export interface StageActionPermissions {
  stage1_verifikasi: boolean;
  stage2_penjadwalan: boolean;
  stage3_verifikasiFisik: boolean;
  stage4_prosesSamsat: boolean; // Stage 4: Admin must be FALSE (view only)
  stage5_verifikasiUlang: boolean;
  stage6_supervisi: boolean;   // Stage 6: Admin must be FALSE (view only)
  stage7_pengantaran: boolean;
  stage8_diterima: boolean;
}

export interface RolePermissions {
  modules: Record<string, ModulePermission>;
  stages: StageActionPermissions;
}

export type PermissionMatrix = Record<Role, RolePermissions>;

const STORAGE_KEY = "admin_sun89_permissions_v1";

// Helper to normalize role
export function normalizeRole(role: string | null | undefined): Role {
  if (!role) return "admin";
  const r = role.toLowerCase().trim();
  if (r === "administrator" || r === "svp") return "svp";
  if (r === "finance") return "finance";
  if (r === "messenger") return "messenger";
  return "admin";
}

// Canonical Default Permissions Matrix
const DEFAULT_PERMISSIONS: PermissionMatrix = {
  // 1. SVP (Super User / Administrator) — FULL ACCESS
  svp: {
    modules: {
      dashboard: { view: true, manage: true },
      // Finance
      finance: { view: true, manage: true },
      "finance-profit": { view: true, manage: true },
      "finance-kas-messenger": { view: true, manage: true },
      "finance-kas-kantor": { view: true, manage: true },
      "finance-pengeluaran": { view: true, manage: true },
      "finance-penjualan": { view: true, manage: true },
      "finance-tagihan": { view: true, manage: true },
      "finance-laba-rugi": { view: true, manage: true },
      // Master Data
      "master-data": { view: true, manage: true },
      "master-samsat": { view: true, manage: true },
      "master-biaya-layanan": { view: true, manage: true },
      "master-harga-dasar-samsat": { view: true, manage: true },
      // Manajemen
      manajemen: { view: true, manage: true },
      "manajemen-karyawan": { view: true, manage: true },
      "master-karyawan": { view: true, manage: true },
      "manajemen-pengguna": { view: true, manage: true },
      "master-pengguna": { view: true, manage: true },
      "access-management": { view: true, manage: true },
      "audit-log": { view: true, manage: true },
      // Messenger
      "messenger-menu": { view: true, manage: true },
      "messenger-task": { view: true, manage: true },
      // Order
      "order-menu": { view: true, manage: true },
      "buat-order": { view: true, manage: true },
      "order-tracking": { view: true, manage: true },
      "order-history": { view: true, manage: true },
      // Generic
      settings: { view: true, manage: true },
      profile: { view: true, manage: true },
    },
    stages: {
      stage1_verifikasi: true,
      stage2_penjadwalan: true,
      stage3_verifikasiFisik: true,
      stage4_prosesSamsat: true,
      stage5_verifikasiUlang: true,
      stage6_supervisi: true,
      stage7_pengantaran: true,
      stage8_diterima: true,
    },
  },

  // Administrator alias -> maps identically to svp
  administrator: {
    modules: {
      dashboard: { view: true, manage: true },
      finance: { view: true, manage: true },
      "finance-profit": { view: true, manage: true },
      "finance-kas-messenger": { view: true, manage: true },
      "finance-kas-kantor": { view: true, manage: true },
      "finance-pengeluaran": { view: true, manage: true },
      "finance-penjualan": { view: true, manage: true },
      "finance-tagihan": { view: true, manage: true },
      "finance-laba-rugi": { view: true, manage: true },
      "master-data": { view: true, manage: true },
      "master-samsat": { view: true, manage: true },
      "master-biaya-layanan": { view: true, manage: true },
      "master-harga-dasar-samsat": { view: true, manage: true },
      manajemen: { view: true, manage: true },
      "manajemen-karyawan": { view: true, manage: true },
      "master-karyawan": { view: true, manage: true },
      "manajemen-pengguna": { view: true, manage: true },
      "master-pengguna": { view: true, manage: true },
      "access-management": { view: true, manage: true },
      "audit-log": { view: true, manage: true },
      "messenger-menu": { view: true, manage: true },
      "messenger-task": { view: true, manage: true },
      "order-menu": { view: true, manage: true },
      "buat-order": { view: true, manage: true },
      "order-tracking": { view: true, manage: true },
      "order-history": { view: true, manage: true },
      settings: { view: true, manage: true },
      profile: { view: true, manage: true },
    },
    stages: {
      stage1_verifikasi: true,
      stage2_penjadwalan: true,
      stage3_verifikasiFisik: true,
      stage4_prosesSamsat: true,
      stage5_verifikasiUlang: true,
      stage6_supervisi: true,
      stage7_pengantaran: true,
      stage8_diterima: true,
    },
  },

  // 2. ADMIN
  // Allowed: Dashboard, Order (Buat Order, Tracking, Rekap), Master Data (Samsat, Biaya Layanan, Harga Dasar), Manajemen Karyawan, Messenger Task
  // Forbidden: Finance (All), Manajemen Pengguna, Hak Akses, Riwayat Aktivitas
  // Stage Gating: Stage 4 (Proses Samsat) VIEW ONLY, Stage 6 (Supervisi) VIEW ONLY
  admin: {
    modules: {
      dashboard: { view: true, manage: true },
      // Finance: NO ACCESS
      finance: { view: false, manage: false },
      "finance-profit": { view: false, manage: false },
      "finance-kas-messenger": { view: false, manage: false },
      "finance-kas-kantor": { view: false, manage: false },
      "finance-pengeluaran": { view: false, manage: false },
      "finance-penjualan": { view: false, manage: false },
      "finance-tagihan": { view: false, manage: false },
      "finance-laba-rugi": { view: false, manage: false },
      // Master Data: FULL ACCESS
      "master-data": { view: true, manage: true },
      "master-samsat": { view: true, manage: true },
      "master-biaya-layanan": { view: true, manage: true },
      "master-harga-dasar-samsat": { view: true, manage: true },
      // Manajemen: ONLY KARYAWAN
      manajemen: { view: true, manage: true },
      "manajemen-karyawan": { view: true, manage: true },
      "master-karyawan": { view: true, manage: true },
      "manajemen-pengguna": { view: false, manage: false },
      "master-pengguna": { view: false, manage: false },
      "access-management": { view: false, manage: false },
      "audit-log": { view: false, manage: false },
      // Messenger
      "messenger-menu": { view: true, manage: true },
      "messenger-task": { view: true, manage: true },
      // Order: FULL ACCESS
      "order-menu": { view: true, manage: true },
      "buat-order": { view: true, manage: true },
      "order-tracking": { view: true, manage: true },
      "order-history": { view: true, manage: true },
      // Generic
      settings: { view: true, manage: true },
      profile: { view: true, manage: true },
    },
    stages: {
      stage1_verifikasi: true,
      stage2_penjadwalan: true,
      stage3_verifikasiFisik: true,
      stage4_prosesSamsat: false, // ADMIN CANNOT MUTATE STAGE 4
      stage5_verifikasiUlang: true,
      stage6_supervisi: false,    // ADMIN CANNOT MUTATE STAGE 6
      stage7_pengantaran: true,
      stage8_diterima: true,
    },
  },

  // 3. FINANCE
  // Allowed: Dashboard, Finance (All: Profit, Kas Messenger, Kas Kantor, Pengeluaran, Penjualan, Tagihan, Laba Rugi), View Order Tracking / Rekap Order
  // Forbidden: Master Data, Hak Akses, Manajemen Pengguna, Manajemen Karyawan, Buat Order, Order Stage Mutations
  finance: {
    modules: {
      dashboard: { view: true, manage: false },
      // Finance: FULL ACCESS
      finance: { view: true, manage: true },
      "finance-profit": { view: true, manage: true },
      "finance-kas-messenger": { view: true, manage: true },
      "finance-kas-kantor": { view: true, manage: true },
      "finance-pengeluaran": { view: true, manage: true },
      "finance-penjualan": { view: true, manage: true },
      "finance-tagihan": { view: true, manage: true },
      "finance-laba-rugi": { view: true, manage: true },
      // Master Data: NO ACCESS
      "master-data": { view: false, manage: false },
      "master-samsat": { view: false, manage: false },
      "master-biaya-layanan": { view: false, manage: false },
      "master-harga-dasar-samsat": { view: false, manage: false },
      // Manajemen: NO ACCESS
      manajemen: { view: false, manage: false },
      "manajemen-karyawan": { view: false, manage: false },
      "master-karyawan": { view: false, manage: false },
      "manajemen-pengguna": { view: false, manage: false },
      "master-pengguna": { view: false, manage: false },
      "access-management": { view: false, manage: false },
      "audit-log": { view: false, manage: false },
      // Messenger: NO ACCESS
      "messenger-menu": { view: false, manage: false },
      "messenger-task": { view: false, manage: false },
      // Order: View-Only tracking & Rekap (No Buat Order, No Mutation)
      "order-menu": { view: true, manage: false },
      "buat-order": { view: false, manage: false },
      "order-tracking": { view: true, manage: false },
      "order-history": { view: true, manage: false },
      // Generic
      settings: { view: false, manage: false },
      profile: { view: true, manage: false },
    },
    stages: {
      stage1_verifikasi: true, // Can verify payment
      stage2_penjadwalan: false,
      stage3_verifikasiFisik: false,
      stage4_prosesSamsat: false,
      stage5_verifikasiUlang: false,
      stage6_supervisi: false,
      stage7_pengantaran: false,
      stage8_diterima: false,
    },
  },

  // 4. MESSENGER
  // Allowed: Dashboard, Messenger Task, Profile
  // Forbidden: Finance, Master Data, Manajemen Karyawan, Manajemen Pengguna, Hak Akses, Riwayat Aktivitas, Buat Order
  messenger: {
    modules: {
      dashboard: { view: true, manage: false },
      // Finance: NO ACCESS
      finance: { view: false, manage: false },
      "finance-profit": { view: false, manage: false },
      "finance-kas-messenger": { view: false, manage: false },
      "finance-kas-kantor": { view: false, manage: false },
      "finance-pengeluaran": { view: false, manage: false },
      "finance-penjualan": { view: false, manage: false },
      "finance-tagihan": { view: false, manage: false },
      "finance-laba-rugi": { view: false, manage: false },
      // Master Data: NO ACCESS
      "master-data": { view: false, manage: false },
      "master-samsat": { view: false, manage: false },
      "master-biaya-layanan": { view: false, manage: false },
      "master-harga-dasar-samsat": { view: false, manage: false },
      // Manajemen: NO ACCESS
      manajemen: { view: false, manage: false },
      "manajemen-karyawan": { view: false, manage: false },
      "master-karyawan": { view: false, manage: false },
      "manajemen-pengguna": { view: false, manage: false },
      "master-pengguna": { view: false, manage: false },
      "access-management": { view: false, manage: false },
      "audit-log": { view: false, manage: false },
      // Messenger: FULL ACCESS TO TASKS
      "messenger-menu": { view: true, manage: true },
      "messenger-task": { view: true, manage: true },
      // Order: NO ACCESS TO ORDER ENTRY
      "order-menu": { view: false, manage: false },
      "buat-order": { view: false, manage: false },
      "order-tracking": { view: false, manage: false },
      "order-history": { view: false, manage: false },
      // Generic
      settings: { view: false, manage: false },
      profile: { view: true, manage: false },
    },
    stages: {
      stage1_verifikasi: false,
      stage2_penjadwalan: false,
      stage3_verifikasiFisik: false,
      stage4_prosesSamsat: false,
      stage5_verifikasiUlang: false,
      stage6_supervisi: false,
      stage7_pengantaran: false,
      stage8_diterima: false,
    },
  },
};

class PermissionStore {
  private matrix: PermissionMatrix;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.matrix = this.loadFromStorage();
  }

  private loadFromStorage(): PermissionMatrix {
    if (typeof window === "undefined" || !window.localStorage) {
      return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure all roles exist
        return {
          svp: parsed.svp || DEFAULT_PERMISSIONS.svp,
          administrator: parsed.administrator || parsed.svp || DEFAULT_PERMISSIONS.administrator,
          admin: parsed.admin || DEFAULT_PERMISSIONS.admin,
          finance: parsed.finance || DEFAULT_PERMISSIONS.finance,
          messenger: parsed.messenger || DEFAULT_PERMISSIONS.messenger,
        };
      }
    } catch {
      // Fallback
    }
    return JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
  }

  private saveToStorage(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.matrix));
      } catch {
        // Safe ignore
      }
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Safe ignore
      }
    });
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getMatrix(): PermissionMatrix {
    return this.matrix;
  }

  public getRolePermissions(role: string | null | undefined): RolePermissions {
    const norm = normalizeRole(role);
    return this.matrix[norm] || DEFAULT_PERMISSIONS[norm];
  }

  /**
   * Check if a role can VIEW a specific page / route
   */
  public canViewPage(role: string | null | undefined, pageId: string): boolean {
    const norm = normalizeRole(role);
    if (norm === "svp") return true;

    const perms = this.getRolePermissions(norm);
    
    // Direct match
    const directPerm = perms.modules[pageId];
    if (directPerm !== undefined) {
      return directPerm.view;
    }

    // Prefix match for finance sub-pages
    if (pageId.startsWith("finance-") || pageId === "finance") {
      return perms.modules["finance"]?.view ?? false;
    }

    // Prefix match for master data
    if (pageId.startsWith("master-")) {
      return perms.modules["master-data"]?.view ?? false;
    }

    // Manajemen aliases
    if (pageId === "manajemen-karyawan" || pageId === "master-karyawan") {
      return perms.modules["manajemen-karyawan"]?.view ?? false;
    }
    if (pageId === "manajemen-pengguna" || pageId === "master-pengguna") {
      return perms.modules["manajemen-pengguna"]?.view ?? false;
    }

    // Profile & settings default
    if (pageId === "profile") return true;
    if (pageId === "settings") return norm === "admin";

    return false;
  }

  /**
   * Check if a role can MANAGE / MUTATE a specific module
   */
  public canManageModule(role: string | null | undefined, moduleId: string): boolean {
    const norm = normalizeRole(role);
    if (norm === "svp") return true;

    const perms = this.getRolePermissions(norm);
    return perms.modules[moduleId]?.manage ?? false;
  }

  /**
   * Check if a role can execute actions / mutations on a specific workflow stage
   */
  public canManageStage(role: string | null | undefined, stageNumber: number): boolean {
    const norm = normalizeRole(role);
    if (norm === "svp") return true;

    const stages = this.getRolePermissions(norm).stages;
    switch (stageNumber) {
      case 1:
        return stages.stage1_verifikasi;
      case 2:
        return stages.stage2_penjadwalan;
      case 3:
        return stages.stage3_verifikasiFisik;
      case 4:
        return stages.stage4_prosesSamsat; // FALSE for Admin
      case 5:
        return stages.stage5_verifikasiUlang;
      case 6:
        return stages.stage6_supervisi;   // FALSE for Admin
      case 7:
        return stages.stage7_pengantaran;
      case 8:
        return stages.stage8_diterima;
      default:
        return false;
    }
  }

  /**
   * Filter sidebar menu items hierarchically according to role permissions
   */
  public getFilteredMenuItems(role: string | null | undefined, rawItems: MenuItem[]): MenuItem[] {
    const norm = normalizeRole(role);
    if (norm === "svp") return rawItems;

    return rawItems
      .map((item) => {
        // If item has no sub-items
        if (!item.subItems || item.subItems.length === 0) {
          if (this.canViewPage(norm, item.id)) {
            return item;
          }
          return null;
        }

        // If item has sub-items, filter visible sub-items
        const visibleSubItems = item.subItems.filter((sub) => this.canViewPage(norm, sub.id));
        if (visibleSubItems.length > 0) {
          return {
            ...item,
            subItems: visibleSubItems,
          };
        }
        return null;
      })
      .filter(Boolean) as MenuItem[];
  }

  /**
   * Update permissions for a specific role and module
   */
  public updateModulePermission(
    role: Role,
    moduleId: string,
    permissions: Partial<ModulePermission>
  ): void {
    const targetRole = role === "administrator" ? "svp" : role;
    if (!this.matrix[targetRole]) return;

    if (!this.matrix[targetRole].modules[moduleId]) {
      this.matrix[targetRole].modules[moduleId] = { view: false, manage: false };
    }

    if (permissions.view !== undefined) {
      this.matrix[targetRole].modules[moduleId].view = permissions.view;
    }
    if (permissions.manage !== undefined) {
      this.matrix[targetRole].modules[moduleId].manage = permissions.manage;
    }

    // Keep administrator in sync with svp
    if (targetRole === "svp") {
      this.matrix.administrator = JSON.parse(JSON.stringify(this.matrix.svp));
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Update stage-level action permission for a role
   */
  public updateStagePermission(
    role: Role,
    stageKey: keyof StageActionPermissions,
    allowed: boolean
  ): void {
    const targetRole = role === "administrator" ? "svp" : role;
    if (!this.matrix[targetRole]) return;

    this.matrix[targetRole].stages[stageKey] = allowed;

    if (targetRole === "svp") {
      this.matrix.administrator = JSON.parse(JSON.stringify(this.matrix.svp));
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Save entire role permissions structure (used by AccessManagement)
   */
  public saveRolePermissions(role: Role, permissions: RolePermissions): void {
    const targetRole = role === "administrator" ? "svp" : role;
    this.matrix[targetRole] = JSON.parse(JSON.stringify(permissions));

    if (targetRole === "svp") {
      this.matrix.administrator = JSON.parse(JSON.stringify(permissions));
    }

    this.saveToStorage();
    this.notify();
  }

  /**
   * Reset all permissions to canonical defaults
   */
  public resetToDefaults(): void {
    this.matrix = JSON.parse(JSON.stringify(DEFAULT_PERMISSIONS));
    this.saveToStorage();
    this.notify();
  }
}

export const permissionStore = new PermissionStore();

/**
 * React Hook for PermissionStore
 */
export function usePermissionStore() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    return permissionStore.subscribe(() => {
      setVersion((v) => v + 1);
    });
  }, []);

  return {
    matrix: permissionStore.getMatrix(),
    canViewPage: (role: string | null | undefined, pageId: string) =>
      permissionStore.canViewPage(role, pageId),
    canManageModule: (role: string | null | undefined, moduleId: string) =>
      permissionStore.canManageModule(role, moduleId),
    canManageStage: (role: string | null | undefined, stageNumber: number) =>
      permissionStore.canManageStage(role, stageNumber),
    getFilteredMenuItems: (role: string | null | undefined, rawItems: MenuItem[]) =>
      permissionStore.getFilteredMenuItems(role, rawItems),
    updateModulePermission: permissionStore.updateModulePermission.bind(permissionStore),
    updateStagePermission: permissionStore.updateStagePermission.bind(permissionStore),
    saveRolePermissions: permissionStore.saveRolePermissions.bind(permissionStore),
    resetToDefaults: permissionStore.resetToDefaults.bind(permissionStore),
  };
}
