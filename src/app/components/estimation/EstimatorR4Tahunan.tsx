import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import {
  Calculator,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Settings2,
  RotateCcw,
  Info,
  Car,
  FileCheck,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { useEstimationStore } from "../../data/estimationStore";
import {
  ProgramSamsat,
  KondisiBerkas,
  WilayahAccId,
  EstimationInput,
} from "../../../domain/estimation/types";

interface EstimatorR4TahunanProps {
  initialPkb?: number;
  initialDueDate?: string;
  onApplyEstimate?: (total: number, details: any) => void;
  className?: string;
}

export function EstimatorR4Tahunan({
  initialPkb,
  initialDueDate,
  onApplyEstimate,
  className,
}: EstimatorR4TahunanProps) {
  const store = useEstimationStore();
  const template = store.getTemplate("template-pajak-tahunan-r4");

  // Form Inputs
  const [pkbInput, setPkbInput] = useState<string>(initialPkb ? initialPkb.toString() : "3964000");
  const [dueDate, setDueDate] = useState<string>(initialDueDate || "2023-12-23");
  const [estimateDate, setEstimateDate] = useState<string>("2026-10-17"); // Default or today
  const [programSamsat, setProgramSamsat] = useState<ProgramSamsat>("NORMAL");
  const [kondisiBerkas, setKondisiBerkas] = useState<KondisiBerkas>("LENGKAP");
  const [wilayahAccId, setWilayahAccId] = useState<WilayahAccId>("DKI Jakarta");
  const [customerName, setCustomerName] = useState<string>("");
  const [nopol, setNopol] = useState<string>("");

  // Manual Component Overrides
  const [manualValues, setManualValues] = useState<Record<string, number>>({
    jr: 0,
    etle: 0,
    "pnbp-nopil": 0,
    "stnk-hilang": 0,
    "pemekaran-wilayah": 0,
  });

  // Template Config Dialog
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    koefisienDenda: template.koefisienDenda.toString(),
    biayaJasa: template.biayaJasa.toString(),
    swdklljPokok: template.swdklljPokok.toString(),
    biayaCetakSkp: template.biayaCetakSkp.toString(),
  });

  // Calculation Input
  const parsedPkb = useMemo(() => {
    const val = parseFloat(pkbInput.replace(/[^\d.-]/g, ""));
    return isNaN(val) || !isFinite(val) || val < 0 ? 0 : val;
  }, [pkbInput]);

  const calculationInput: EstimationInput = useMemo(() => {
    return {
      pkbDasar: parsedPkb,
      tanggalJatuhTempo: dueDate,
      tanggalEstimasi: estimateDate,
      programSamsat,
      kondisiBerkas,
      wilayahAccId,
      manualValues,
      customerName,
      nopol,
    };
  }, [
    parsedPkb,
    dueDate,
    estimateDate,
    programSamsat,
    kondisiBerkas,
    wilayahAccId,
    manualValues,
    customerName,
    nopol,
  ]);

  // Execute pure calculation
  const result = useMemo(() => {
    return store.calculate(calculationInput, template.id);
  }, [store, calculationInput, template.id]);

  // Handlers for manual inputs
  const handleManualChange = (id: string, valueStr: string) => {
    const num = parseFloat(valueStr.replace(/[^\d.-]/g, ""));
    setManualValues((prev) => ({
      ...prev,
      [id]: isNaN(num) || !isFinite(num) || num < 0 ? 0 : num,
    }));
  };

  // Config Modal handlers
  const handleOpenConfig = () => {
    setConfigForm({
      koefisienDenda: template.koefisienDenda.toString(),
      biayaJasa: template.biayaJasa.toString(),
      swdklljPokok: template.swdklljPokok.toString(),
      biayaCetakSkp: template.biayaCetakSkp.toString(),
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = () => {
    const koef = parseFloat(configForm.koefisienDenda);
    const jasa = parseInt(configForm.biayaJasa, 10);
    const swd = parseInt(configForm.swdklljPokok, 10);
    const skp = parseInt(configForm.biayaCetakSkp, 10);

    if (isNaN(koef) || koef < 0 || isNaN(jasa) || isNaN(swd) || isNaN(skp)) {
      toast.error("Parameter konfigurasi tidak valid!");
      return;
    }

    store.updateTemplateParams(template.id, {
      koefisienDenda: koef,
      biayaJasa: jasa,
      swdklljPokok: swd,
      biayaCetakSkp: skp,
    });
    setIsConfigOpen(false);
    toast.success("Konfigurasi template berhasil diperbarui dan tersimpan!");
  };

  const handleResetTemplate = () => {
    store.resetToDefault(template.id);
    setIsConfigOpen(false);
    toast.success("Konfigurasi template dikembalikan ke default Excel.");
  };

  return (
    <div className={cn("space-y-6 text-left", className)}>
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 border border-blue-500/20">
              <Car className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-foreground tracking-tight">
              Kalkulator Estimasi Pajak Tahunan Mobil (R4)
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Formula resmi perpanjangan pajak tahunan Mobil (R4)
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenConfig}
            className="h-8 text-xs gap-1.5 border-border hover:bg-muted/50"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            Konfigurasi Template
          </Button>
        </div>
      </div>

      {/* Main Grid: Inputs on Left, Real-time Results on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: User Inputs */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-3 border-b border-border/60 bg-muted/20">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-primary" />
                Parameter Perhitungan
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Isi data pokok PKB dan masa pajak kendaraan
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3.5">
              {/* PKB Dasar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="pkb-dasar" className="text-xs font-semibold text-foreground">
                    PKB Dasar Tahunan (STNK) *
                  </Label>
                </div>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="pkb-dasar"
                    type="text"
                    value={pkbInput}
                    onChange={(e) => setPkbInput(e.target.value)}
                    placeholder="3.964.000"
                    className="pl-9 font-mono text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Tanggal Jatuh Tempo & Tanggal Estimasi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="due-date" className="text-xs font-semibold text-foreground">
                      Jatuh Tempo Pajak *
                    </Label>
                  </div>
                  <Input
                    id="due-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="estimate-date" className="text-xs font-semibold text-foreground">
                      Tanggal Estimasi
                    </Label>
                  </div>
                  <Input
                    id="estimate-date"
                    type="date"
                    value={estimateDate}
                    onChange={(e) => setEstimateDate(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Program Samsat */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-foreground">
                    Program Samsat *
                  </Label>
                </div>
                <RadioGroup
                  value={programSamsat}
                  onValueChange={(val: ProgramSamsat) => setProgramSamsat(val)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div
                    className={cn(
                      "flex items-center space-x-2 border rounded-md p-2.5 cursor-pointer transition-all",
                      programSamsat === "NORMAL"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:bg-muted/40"
                    )}
                    onClick={() => setProgramSamsat("NORMAL")}
                  >
                    <RadioGroupItem value="NORMAL" id="prog-normal" />
                    <Label htmlFor="prog-normal" className="text-xs cursor-pointer">
                      NORMAL
                    </Label>
                  </div>
                  <div
                    className={cn(
                      "flex items-center space-x-2 border rounded-md p-2.5 cursor-pointer transition-all",
                      programSamsat === "FREE Biaya Denda"
                        ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium"
                        : "border-border hover:bg-muted/40"
                    )}
                    onClick={() => setProgramSamsat("FREE Biaya Denda")}
                  >
                    <RadioGroupItem value="FREE Biaya Denda" id="prog-free" />
                    <Label htmlFor="prog-free" className="text-xs cursor-pointer">
                      FREE Biaya Denda
                    </Label>
                  </div>
                </RadioGroup>
                {programSamsat === "FREE Biaya Denda" && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    Kedua denda PKB dinolkan. Denda SWDKLLJ tetap berlaku sesuai aturan workbook.
                  </p>
                )}
              </div>

              {/* Opsional Section */}
              <div className="border-t border-border/70 pt-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                  Data Tambahan & ACC ID (Opsional)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground/80">
                      Kelengkapan Berkas
                    </Label>
                    <Select
                      value={kondisiBerkas}
                      onValueChange={(val: KondisiBerkas) => setKondisiBerkas(val)}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LENGKAP">LENGKAP (Ada KTP)</SelectItem>
                        <SelectItem value="TIDAK ADA KTP">TIDAK ADA KTP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-foreground/80">
                      Wilayah ACC ID
                    </Label>
                    <Select
                      value={wilayahAccId}
                      onValueChange={(val: WilayahAccId) => setWilayahAccId(val)}
                    >
                      <SelectTrigger className="h-8.5 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NON ACC ID">NON ACC ID</SelectItem>
                        <SelectItem value="DKI Jakarta">DKI Jakarta</SelectItem>
                        <SelectItem value="Bogor">Bogor</SelectItem>
                        <SelectItem value="Tanggerang">Tangerang</SelectItem>
                        <SelectItem value="Depok">Depok</SelectItem>
                        <SelectItem value="Bekasi">Bekasi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Optional Customer info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Nama Konsumen (Opsional)</Label>
                    <Input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Bp. Hendra"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Plat Nomor (Opsional)</Label>
                    <Input
                      type="text"
                      value={nopol}
                      onChange={(e) => setNopol(e.target.value.toUpperCase())}
                      placeholder="B 2989 UZL"
                      className="text-xs font-mono h-8 uppercase"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Calculation Summary Card */}
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Durasi Keterlambatan Pajak
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {result.durasiKeterlambatan}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground">
                  {result.tahunTunggakan} Tahun, {result.bulanTunggakan} Bulan
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Dihitung Berdasarkan Kalender
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Real-Time Results & Component Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {/* Grand Total Banner */}
          <Card className="border-2 border-primary/40 bg-gradient-to-br from-primary/5 via-card to-blue-500/5 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                  Total Estimasi Akhir
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-foreground mt-1">
                  Rp {result.totalEstimasi.toLocaleString("id-ID")}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Termasuk Cetak SKP, Jasa, dan pembulatan kelipatan Rp 1.000
                </p>
              </div>

              {onApplyEstimate && (
                <Button
                  onClick={() => onApplyEstimate(result.totalEstimasi, result)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5 shadow-sm"
                >
                  Terapkan ke Order
                </Button>
              )}
            </div>

            {/* Sub-totals Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-border/80 bg-muted/40 divide-x divide-border/60 text-xs text-center py-2.5">
              <div className="px-2">
                <div className="text-[10px] text-muted-foreground">Total Pokok PKB</div>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  Rp {result.totalPkb.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="px-2">
                <div className="text-[10px] text-muted-foreground">Total Denda PKB</div>
                <div className="font-mono font-semibold text-destructive mt-0.5">
                  Rp {result.totalDendaPkb.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="px-2">
                <div className="text-[10px] text-muted-foreground">Total SWDKLLJ</div>
                <div className="font-mono font-semibold text-foreground mt-0.5">
                  Rp {result.totalSwdkllj.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="px-2">
                <div className="text-[10px] text-muted-foreground">Total Denda SWD</div>
                <div className="font-mono font-semibold text-destructive mt-0.5">
                  Rp {result.totalDendaSwdkllj.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </Card>

          {/* Itemized Cost Breakdown Table */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="p-4 pb-2.5 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold text-foreground">
                  Rincian Komponen Biaya Terhitung
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Dihitung otomatis sesuai formula standar perhitungan pajak R4
                </CardDescription>
              </div>
              <span className="text-xs font-mono text-muted-foreground">
                {result.items.length} Komponen
              </span>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/50 text-xs">
              {result.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 sm:px-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{item.name}</span>
                      <span
                        className={cn(
                          "text-[9px] px-1.5 py-0.2 rounded font-mono font-medium",
                          item.category === "PKB"
                            ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                            : item.category === "DENDA_PKB"
                            ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                            : item.category === "SWDKLLJ"
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : item.category === "DENDA_SWDKLLJ"
                            ? "bg-red-500/10 text-red-600 border border-red-500/20"
                            : item.category === "JASA"
                            ? "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20"
                            : item.category === "INSIDENTAL"
                            ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        {item.code}
                      </span>
                      {item.isManual && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground">
                          Manual
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-[10px] text-muted-foreground">{item.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {item.isManual ? (
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                          Rp
                        </span>
                        <Input
                          type="number"
                          min="0"
                          value={manualValues[item.id] !== undefined ? manualValues[item.id] : item.amount}
                          onChange={(e) => handleManualChange(item.id, e.target.value)}
                          className="h-7 text-right font-mono text-xs pl-7 pr-2"
                        />
                      </div>
                    ) : (
                      <span className="font-mono tabular-nums font-semibold text-foreground text-xs">
                        Rp {item.amount.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ACC ID Callout (EXCLUDED FROM TOTAL) */}
          <Card className="border border-border/80 shadow-xs bg-muted/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <FileCheck className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-[11px] font-semibold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    Biaya ACC ID
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-700 dark:text-amber-400 font-normal">
                      Tidak Masuk Total
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {kondisiBerkas === "LENGKAP"
                      ? "Berkas Lengkap (Ada KTP) — ACC ID Rp 0"
                      : kondisiBerkas === "TIDAK ADA KTP"
                      ? `Tanpa KTP, Wilayah ${wilayahAccId}`
                      : "Informasi berkas belum diisi"}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-base font-bold font-mono text-foreground">
                  {result.accIdAmount !== null
                    ? `Rp ${result.accIdAmount.toLocaleString("id-ID")}`
                    : "Belum Dihitung"}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {result.accIdStatus === "LENGKAP"
                    ? "Sesuai formula (Rp 0)"
                    : result.accIdStatus === "CALCULATED"
                    ? "Dihitung terpisah"
                    : "Opsional"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Template Configuration Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md border-border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Konfigurasi Template R4 Tahunan
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Parameter dasar template estimasi (tersimpan otomatis di browser)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2 text-xs">
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Koefisien Denda</Label>
                <span className="text-[10px] text-muted-foreground">Default: 0.48</span>
              </div>
              <Input
                type="number"
                step="0.01"
                value={configForm.koefisienDenda}
                onChange={(e) => setConfigForm({ ...configForm, koefisienDenda: e.target.value })}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Biaya Jasa R4</Label>
                <span className="text-[10px] text-muted-foreground">Default: Rp 250.000</span>
              </div>
              <Input
                type="number"
                value={configForm.biayaJasa}
                onChange={(e) => setConfigForm({ ...configForm, biayaJasa: e.target.value })}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Pokok SWDKLLJ Tahunan Mobil</Label>
                <span className="text-[10px] text-muted-foreground">Default: Rp 143.000</span>
              </div>
              <Input
                type="number"
                value={configForm.swdklljPokok}
                onChange={(e) => setConfigForm({ ...configForm, swdklljPokok: e.target.value })}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-medium">Biaya Cetak SKP</Label>
                <span className="text-[10px] text-muted-foreground">Default: Rp 100.000</span>
              </div>
              <Input
                type="number"
                value={configForm.biayaCetakSkp}
                onChange={(e) => setConfigForm({ ...configForm, biayaCetakSkp: e.target.value })}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResetTemplate}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Default Excel
            </Button>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsConfigOpen(false)}>
                Batal
              </Button>
              <Button type="button" size="sm" onClick={handleSaveConfig}>
                Simpan
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
