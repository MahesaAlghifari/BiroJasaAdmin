/**
 * Authoritative Access Management (Hak Akses)
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Features:
 * - Direct integration with permissionStore (SSoT)
 * - Role selection: SVP, Admin, Finance, Messenger
 * - Fine-grained View (Lihat) & Manage (Kelola) toggles per module
 * - Stage-level action controls for Order Tracking (Stage 4 & Stage 6)
 * - Authoritative "Simpan Hak Akses" persistence with toast "Hak akses berhasil disimpan."
 * - Audit logging of permission changes
 * - "Reset ke Standar" capability
 */

import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  RotateCcw,
  Check,
  LayoutDashboard,
  Wallet,
  Database,
  Users,
  Truck,
  ShoppingCart,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { auditLog } from "../utils/auditLog";
import {
  usePermissionStore,
  permissionStore,
  Role,
  RolePermissions,
  StageActionPermissions,
} from "../data/permissionStore";

interface AccessManagementProps {
  currentUserId: string;
  currentUserName: string;
}

interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  isParent?: boolean;
}

interface ModuleGroup {
  name: string;
  icon: any;
  modules: ModuleDefinition[];
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    modules: [
      { id: "dashboard", label: "Dashboard Utama", description: "Melihat ringkasan metrik, grafik, dan statistik performa biro jasa." },
    ],
  },
  {
    name: "Finance",
    icon: Wallet,
    modules: [
      { id: "finance-profit", label: "Profit", description: "Monitoring margin keuntungan dan rincian transaksi per berkas." },
      { id: "finance-kas-messenger", label: "Kas Messenger", description: "Pencatatan uang jalan operasional dan petty cash kurir." },
      { id: "finance-kas-kantor", label: "Kas Kantor", description: "Kelola kas besar kantor, penerimaan loket, dan mutasi saldo." },
      { id: "finance-pengeluaran", label: "Pengeluaran Operasional", description: "Catat dan verifikasi pos beban pengeluaran harian." },
      { id: "finance-penjualan", label: "Data Penjualan", description: "Laporan rekap omzet dan volume berkas terjual." },
      { id: "finance-tagihan", label: "Tagihan (Invoicing)", description: "Pengelolaan piutang berkas bayar di akhir dan status invoice." },
      { id: "finance-laba-rugi", label: "Laba Rugi (P&L)", description: "Analisis laporan laba bersih berkala." },
    ],
  },
  {
    name: "Master Data",
    icon: Database,
    modules: [
      { id: "master-samsat", label: "Samsat Wilayah", description: "Kelola daftar Samsat asal dan tujuan." },
      { id: "master-biaya-layanan", label: "Biaya Layanan", description: "Atur tarif jasa layanan, opsi nembak, dan biaya kurir." },
      { id: "master-harga-dasar-samsat", label: "Harga Dasar Samsat", description: "Komponen biaya resmi Samsat (PKB, PNBP, STNK, BPKB)." },
    ],
  },
  {
    name: "Manajemen",
    icon: Users,
    modules: [
      { id: "manajemen-karyawan", label: "Data Karyawan", description: "Kelola identitas karyawan, kurir, dan petugas loket." },
      { id: "manajemen-pengguna", label: "Manajemen Pengguna", description: "Kelola akun login sistem dan reset password (DOB)." },
      { id: "access-management", label: "Hak Akses & Role", description: "Konfigurasi matriks izin akses per role (Halaman ini)." },
      { id: "audit-log", label: "Riwayat Aktivitas (Audit)", description: "Log audit seluruh mutasi dan aktivitas operasional." },
    ],
  },
  {
    name: "Messenger Operasional",
    icon: Truck,
    modules: [
      { id: "messenger-task", label: "Messenger Task", description: "Penugasan lapangan, jemput berkas, dan update status loket." },
    ],
  },
  {
    name: "Order Workflow",
    icon: ShoppingCart,
    modules: [
      { id: "buat-order", label: "Buat Order Baru", description: "Pencatatan order loket / antar jemput berkas masuk ke sistem." },
      { id: "order-tracking", label: "Order Tracking", description: "Pipeline operasional 8 tahap pemrosesan berkas." },
      { id: "order-history", label: "Rekap Order (Selesai)", description: "Arsip dan riwayat seluruh order yang telah tuntas." },
    ],
  },
];

export function AccessManagement({ currentUserId, currentUserName }: AccessManagementProps) {
  const { matrix, resetToDefaults } = usePermissionStore();

  const [selectedRole, setSelectedRole] = useState<Role>("admin");
  const [localPermissions, setLocalPermissions] = useState<RolePermissions>(() =>
    JSON.parse(JSON.stringify(permissionStore.getRolePermissions("admin")))
  );
  const [hasChanges, setHasChanges] = useState(false);

  // Sync when selectedRole changes or external matrix updates
  useEffect(() => {
    const canonical = permissionStore.getRolePermissions(selectedRole);
    setLocalPermissions(JSON.parse(JSON.stringify(canonical)));
    setHasChanges(false);
  }, [selectedRole, matrix]);

  const handleToggleView = (moduleId: string) => {
    setLocalPermissions((prev) => {
      const current = prev.modules[moduleId] || { view: false, manage: false };
      const nextView = !current.view;
      return {
        ...prev,
        modules: {
          ...prev.modules,
          [moduleId]: {
            view: nextView,
            // If view is disabled, manage must also be disabled
            manage: nextView ? current.manage : false,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleToggleManage = (moduleId: string) => {
    setLocalPermissions((prev) => {
      const current = prev.modules[moduleId] || { view: false, manage: false };
      const nextManage = !current.manage;
      return {
        ...prev,
        modules: {
          ...prev.modules,
          [moduleId]: {
            // If manage is enabled, view must be true
            view: nextManage ? true : current.view,
            manage: nextManage,
          },
        },
      };
    });
    setHasChanges(true);
  };

  const handleToggleStage = (stageKey: keyof StageActionPermissions) => {
    setLocalPermissions((prev) => ({
      ...prev,
      stages: {
        ...prev.stages,
        [stageKey]: !prev.stages[stageKey],
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    permissionStore.saveRolePermissions(selectedRole, localPermissions);

    auditLog.log({
      userId: currentUserId || "usr-admin",
      userName: currentUserName || "Administrator",
      userRole: "administrator",
      action: "UPDATE",
      module: "Hak Akses",
      details: `Memperbarui matriks hak akses untuk role ${selectedRole.toUpperCase()}`,
      metadata: {
        role: selectedRole,
        permissions: localPermissions,
      },
    });

    toast.success("Hak akses berhasil disimpan.");
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm("Kembalikan seluruh konfigurasi hak akses ke pengaturan standar pabrik?")) {
      resetToDefaults();
      toast.success("Hak akses berhasil direset ke standar.");
      setHasChanges(false);
    }
  };

  const roleMeta: Record<Role, { label: string; desc: string; badge: string; color: string }> = {
    svp: {
      label: "Supervisi & SVP (Administrator)",
      desc: "Akses penuh (Full Access) ke seluruh modul keuangan, master data, konfigurasi hak akses, dan approval supervisi.",
      badge: "Full Privilege",
      color: "border-purple-500 text-purple-600 bg-purple-500/10",
    },
    administrator: {
      label: "Administrator",
      desc: "Identik dengan role SVP.",
      badge: "Full Privilege",
      color: "border-purple-500 text-purple-600 bg-purple-500/10",
    },
    admin: {
      label: "Admin Operasional",
      desc: "Entri order, operasional dokumen, data karyawan, dan master data. View-only pada Stage 4 (Samsat) & Stage 6 (Supervisi). Tanpa akses Keuangan, Pengguna, dan Hak Akses.",
      badge: "Operasional Loket",
      color: "border-blue-500 text-blue-600 bg-blue-500/10",
    },
    finance: {
      label: "Finance & Kasir",
      desc: "Akses penuh seluruh modul Keuangan (Profit, Kas Kantor, Kas Messenger, Pengeluaran, Tagihan, Laba Rugi). Tanpa akses mutasi operasional.",
      badge: "Financial Control",
      color: "border-emerald-500 text-emerald-600 bg-emerald-500/10",
    },
    messenger: {
      label: "Messenger Lapangan",
      desc: "Akses web untuk melihat penugasan lapangan (Messenger Task) dan verifikasi berkas fisik.",
      badge: "Kurir Lapangan",
      color: "border-amber-500 text-amber-600 bg-amber-500/10",
    },
  };

  return (
    <div className="w-full space-y-5 p-4 sm:p-6 lg:p-8 min-w-0 text-left">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-lg sm:text-xl font-semibold text-foreground">
              Manajemen Hak Akses (Role & Permission)
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Atur izin akses navigasi halaman, tombol mutasi data, dan pembatasan aksi workflow per role secara terpusat.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs gap-1.5"
            title="Reset ke pengaturan standar sistem"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Standar
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges && false}
            className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Hak Akses
          </Button>
        </div>
      </div>

      {/* ROLE SELECTOR TABS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {(["svp", "admin", "finance", "messenger"] as Role[]).map((role) => {
          const isSelected = selectedRole === role;
          const meta = roleMeta[role];
          return (
            <Card
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`p-3.5 cursor-pointer transition-all border ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                  : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-xs text-foreground uppercase tracking-wide">
                  {role === "svp" ? "SVP / SPV" : role.toUpperCase()}
                </span>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${meta.color}`}>
                  {meta.badge}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 line-clamp-2">
                {meta.label}
              </p>
            </Card>
          );
        })}
      </div>

      {/* ACTIVE ROLE SUMMARY BANNER */}
      <Card className="p-3.5 border border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground">
              Konfigurasi Matriks: <strong className="text-primary">{selectedRole.toUpperCase()}</strong>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 max-w-2xl">
              {roleMeta[selectedRole].desc}
            </p>
          </div>
        </div>

        {hasChanges && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs shrink-0 self-start sm:self-center">
            Ada Perubahan Belum Disimpan
          </Badge>
        )}
      </Card>

      {/* SPECIAL WORKFLOW STAGE ACTIONS (ORDER TRACKING STAGE 4 & 6) */}
      <Card className="p-4 border border-border bg-card space-y-3">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Pembatasan Aksi Mutasi Tahap Order Tracking (Stage Actions)
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Kontrol apakah role ini diizinkan mengeksekusi mutasi atau hanya memiliki hak lihat (View-Only).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          {/* Stage 4: Proses Samsat */}
          <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">Stage 4 — Proses Samsat</span>
                {localPermissions.stages?.stage4_prosesSamsat ? (
                  <Badge status="success" className="text-[10px]">Aksi Diizinkan</Badge>
                ) : (
                  <Badge status="neutral" className="text-[10px]">Hanya Lihat (View Only)</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tombol 'Simpan Progress' dan 'Lanjut ke Verifikasi Ulang'. Untuk Admin disetel default: View-Only.
              </p>
            </div>
            <Switch
              checked={Boolean(localPermissions.stages?.stage4_prosesSamsat)}
              onCheckedChange={() => handleToggleStage("stage4_prosesSamsat")}
              aria-label="Toggle Stage 4 mutation permission"
            />
          </div>

          {/* Stage 6: Supervisi */}
          <div className="p-3 rounded-lg border border-border bg-muted/20 flex items-start justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-foreground">Stage 6 — Supervisi (SPV)</span>
                {localPermissions.stages?.stage6_supervisi ? (
                  <Badge status="success" className="text-[10px]">Approval Diizinkan</Badge>
                ) : (
                  <Badge status="neutral" className="text-[10px]">Hanya Lihat (View Only)</Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tombol 'Approve Supervisi & Lanjut ke Pengantaran'. Wajib dibatasi untuk Supervisor / SVP.
              </p>
            </div>
            <Switch
              checked={Boolean(localPermissions.stages?.stage6_supervisi)}
              onCheckedChange={() => handleToggleStage("stage6_supervisi")}
              aria-label="Toggle Stage 6 mutation permission"
            />
          </div>
        </div>
      </Card>

      {/* DETAILED MODULE & SUBMODULE PERMISSION MATRIX */}
      <div className="space-y-4">
        {MODULE_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          return (
            <Card key={group.name} className="p-4 border border-border bg-card space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <GroupIcon className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">
                    Modul {group.name}
                  </h3>
                </div>
                <div className="flex items-center gap-6 pr-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <span className="w-16 text-center">Lihat</span>
                  <span className="w-16 text-center">Kelola</span>
                </div>
              </div>

              <div className="space-y-2 divide-y divide-border/40">
                {group.modules.map((mod) => {
                  const perm = localPermissions.modules[mod.id] || { view: false, manage: false };
                  return (
                    <div
                      key={mod.id}
                      className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="space-y-0.5 max-w-xl">
                        <Label className="text-xs font-medium text-foreground cursor-pointer" onClick={() => handleToggleView(mod.id)}>
                          {mod.label}
                        </Label>
                        <p className="text-[11px] text-muted-foreground">{mod.description}</p>
                      </div>

                      <div className="flex items-center gap-6 self-end sm:self-center pr-2">
                        {/* Toggle Lihat (View) */}
                        <div className="w-16 flex justify-center">
                          <Switch
                            checked={perm.view}
                            onCheckedChange={() => handleToggleView(mod.id)}
                            aria-label={`Toggle view for ${mod.label}`}
                          />
                        </div>

                        {/* Toggle Kelola (Manage) */}
                        <div className="w-16 flex justify-center">
                          <Switch
                            checked={perm.manage}
                            disabled={!perm.view}
                            onCheckedChange={() => handleToggleManage(mod.id)}
                            aria-label={`Toggle manage for ${mod.label}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="sticky bottom-4 z-20 p-3 bg-card/95 backdrop-blur-md rounded-xl border border-border shadow-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <span>
            Perubahan akan langsung mengupdate menu navigasi, route guard, dan tombol aksi untuk seluruh akun dengan role <strong>{selectedRole.toUpperCase()}</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            onClick={handleSave}
            className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan Hak Akses
          </Button>
        </div>
      </div>
    </div>
  );
}
