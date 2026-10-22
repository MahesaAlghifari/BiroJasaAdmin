import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Badge } from "../ui/badge";
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
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "../ui/utils";
import { useEstimationStore } from "../../data/estimationStore";
import {
  ProgramSamsat,
  KondisiBerkas,
  WilayahAccId,
  EstimationInput,
  EstimationServiceType,
} from "../../../domain/estimation/types";
import { CalculationExplanationModal } from "./CalculationExplanationModal";

interface EstimatorExtendedProps {
  defaultServiceType?: "5 Tahunan" | "Balik Nama" | "Mutasi Antar Samsat" | "Mutasi Luar Daerah";
  defaultVehicleType?: "Mobil" | "Motor";
  initialPkb?: number;
  initialDueDate?: string;
  onApplyEstimate?: (total: number, details: any) => void;
  className?: string;
}

export function EstimatorExtended({
  defaultServiceType = "5 Tahunan",
  defaultVehicleType = "Mobil",
  initialPkb,
  initialDueDate,
  onApplyEstimate,
  className,
}: EstimatorExtendedProps) {
  const store = useEstimationStore();

  const [serviceType, setServiceType] = useState<"5 Tahunan" | "Balik Nama" | "Mutasi Antar Samsat" | "Mutasi Luar Daerah">(defaultServiceType);
  const [vehicleType, setVehicleType] = useState<"Mobil" | "Motor">(defaultVehicleType);

  // Resolve template ID dynamically
  const templateId = useMemo(() => {
    const isMobil = vehicleType === "Mobil";
    if (serviceType === "5 Tahunan") return isMobil ? "template-pajak-5-tahun-r4" : "template-pajak-5-tahun-r2";
    if (serviceType === "Balik Nama") return isMobil ? "template-bbn-r4" : "template-bbn-r2";
    if (serviceType === "Mutasi Antar Samsat") return isMobil ? "template-mutasi-as-r4" : "template-mutasi-as-r2";
    if (serviceType === "Mutasi Luar Daerah") return isMobil ? "template-mutasi-ld-r4" : "template-mutasi-ld-r2";
    return isMobil ? "template-pajak-5-tahun-r4" : "template-pajak-5-tahun-r2";
  }, [serviceType, vehicleType]);

  const template = store.getTemplate(templateId);

  // Form Inputs with sensible workbook defaults
  const [pkbInput, setPkbInput] = useState<string>(
    initialPkb ? initialPkb.toString() : vehicleType === "Mobil" ? "3964000" : "51000"
  );
  const [dueDate, setDueDate] = useState<string>(initialDueDate || "2023-12-23");
  const [estimateDate, setEstimateDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [programSamsat, setProgramSamsat] = useState<ProgramSamsat>("NORMAL");
  const [freeBbn, setFreeBbn] = useState<boolean>(true);
  const [wilayah, setWilayah] = useState<string>("DKI Jakarta");
  const [kondisiBerkas, setKondisiBerkas] = useState<KondisiBerkas>("LENGKAP");
  const [wilayahAccId, setWilayahAccId] = useState<WilayahAccId>("DKI Jakarta");
  const [showIncidentals, setShowIncidentals] = useState<boolean>(false);

  // Manual component overrides
  const [manualValues, setManualValues] = useState<Record<string, number>>({});

  // Explanation Modal state
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  const [selectedExplanationItem, setSelectedExplanationItem] = useState<string | null>(null);

  // Live calculation
  const estimationInput: EstimationInput = useMemo(() => {
    return {
      pkbDasar: parseFloat(pkbInput) || 0,
      tanggalJatuhTempo: dueDate,
      tanggalEstimasi: estimateDate,
      programSamsat,
      kondisiBerkas,
      wilayahAccId,
      freeBbn,
      wilayahAsal: wilayah,
      wilayahTujuan: wilayah,
      manualValues,
    };
  }, [pkbInput, dueDate, estimateDate, programSamsat, kondisiBerkas, wilayahAccId, freeBbn, wilayah, manualValues]);

  const result = useMemo(() => {
    return store.calculate(estimationInput, templateId);
  }, [store, estimationInput, templateId]);

  const handleOpenExplanation = (itemId: string) => {
    setSelectedExplanationItem(itemId);
    setIsExplanationOpen(true);
  };

  const handleResetManuals = () => {
    setManualValues({});
    toast.info("Nilai manual berhasil direset ke default.");
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Service & Vehicle Type Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/30 border border-border/70 rounded-xl">
        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Jenis Layanan Samsat</Label>
          <Select
            value={serviceType}
            onValueChange={(val: any) => {
              setServiceType(val);
              setManualValues({});
            }}
          >
            <SelectTrigger className="h-9 text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5 Tahunan" className="text-xs">Perpanjangan Pajak 5 Tahun</SelectItem>
              <SelectItem value="Balik Nama" className="text-xs">Balik Nama (BBN)</SelectItem>
              <SelectItem value="Mutasi Antar Samsat" className="text-xs">Mutasi Antar Samsat (Mutasi AS)</SelectItem>
              <SelectItem value="Mutasi Luar Daerah" className="text-xs">Mutasi Luar Daerah (Mutasi LD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-semibold text-foreground">Jenis Kendaraan</Label>
          <div className="flex items-center gap-2 pt-0.5">
            <Button
              type="button"
              variant={vehicleType === "Mobil" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setVehicleType("Mobil");
                if (pkbInput === "51000") setPkbInput("3964000");
                setManualValues({});
              }}
              className="flex-1 h-8 text-xs font-semibold"
            >
              Mobil (R4)
            </Button>
            <Button
              type="button"
              variant={vehicleType === "Motor" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setVehicleType("Motor");
                if (pkbInput === "3964000") setPkbInput("51000");
                setManualValues({});
              }}
              className="flex-1 h-8 text-xs font-semibold"
            >
              Motor (R2)
            </Button>
          </div>
        </div>
      </div>

      {/* Main Parameters Card */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Calculator className="w-4 h-4" />
              </span>
              <div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {template.name}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Formula kalkulasi workbook resmi Admin SUN89
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleOpenExplanation("denda-pkb")}
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Penjelasan Rumus
              </Button>
              <Badge variant="outline" className="text-xs font-mono">
                {template.id}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Row 1: PKB & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">PKB Dasar (Rp)</Label>
              <Input
                type="number"
                min="0"
                value={pkbInput}
                onChange={(e) => setPkbInput(e.target.value)}
                placeholder="Contoh: 3964000"
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Terakhir / Jatuh Tempo</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Tanggal Estimasi</Label>
              <Input
                type="date"
                value={estimateDate}
                onChange={(e) => setEstimateDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Row 2: Program Samsat & Berkas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Program Samsat</Label>
              <Select
                value={programSamsat}
                onValueChange={(val: ProgramSamsat) => setProgramSamsat(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL" className="text-xs">NORMAL (Denda Dihitung)</SelectItem>
                  <SelectItem value="FREE Biaya Denda" className="text-xs text-emerald-600 font-medium">
                    FREE Biaya Denda (Pemutihan)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(serviceType === "Balik Nama" || serviceType.includes("Mutasi")) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Biaya BBN Pokok</Label>
                <Select
                  value={freeBbn ? "FREE" : "BAYAR"}
                  onValueChange={(val) => setFreeBbn(val === "FREE")}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE" className="text-xs text-emerald-600 font-medium">
                      FREE Biaya BBN (Pemutihan BBN II)
                    </SelectItem>
                    <SelectItem value="BAYAR" className="text-xs">
                      Bayar Normal (Sesuai Tarif NJKB/PKB)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Wilayah Samsat</Label>
              <Select
                value={wilayah}
                onValueChange={(val) => setWilayah(val)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DKI Jakarta" className="text-xs">DKI Jakarta</SelectItem>
                  <SelectItem value="Jawa Barat" className="text-xs">Jawa Barat / Bogor / Bekasi</SelectItem>
                  <SelectItem value="Tangerang" className="text-xs">Tangerang / Banten</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Overdue Banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary shrink-0" />
              <div>
                <span className="font-semibold text-foreground">
                  Durasi Keterlambatan: {result.durasiKeterlambatan}
                </span>
                <span className="text-muted-foreground text-[11px] block">
                  {result.tahunTunggakan} Tahun, {result.bulanTunggakan} Bulan • Program: <strong>{programSamsat}</strong>
                </span>
              </div>
            </div>
            <div className="text-right font-mono font-bold text-sm text-primary">
              Total Estimasi: Rp {result.totalEstimasi.toLocaleString("id-ID")}
            </div>
          </div>

          {/* Toggle Incidentals */}
          <div className="pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowIncidentals(!showIncidentals)}
              className="h-8 text-xs gap-1.5 border-dashed"
            >
              <span>Komponen Manual / Insidental</span>
              {showIncidentals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {showIncidentals && (
            <div className="p-3 bg-muted/30 border border-border/70 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Komponen Tambahan / Insidental (Rp):</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetManuals}
                  className="h-6 text-[10px] gap-1 text-muted-foreground"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Nilai
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {template.components
                  .filter((c) => c.isEditable || c.valueType === "manual")
                  .map((comp) => (
                    <div key={comp.id} className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">{comp.name}</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={manualValues[comp.id] !== undefined ? manualValues[comp.id] : ""}
                        onChange={(e) =>
                          setManualValues({
                            ...manualValues,
                            [comp.id]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Itemized Table Breakdown */}
          <div className="space-y-2 pt-2 border-t border-border/60">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground">Rincian Komponen Biaya</h4>
              <span className="text-[11px] text-muted-foreground font-mono">
                {result.items.length} Komponen Terdaftar
              </span>
            </div>

            <div className="border border-border/70 rounded-lg overflow-hidden text-xs">
              <div className="grid grid-cols-12 bg-muted/60 px-3 py-2 font-semibold text-muted-foreground border-b border-border/60">
                <span className="col-span-1">No</span>
                <span className="col-span-5">Komponen</span>
                <span className="col-span-2 text-center">Kategori</span>
                <span className="col-span-3 text-right">Nominal (Rp)</span>
                <span className="col-span-1 text-center">Info</span>
              </div>
              <div className="divide-y divide-border/40">
                {result.items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 px-3 py-2 items-center hover:bg-muted/20 transition-colors">
                    <span className="col-span-1 font-mono text-muted-foreground">{idx + 1}</span>
                    <span className="col-span-5 font-medium text-foreground">{item.name}</span>
                    <span className="col-span-2 text-center">
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                        {item.category}
                      </Badge>
                    </span>
                    <span className="col-span-3 text-right font-mono font-semibold tabular-nums text-foreground">
                      Rp {item.amount.toLocaleString("id-ID")}
                    </span>
                    <span className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleOpenExplanation(item.id)}
                        className="text-muted-foreground/60 hover:text-primary transition-colors p-1 rounded"
                        title="Lihat cara hitung & rumus"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-12 px-3 py-2.5 bg-muted/50 border-t border-border/70 font-bold text-xs">
                <span className="col-span-6 text-foreground">TOTAL ESTIMASI (PEMBULATAN)</span>
                <span className="col-span-6 text-right font-mono text-primary text-sm tabular-nums">
                  Rp {result.totalEstimasi.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Explanation Modal */}
      <CalculationExplanationModal
        open={isExplanationOpen}
        onOpenChange={setIsExplanationOpen}
        initialItemId={selectedExplanationItem}
        estimationResult={result}
        template={template}
        vehicleType={vehicleType}
        serviceType={serviceType}
        pkbDasar={parseFloat(pkbInput) || 0}
        tanggalJatuhTempo={dueDate}
        tanggalEstimasi={estimateDate}
        programSamsat={programSamsat}
        kondisiBerkas={kondisiBerkas}
        wilayahAccId={wilayahAccId}
      />
    </div>
  );
}
