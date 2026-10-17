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
  Bike,
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

interface EstimatorR2TahunanProps {
  initialPkb?: number;
  initialDueDate?: string;
  onApplyEstimate?: (total: number, details: any) => void;
  className?: string;
}

export function EstimatorR2Tahunan({
  initialPkb,
  initialDueDate,
  onApplyEstimate,
  className,
}: EstimatorR2TahunanProps) {
  const store = useEstimationStore();
  const template = store.getTemplate("template-pajak-tahunan-r2");

  // Form Inputs
  const [pkbInput, setPkbInput] = useState<string>(initialPkb ? initialPkb.toString() : "51000");
  const [dueDate, setDueDate] = useState<string>(initialDueDate || "2025-09-08");
  const [estimateDate, setEstimateDate] = useState<string>("2026-10-17");
  const [programSamsat, setProgramSamsat] = useState<ProgramSamsat>("NORMAL");
  const [kondisiBerkas, setKondisiBerkas] = useState<KondisiBerkas>("TIDAK ADA KTP");
  const [wilayahAccId, setWilayahAccId] = useState<WilayahAccId>("NON ACC ID");
  const [customerName, setCustomerName] = useState<string>("");
  const [nopol, setNopol] = useState<string>("");

  // Manual Component Overrides
  const [manualValues, setManualValues] = useState<Record<string, number>>({
    "stnk-hilang": 0,
    "proses-dan-acc-id": 350000,
    etle: 0,
    "req-nopol-ganjil-acak": 0,
    "pemekaran-wilayah": 0,
  });

  // Template Config Dialog
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    koefisienDenda: template.koefisienDenda.toString(),
    biayaJasa: template.biayaJasa.toString(),
    swdklljPokok: template.swdklljPokok.toString(),
    dendaSwdklljPokok: template.dendaSwdklljPokok.toString(),
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
      dendaSwdklljPokok: template.dendaSwdklljPokok.toString(),
      biayaCetakSkp: template.biayaCetakSkp.toString(),
    });
    setIsConfigOpen(true);
  };

  const handleSaveConfig = () => {
    const koef = parseFloat(configForm.koefisienDenda);
    const jasa = parseInt(configForm.biayaJasa, 10);
    const swd = parseInt(configForm.swdklljPokok, 10);
    const dendaSwd = parseInt(configForm.dendaSwdklljPokok, 10);
    const skp = parseInt(configForm.biayaCetakSkp, 10);

    if (isNaN(koef) || koef < 0 || isNaN(jasa) || isNaN(swd) || isNaN(dendaSwd) || isNaN(skp)) {
      toast.error("Parameter konfigurasi tidak valid!");
      return;
    }

    store.updateTemplateParams(template.id, {
      koefisienDenda: koef,
      biayaJasa: jasa,
      swdklljPokok: swd,
      dendaSwdklljPokok: dendaSwd,
      biayaCetakSkp: skp,
    });
    setIsConfigOpen(false);
    toast.success("Konfigurasi template R2 berhasil diperbarui!");
  };

  const handleResetTemplate = () => {
    store.resetToDefault(template.id);
    setIsConfigOpen(false);
    toast.success("Konfigurasi template R2 dikembalikan ke default Excel.");
  };

  return (
    <div className={cn("space-y-6 text-left", className)}>
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Bike className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              {template.name}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sumber Formula: Workbook Excel Sheet <code>PAJAK TAHUNAN R2</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenConfig}
            className="h-8 text-xs gap-1.5 text-foreground/80 hover:text-foreground"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Konfigurasi Template
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetTemplate}
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            title="Reset ke formula default Excel"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* Main Grid: Inputs vs Real-Time Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border border-border/80 shadow-xs bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span>Parameter Input Pajak R2</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Motor / R2
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Masukkan nilai dasar PKB dari STNK dan tanggal jatuh tempo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* PKB Dasar */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="pkb-input" className="text-xs font-semibold text-foreground">
                    1. PKB Dasar Tahunan (STNK) *
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Cell I14</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    Rp
                  </span>
                  <Input
                    id="pkb-input"
                    type="number"
                    value={pkbInput}
                    onChange={(e) => setPkbInput(e.target.value)}
                    placeholder="51000"
                    className="pl-9 font-mono tabular-nums text-sm font-medium"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Nominal pokok pajak 1 tahun tertera pada lembar ketetapan pajak STNK.
                </p>
              </div>

              {/* Tanggal Jatuh Tempo */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="due-date-input" className="text-xs font-semibold text-foreground">
                    2. Tanggal Jatuh Tempo Pajak Terakhir *
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Cell H21</span>
                </div>
                <Input
                  id="due-date-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              {/* Tanggal Estimasi */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label htmlFor="est-date-input" className="text-xs font-semibold text-foreground">
                    Tanggal Estimasi Perhitungan
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Cell I21 (TODAY)</span>
                </div>
                <Input
                  id="est-date-input"
                  type="date"
                  value={estimateDate}
                  onChange={(e) => setEstimateDate(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              {/* Program Samsat */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-foreground">
                    3. Program Samsat *
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Cell I11</span>
                </div>
                <RadioGroup
                  value={programSamsat}
                  onValueChange={(val: ProgramSamsat) => setProgramSamsat(val)}
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-accent/40 cursor-pointer">
                    <RadioGroupItem value="NORMAL" id="prog-normal-r2" />
                    <Label htmlFor="prog-normal-r2" className="text-xs cursor-pointer font-medium">
                      NORMAL
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-md p-2 hover:bg-accent/40 cursor-pointer">
                    <RadioGroupItem value="FREE Biaya Denda" id="prog-free-r2" />
                    <Label htmlFor="prog-free-r2" className="text-xs cursor-pointer font-medium text-emerald-600 dark:text-emerald-400">
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

              {/* Kelengkapan Berkas & Wilayah ACC ID */}
              <div className="border-t border-border/70 pt-3 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  Data Kelengkapan Berkas & ACC ID
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
                        <SelectItem value="TIDAK ADA KTP">TIDAK ADA KTP</SelectItem>
                        <SelectItem value="LENGKAP">LENGKAP (Ada KTP)</SelectItem>
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
                      placeholder="Bp. Ahmad"
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Plat Nomor (Opsional)</Label>
                    <Input
                      type="text"
                      value={nopol}
                      onChange={(e) => setNopol(e.target.value.toUpperCase())}
                      placeholder="B 1234 ABC"
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
                <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Durasi Keterlambatan Kalender (Cell I22)
                  </div>
                  <div className="text-base font-bold text-foreground">
                    {result.durasiKeterlambatan}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-foreground">
                  {result.tahunTunggakan} Thn, Denda: {result.bulanTunggakan} Bln
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Formula R2: {result.bulanKalender || 0} Bln Kalender + 5
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Real-Time Results & Component Breakdown */}
        <div className="lg:col-span-7 space-y-4">
          {/* Grand Total Banner */}
          <Card className="border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/5 via-card to-primary/5 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 uppercase tracking-wider">
                  Total Estimasi Akhir R2 (Cell C30)
                </span>
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-foreground mt-1">
                  Rp {result.totalEstimasi.toLocaleString("id-ID")}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Termasuk Proses & ACC ID, Cetak SKP, Jasa, dan pembulatan kelipatan Rp 1.000 (ROUNDUP)
                </p>
              </div>

              {onApplyEstimate && (
                <Button
                  onClick={() => onApplyEstimate(result.totalEstimasi, result)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 shadow-sm"
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
                <div className={cn("font-mono font-semibold mt-0.5", result.totalDendaPkb > 0 ? "text-destructive" : "text-foreground")}>
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
                <div className="text-[10px] text-muted-foreground">Total Denda SWDKLLJ</div>
                <div className={cn("font-mono font-semibold mt-0.5", result.totalDendaSwdkllj > 0 ? "text-destructive" : "text-foreground")}>
                  Rp {result.totalDendaSwdkllj.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          </Card>

          {/* Breakdown by Category */}
          <div className="space-y-3">
            {/* 1. PKB Section */}
            <Card className="border border-border/80 shadow-xs">
              <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">1. Pokok & Denda PKB</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  Rp {(result.totalPkb + result.totalDendaPkb).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 divide-y divide-border/40 text-xs">
                {result.items
                  .filter((i) => i.category === "PKB" || i.category === "DENDA_PKB")
                  .map((it) => (
                    <div key={it.id} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-foreground/90 font-medium">{it.name}</span>
                        {it.description && (
                          <p className="text-[10px] text-muted-foreground">{it.description}</p>
                        )}
                      </div>
                      <span className={cn("font-mono font-semibold", it.category === "DENDA_PKB" && it.amount > 0 ? "text-destructive" : "text-foreground")}>
                        Rp {it.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>

            {/* 2. SWDKLLJ Section */}
            <Card className="border border-border/80 shadow-xs">
              <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">2. SWDKLLJ & Denda (Motor)</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  Rp {(result.totalSwdkllj + result.totalDendaSwdkllj).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 divide-y divide-border/40 text-xs">
                {result.items
                  .filter((i) => i.category === "SWDKLLJ" || i.category === "DENDA_SWDKLLJ")
                  .map((it) => (
                    <div key={it.id} className="py-1.5 flex items-center justify-between">
                      <div>
                        <span className="text-foreground/90 font-medium">{it.name}</span>
                        {it.description && (
                          <p className="text-[10px] text-muted-foreground">{it.description}</p>
                        )}
                      </div>
                      <span className={cn("font-mono font-semibold", it.category === "DENDA_SWDKLLJ" && it.amount > 0 ? "text-destructive" : "text-foreground")}>
                        Rp {it.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
              </div>
            </Card>

            {/* 3. Administrasi, Proses & Jasa */}
            <Card className="border border-border/80 shadow-xs">
              <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">3. Administrasi, Proses & Jasa</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  Rp {result.totalAdminDanJasa.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 divide-y divide-border/40 text-xs">
                {result.items
                  .filter((i) => i.category === "ADMIN" || i.category === "JASA")
                  .map((it) => (
                    <div key={it.id} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-foreground/90 font-medium">{it.name}</span>
                        {it.description && (
                          <p className="text-[10px] text-muted-foreground">{it.description}</p>
                        )}
                      </div>
                      <div className="w-36 text-right">
                        {it.isManual ? (
                          <Input
                            type="number"
                            value={manualValues[it.id] !== undefined ? manualValues[it.id].toString() : it.amount.toString()}
                            onChange={(e) => handleManualChange(it.id, e.target.value)}
                            className="h-7 text-xs font-mono text-right"
                          />
                        ) : (
                          <span className="font-mono font-semibold text-foreground">
                            Rp {it.amount.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* 4. Insidentals */}
            <Card className="border border-border/80 shadow-xs">
              <div className="p-3 bg-muted/30 border-b border-border/60 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-foreground">4. Biaya Insidental (Opsional)</span>
                  <p className="text-[10px] text-muted-foreground">Diisi jika terdapat tilang atau kebutuhan khusus.</p>
                </div>
                <span className="text-xs font-mono font-bold text-foreground">
                  Rp {result.totalInsidental.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="p-3 divide-y divide-border/40 text-xs">
                {result.items
                  .filter((i) => i.category === "INSIDENTAL")
                  .map((it) => (
                    <div key={it.id} className="py-2 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-foreground/90 font-medium">{it.name}</span>
                        {it.description && (
                          <p className="text-[10px] text-muted-foreground">{it.description}</p>
                        )}
                      </div>
                      <div className="w-36">
                        <Input
                          type="number"
                          value={manualValues[it.id] !== undefined ? manualValues[it.id].toString() : "0"}
                          onChange={(e) => handleManualChange(it.id, e.target.value)}
                          className="h-7 text-xs font-mono text-right"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Config Dialog */}
      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-600" />
              Konfigurasi Template R2
            </DialogTitle>
            <DialogDescription className="text-xs">
              Ubah tarif dasar untuk Perpanjangan Pajak Tahunan Motor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Koefisien Denda (Cell I6, default 0.48)</Label>
              <Input
                type="number"
                step="0.01"
                value={configForm.koefisienDenda}
                onChange={(e) => setConfigForm({ ...configForm, koefisienDenda: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Biaya Jasa Motor (Cell C29, default 200.000)</Label>
              <Input
                type="number"
                value={configForm.biayaJasa}
                onChange={(e) => setConfigForm({ ...configForm, biayaJasa: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SWDKLLJ Pokok Motor (Cell C21, default 35.000)</Label>
              <Input
                type="number"
                value={configForm.swdklljPokok}
                onChange={(e) => setConfigForm({ ...configForm, swdklljPokok: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Denda SWDKLLJ Pokok Motor (Cell F20, default 32.000)</Label>
              <Input
                type="number"
                value={configForm.dendaSwdklljPokok}
                onChange={(e) => setConfigForm({ ...configForm, dendaSwdklljPokok: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Biaya Cetak SKP Motor (Cell C28, default 50.000)</Label>
              <Input
                type="number"
                value={configForm.biayaCetakSkp}
                onChange={(e) => setConfigForm({ ...configForm, biayaCetakSkp: e.target.value })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfigOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveConfig}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Simpan Konfigurasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
