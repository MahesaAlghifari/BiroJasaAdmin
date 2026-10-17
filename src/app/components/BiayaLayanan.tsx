import { useState, useMemo } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "./ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "./ui/pagination";
import { TablePagination } from "./ui/TablePagination";
import { Plus, Edit, Trash2, Search, Calculator } from "lucide-react";
import { toast } from "sonner";
import { pricingStore, usePricingStore, resolveSamsatId, resolveServiceId } from "../data/pricingStore";
import { cn } from "./ui/utils";
import { EstimatorR4Tahunan } from "./estimation/EstimatorR4Tahunan";

export const AVAILABLE_COMPONENTS = [
  { id: "mutasi-legalisir", label: "Legalisir", code: "MK-01" },
  { id: "mutasi-cf", label: "Cek Fisik", code: "MK-04" },
  { id: "mutasi-cek-blokir", label: "Cek Blokir", code: "MK-07" },
  { id: "mutasi-daftar-bpkb", label: "Daftar BPKB", code: "MM-07" },
  { id: "mutasi-cetak-stnk", label: "Cetak STNK", code: "MM-10" },
  { id: "mutasi-cetak-plat", label: "Cetak Plat", code: "MM-11" },
  { id: "mutasi-cetak-fiskal", label: "Cetak Fiskal", code: "MK-13" },
  { id: "mutasi-lok-arsip", label: "Lok. Arsip", code: "MK-14" },
  { id: "mutasi-hadir", label: "Hadir", code: "MK-02" },
  { id: "mutasi-bantuan", label: "Bantuan", code: "MK-05" },
];

const wilayahList = [
  "Jakarta Timur", "Jakarta Barat", "Jakarta Selatan", "Jakarta Utara", "Jakarta Pusat",
  "Depok", "Bekasi", "Tangerang", "Bogor", "Tangerang Selatan"
];

const layananTabs = [
  { value: "perpanjangan-1", label: "Perpanjangan 1 Tahun", key: "Perpanjangan 1 Tahun" },
  { value: "perpanjangan-5", label: "Perpanjangan 5 Tahun", key: "Perpanjangan 5 Tahun" },
  { value: "mutasi-antar", label: "Mutasi Antar Samsat", key: "Mutasi Antar Samsat" },
  { value: "mutasi-luar", label: "Mutasi Luar Daerah", key: "Mutasi Luar Daerah" },
  { value: "balik-nama", label: "Balik Nama", key: "Balik Nama" },
  { value: "tarik-berkas", label: "Tarik Berkas", key: "Tarik Berkas" },
  { value: "duplikat-stnk", label: "Duplikat STNK", key: "Duplikat STNK" },
];

export function BiayaLayanan() {
  usePricingStore();
  const biayaData = pricingStore.getBiayaLayananRows();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState("perpanjangan-1");
  
  // Form states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEstimatorOpen, setIsEstimatorOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedComponents, setSelectedComponents] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    wilayah: "Jakarta Timur",
    biayaJasaLengkap: "500000",
    jasaLengkapEnabled: true,
    biayaJasaNembak: "300000",
    jasaNembakEnabled: false,
    biayaAntarJemput: "50000",
    antarJemputEnabled: true,
    antarJemputMode: "Antar & Jemput" as "Antar & Jemput" | "Antar Saja" | "Jemput Saja",
    nominalSwdkllj: "143000",
    swdklljEnabled: true,
    biayaLainnya: [] as Array<{ id: string; label: string; nominal: number; enabled: boolean }>,
  });

  const getCurrentLayanan = () => {
    return layananTabs.find(tab => tab.value === activeTab)?.key || "";
  };

  const isPerpanjangan = () => {
    const layanan = getCurrentLayanan();
    return layanan === "Perpanjangan 1 Tahun" || layanan === "Perpanjangan 5 Tahun";
  };

  // Filter data berdasarkan tab dan search
  const getFilteredData = () => {
    const currentLayanan = getCurrentLayanan();
    return biayaData.filter(item => 
      item.layanan === currentLayanan &&
      (searchTerm === "" || item.wilayah.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Pagination
  const filteredData = getFilteredData();
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when changing tabs or search
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
    setSearchTerm("");
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  // Dynamic summary of active components and estimated service cost (Section 10)
  const activeSummary = useMemo(() => {
    let count = 0;
    let total = 0;

    // 1. Jasa Lengkap
    if (formData.jasaLengkapEnabled) {
      const nom = parseFloat(formData.biayaJasaLengkap) || 0;
      if (nom > 0) {
        count++;
        total += nom;
      }
    }

    // 2. Jasa Nembak
    if (formData.jasaNembakEnabled) {
      const nom = parseFloat(formData.biayaJasaNembak) || 0;
      if (nom > 0) {
        count++;
        total += nom;
      }
    }

    // 3. Antar Jemput
    if (formData.antarJemputEnabled) {
      const nom = parseFloat(formData.biayaAntarJemput) || 0;
      if (nom > 0) {
        count++;
        total += nom;
      }
    }

    // 4. Komponen Samsat
    const targetWilayah = formData.wilayah || selectedItem?.wilayah || "Jakarta Timur";
    const samsatId = resolveSamsatId(targetWilayah);
    const masterItems = pricingStore.getMasterPricingItems();
    masterItems.forEach((comp) => {
      if (selectedComponents[comp.id]) {
        count++;
        total += pricingStore.getSamsatPrice(samsatId, comp.id);
      }
    });

    // 5. OPSEN PKB
    if (formData.swdklljEnabled) {
      const nom = parseFloat(formData.nominalSwdkllj) || 0;
      if (nom > 0) {
        count++;
        total += nom;
      }
    }

    // 6. Biaya Lainnya
    (formData.biayaLainnya || []).forEach((bl) => {
      if (bl.enabled && bl.nominal > 0) {
        count++;
        total += bl.nominal;
      }
    });

    return { count, total };
  }, [formData, selectedComponents, selectedItem]);

  // Handlers for dynamic Biaya Lainnya
  const handleAddBiayaLainnyaItem = () => {
    const newItem = {
      id: `bl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: "",
      nominal: 0,
      enabled: true,
    };
    setFormData((prev) => ({
      ...prev,
      biayaLainnya: [...prev.biayaLainnya, newItem],
    }));
  };

  const handleUpdateBiayaLainnyaItem = (id: string, updates: Partial<{ label: string; nominal: number; enabled: boolean }>) => {
    setFormData((prev) => ({
      ...prev,
      biayaLainnya: prev.biayaLainnya.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    }));
  };

  const handleDeleteBiayaLainnyaItem = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      biayaLainnya: prev.biayaLainnya.filter((item) => item.id !== id),
    }));
  };

  // Handlers
  const handleAddClick = () => {
    const currentServiceId = resolveServiceId(getCurrentLayanan());
    const config = pricingStore.getServiceFeeConfig(currentServiceId, "samsat-jakarta-timur");

    setFormData({
      wilayah: "Jakarta Timur",
      biayaJasaLengkap: (config?.jasaLengkap?.nominal ?? config?.biayaJasa ?? 500000).toString(),
      jasaLengkapEnabled: config?.jasaLengkap?.enabled ?? true,
      biayaJasaNembak: (config?.biayaPengurusanKhusus?.nominal ?? config?.jasaNembak?.nominal ?? 300000).toString(),
      jasaNembakEnabled: config?.biayaPengurusanKhusus?.enabled ?? config?.jasaNembak?.enabled ?? false,
      biayaAntarJemput: (config?.biayaAntarJemput ?? 50000).toString(),
      antarJemputEnabled: config?.antarJemputEnabled ?? true,
      antarJemputMode: (config?.antarJemputMode || "Antar & Jemput") as "Antar & Jemput" | "Antar Saja" | "Jemput Saja",
      nominalSwdkllj: (config?.opsenPkb?.nominal ?? config?.swdkllj?.nominal ?? 143000).toString(),
      swdklljEnabled: config?.opsenPkb?.enabled ?? config?.swdkllj?.enabled ?? true,
      biayaLainnya: (config?.biayaLainnya || []).map((b) => ({
        id: b.id,
        label: b.label || "",
        nominal: b.nominal || 0,
        enabled: b.enabled,
      })),
    });

    const compMap: Record<string, boolean> = {};
    const masterItems = pricingStore.getMasterPricingItems();
    masterItems.forEach((c) => {
      const found = config?.components.find((sc) => sc.pricingItemId === c.id);
      compMap[c.id] = found ? found.enabled : false;
    });
    setSelectedComponents(compMap);
    setIsAddDialogOpen(true);
  };

  const handleEditClick = (item: any) => {
    setSelectedItem(item);
    const serviceId = resolveServiceId(item.layanan);
    const samsatId = resolveSamsatId(item.wilayah);
    const config = pricingStore.getServiceFeeConfig(serviceId, samsatId);

    const jasaLengkapNom = config?.jasaLengkap?.nominal ?? item.biayaJasaLengkap ?? item.biayaJasa ?? 500000;
    const jasaLengkapEn = config?.jasaLengkap?.enabled ?? item.jasaLengkapEnabled ?? true;

    const jasaNembakNom = config?.biayaPengurusanKhusus?.nominal ?? config?.jasaNembak?.nominal ?? item.biayaPengurusanKhusus ?? item.biayaJasaNembak ?? Math.round(jasaLengkapNom * 0.6);
    const jasaNembakEn = config?.biayaPengurusanKhusus?.enabled ?? config?.jasaNembak?.enabled ?? item.pengurusanKhususEnabled ?? item.jasaNembakEnabled ?? false;

    const antarJemputNom = config?.biayaAntarJemput ?? item.biayaAntarJemput ?? 50000;
    const antarJemputEn = config?.antarJemputEnabled ?? item.antarJemputEnabled ?? true;
    const antarJemputMode = (config?.antarJemputMode || item.antarJemputMode || "Antar & Jemput") as "Antar & Jemput" | "Antar Saja" | "Jemput Saja";

    const swdklljNom = config?.opsenPkb?.nominal ?? config?.swdkllj?.nominal ?? item.opsenPkb?.nominal ?? item.swdkllj?.nominal ?? 143000;
    const swdklljEn = config?.opsenPkb?.enabled ?? config?.swdkllj?.enabled ?? item.opsenPkb?.enabled ?? item.swdkllj?.enabled ?? true;

    const biayaLainnya = (config?.biayaLainnya || item.biayaLainnya || []).map((b: any) => ({
      id: b.id,
      label: b.label || "",
      nominal: b.nominal || 0,
      enabled: b.enabled ?? true,
    }));

    setFormData({
      wilayah: item.wilayah,
      biayaJasaLengkap: jasaLengkapNom.toString(),
      jasaLengkapEnabled: jasaLengkapEn,
      biayaJasaNembak: jasaNembakNom.toString(),
      jasaNembakEnabled: jasaNembakEn,
      biayaAntarJemput: antarJemputNom.toString(),
      antarJemputEnabled: antarJemputEn,
      antarJemputMode,
      nominalSwdkllj: swdklljNom.toString(),
      swdklljEnabled: swdklljEn,
      biayaLainnya,
    });

    const compMap: Record<string, boolean> = {};
    const masterItems = pricingStore.getMasterPricingItems();
    masterItems.forEach((c) => {
      const found = config?.components.find((sc) => sc.pricingItemId === c.id);
      compMap[c.id] = found ? found.enabled : false;
    });
    setSelectedComponents(compMap);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (item: any) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const handleAddSubmit = () => {
    if (!formData.wilayah) {
      toast.error("Harap pilih wilayah Samsat!");
      return;
    }

    const biayaJasaLengkapNum = parseInt(formData.biayaJasaLengkap) || 0;
    const biayaJasaNembakNum = parseInt(formData.biayaJasaNembak) || 0;
    const biayaAntarJemputNum = parseInt(formData.biayaAntarJemput) || 0;
    const swdklljNum = parseInt(formData.nominalSwdkllj) || 0;

    if (biayaJasaLengkapNum < 0 || biayaJasaNembakNum < 0 || biayaAntarJemputNum < 0 || swdklljNum < 0) {
      toast.error("Nominal biaya tidak boleh negatif!");
      return;
    }

    // Validate Biaya Lainnya
    for (const bl of formData.biayaLainnya) {
      if (!bl.label.trim()) {
        toast.error("Nama Biaya Lainnya tidak boleh kosong!");
        return;
      }
      if (bl.nominal < 0) {
        toast.error("Nominal Biaya Lainnya tidak boleh negatif!");
        return;
      }
    }

    const newItem: any = {
      id: Math.max(...biayaData.map((item) => item.id), 0) + 1,
      layanan: getCurrentLayanan(),
      wilayah: formData.wilayah,
      biayaJasa: biayaJasaLengkapNum,
      biayaJasaLengkap: biayaJasaLengkapNum,
      jasaLengkapEnabled: formData.jasaLengkapEnabled,
      biayaPengurusanKhusus: biayaJasaNembakNum,
      biayaJasaNembak: biayaJasaNembakNum,
      pengurusanKhususEnabled: formData.jasaNembakEnabled,
      jasaNembakEnabled: formData.jasaNembakEnabled,
      biayaAntarJemput: biayaAntarJemputNum,
      antarJemputEnabled: formData.antarJemputEnabled,
      antarJemputMode: formData.antarJemputMode,
      opsenPkb: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      swdkllj: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      biayaLainnya: formData.biayaLainnya.map((b) => ({
        id: b.id,
        label: b.label.trim(),
        nominal: Number(b.nominal) || 0,
        enabled: b.enabled,
      })),
    };

    pricingStore.addBiayaLayananRow(newItem);

    // Sync component checklist to pricingStore
    Object.entries(selectedComponents).forEach(([compKey, enabled]) => {
      pricingStore.toggleComponent(getCurrentLayanan(), formData.wilayah, compKey, enabled);
    });

    // Update service fee config
    pricingStore.updateServiceFeeConfig(getCurrentLayanan(), formData.wilayah, {
      biayaJasa: biayaJasaLengkapNum,
      jasaLengkap: {
        nominal: biayaJasaLengkapNum,
        enabled: formData.jasaLengkapEnabled,
      },
      biayaPengurusanKhusus: {
        nominal: biayaJasaNembakNum,
        enabled: formData.jasaNembakEnabled,
      },
      jasaNembak: {
        nominal: biayaJasaNembakNum,
        enabled: formData.jasaNembakEnabled,
      },
      biayaAntarJemput: biayaAntarJemputNum,
      antarJemputEnabled: formData.antarJemputEnabled,
      antarJemputMode: formData.antarJemputMode,
      opsenPkb: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      swdkllj: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      biayaLainnya: formData.biayaLainnya.map((b) => ({
        id: b.id,
        label: b.label.trim(),
        nominal: Number(b.nominal) || 0,
        enabled: b.enabled,
      })),
    });

    setIsAddDialogOpen(false);
    toast.success("Biaya layanan berhasil ditambahkan!");
  };

  const handleEditSubmit = () => {
    if (!formData.wilayah) {
      toast.error("Harap pilih wilayah Samsat!");
      return;
    }

    const biayaJasaLengkapNum = parseInt(formData.biayaJasaLengkap) || 0;
    const biayaJasaNembakNum = parseInt(formData.biayaJasaNembak) || 0;
    const biayaAntarJemputNum = parseInt(formData.biayaAntarJemput) || 0;
    const swdklljNum = parseInt(formData.nominalSwdkllj) || 0;

    if (biayaJasaLengkapNum < 0 || biayaJasaNembakNum < 0 || biayaAntarJemputNum < 0 || swdklljNum < 0) {
      toast.error("Nominal biaya tidak boleh negatif!");
      return;
    }

    // Validate Biaya Lainnya
    for (const bl of formData.biayaLainnya) {
      if (!bl.label.trim()) {
        toast.error("Nama Biaya Lainnya tidak boleh kosong!");
        return;
      }
      if (bl.nominal < 0) {
        toast.error("Nominal Biaya Lainnya tidak boleh negatif!");
        return;
      }
    }

    const updated: any = { 
      ...selectedItem, 
      wilayah: formData.wilayah,
      biayaJasa: biayaJasaLengkapNum,
      biayaJasaLengkap: biayaJasaLengkapNum,
      jasaLengkapEnabled: formData.jasaLengkapEnabled,
      biayaPengurusanKhusus: biayaJasaNembakNum,
      biayaJasaNembak: biayaJasaNembakNum,
      pengurusanKhususEnabled: formData.jasaNembakEnabled,
      jasaNembakEnabled: formData.jasaNembakEnabled,
      biayaAntarJemput: biayaAntarJemputNum,
      antarJemputEnabled: formData.antarJemputEnabled,
      antarJemputMode: formData.antarJemputMode,
      opsenPkb: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      swdkllj: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      biayaLainnya: formData.biayaLainnya.map((b) => ({
        id: b.id,
        label: b.label.trim(),
        nominal: Number(b.nominal) || 0,
        enabled: b.enabled,
      })),
    };
    
    pricingStore.updateBiayaLayananRow(selectedItem.id, updated);

    // Sync component checklist to authoritative pricingStore
    Object.entries(selectedComponents).forEach(([compKey, enabled]) => {
      pricingStore.toggleComponent(selectedItem.layanan, formData.wilayah, compKey, enabled);
    });

    // Synchronize to pricingStore authoritative configuration
    pricingStore.updateServiceFeeConfig(selectedItem.layanan, formData.wilayah, {
      biayaJasa: biayaJasaLengkapNum,
      jasaLengkap: {
        nominal: biayaJasaLengkapNum,
        enabled: formData.jasaLengkapEnabled,
      },
      biayaPengurusanKhusus: {
        nominal: biayaJasaNembakNum,
        enabled: formData.jasaNembakEnabled,
      },
      jasaNembak: {
        nominal: biayaJasaNembakNum,
        enabled: formData.jasaNembakEnabled,
      },
      biayaAntarJemput: biayaAntarJemputNum,
      antarJemputEnabled: formData.antarJemputEnabled,
      antarJemputMode: formData.antarJemputMode,
      opsenPkb: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      swdkllj: {
        nominal: swdklljNum,
        enabled: formData.swdklljEnabled,
      },
      biayaLainnya: formData.biayaLainnya.map((b) => ({
        id: b.id,
        label: b.label.trim(),
        nominal: Number(b.nominal) || 0,
        enabled: b.enabled,
      })),
    });

    setIsEditDialogOpen(false);
    toast.success("Biaya layanan berhasil diupdate!");
  };

  const handleDeleteConfirm = () => {
    pricingStore.deleteBiayaLayananRow(selectedItem.id);
    setIsDeleteDialogOpen(false);
    toast.success("Biaya layanan berhasil dihapus!");
  };

  const renderTableHeaders = () => {
    return (
      <>
        <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 w-12 text-center">No</TableHead>
        <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80">Wilayah Samsat</TableHead>
        <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Jasa</TableHead>
        <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Pengurusan Khusus</TableHead>
        <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Antar & Jemput</TableHead>
        <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-center">Komponen Samsat</TableHead>
        <TableHead className="h-9 px-2 text-xs font-semibold text-foreground/80 text-center w-[95px]">Aksi</TableHead>
      </>
    );
  };

  const renderTableRow = (item: any, index: number) => {
    const config = pricingStore.getServiceFeeConfig(item.layanan, item.wilayah);
    const activeComps = (config?.components || []).filter((c) => c.enabled);
    const isLengkapActive = config?.jasaLengkap ? config.jasaLengkap.enabled : (item.jasaLengkapEnabled !== false);
    const isKhususActive = config?.biayaPengurusanKhusus ? config.biayaPengurusanKhusus.enabled : (config?.jasaNembak ? config.jasaNembak.enabled : (item.pengurusanKhususEnabled ?? (item.jasaNembakEnabled === true)));
    const isAntarJemputActive = config?.antarJemputEnabled !== undefined ? config.antarJemputEnabled : (item.antarJemputEnabled !== false);

    const biayaJasaVal = item.biayaJasaLengkap ?? item.biayaJasa ?? config?.jasaLengkap?.nominal ?? config?.biayaJasa ?? 0;
    const biayaKhususVal = item.biayaPengurusanKhusus ?? item.biayaJasaNembak ?? config?.biayaPengurusanKhusus?.nominal ?? config?.jasaNembak?.nominal ?? Math.round(biayaJasaVal * 0.6);
    const biayaAntarJemputVal = item.biayaAntarJemput ?? config?.biayaAntarJemput ?? 50000;

    return (
      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
        <TableCell className="px-3.5 py-2 text-xs text-muted-foreground text-center">{startIndex + index + 1}</TableCell>
        <TableCell className="px-3.5 py-2 text-xs font-medium text-foreground">
          {item.wilayah}
        </TableCell>
        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">
          <span className={cn(!isLengkapActive && "line-through text-muted-foreground/60")}>
            Rp {biayaJasaVal.toLocaleString('id-ID')}
          </span>
          {!isLengkapActive && (
            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-sans">Off</span>
          )}
        </TableCell>
        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">
          <span className={cn(!isKhususActive && "line-through text-muted-foreground/60")}>
            Rp {biayaKhususVal.toLocaleString('id-ID')}
          </span>
          {!isKhususActive && (
            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-sans">Off</span>
          )}
        </TableCell>
        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">
          <span className={cn(!isAntarJemputActive && "line-through text-muted-foreground/60")}>
            Rp {biayaAntarJemputVal.toLocaleString('id-ID')}
          </span>
          {!isAntarJemputActive && (
            <span className="ml-1.5 text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-sans">Off</span>
          )}
        </TableCell>
        <TableCell className="px-3.5 py-2 text-xs text-center">
          <span
            className={cn(
              "text-[11px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 cursor-default",
              activeComps.length > 0
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                : "bg-muted text-muted-foreground border border-border"
            )}
            title={activeComps.map((c) => pricingStore.getPricingItemById(c.pricingItemId)?.name || c.pricingItemId).join(", ")}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", activeComps.length > 0 ? "bg-amber-500" : "bg-muted-foreground")} />
            {activeComps.length} Komponen Aktif
          </span>
        </TableCell>
        <TableCell className="px-2 py-1.5 text-center">
          <div className="flex items-center justify-center gap-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
              onClick={() => handleEditClick(item)}
              aria-label="Edit biaya"
            >
              <Edit className="w-3.5 h-3.5" />
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
              onClick={() => handleDeleteClick(item)}
              aria-label="Hapus biaya"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const renderFormFields = (isEdit = false) => {
    const targetWilayah = formData.wilayah || selectedItem?.wilayah || "Jakarta Timur";
    const samsatId = resolveSamsatId(targetWilayah);
    const masterItems = pricingStore.getMasterPricingItems();
    const mutasiMasukItems = masterItems.filter((i) => i.category === "Mutasi Masuk");
    const mutasiKeluarItems = masterItems.filter((i) => i.category === "Mutasi Keluar");

    return (
      <div className="space-y-4">
        {/* Wilayah Samsat (HANYA DITAMPILKAN DI FORM TAMBAH, TIDAK DITAMPILKAN DI EDIT) */}
        {!isEdit && (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground/90">Wilayah Samsat</Label>
              <Select
                value={formData.wilayah}
                onValueChange={(value) => setFormData({ ...formData, wilayah: value })}
              >
                <SelectTrigger className="h-8.5 text-xs bg-input-background border-border">
                  <SelectValue placeholder="Pilih wilayah" />
                </SelectTrigger>
                <SelectContent>
                  {wilayahList.map((wilayah) => (
                    <SelectItem key={wilayah} value={wilayah} className="text-xs">
                      {wilayah}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="border-t border-border/70" />
          </>
        )}

        {/* 1. BIAYA JASA */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            1. BIAYA JASA
          </h4>
          <div className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground/90">Biaya Jasa (Standar)</Label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={formData.jasaLengkapEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, jasaLengkapEnabled: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className={cn("text-xs font-medium", formData.jasaLengkapEnabled ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {formData.jasaLengkapEnabled ? "Aktif dalam estimasi" : "Nonaktif"}
                </span>
              </label>
            </div>
            <Input
              className="h-8.5 text-xs font-mono tabular-nums text-right bg-input-background border-border pr-3"
              type="number"
              placeholder="500000"
              value={formData.biayaJasaLengkap}
              onChange={(e) => setFormData({ ...formData, biayaJasaLengkap: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">Proses standar pengurusan dokumen Samsat</p>
          </div>
        </div>

        <div className="border-t border-border/70" />

        {/* 2. BIAYA PENGURUSAN KHUSUS */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            2. BIAYA PENGURUSAN KHUSUS
          </h4>
          <div className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground/90">Biaya Pengurusan Khusus</Label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={formData.jasaNembakEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, jasaNembakEnabled: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className={cn("text-xs font-medium", formData.jasaNembakEnabled ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {formData.jasaNembakEnabled ? "Aktif dalam estimasi" : "Nonaktif"}
                </span>
              </label>
            </div>
            <Input
              className="h-8.5 text-xs font-mono tabular-nums text-right bg-input-background border-border pr-3"
              type="number"
              placeholder="300000"
              value={formData.biayaJasaNembak}
              onChange={(e) => setFormData({ ...formData, biayaJasaNembak: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">Proses pengurusan berkas atau penanganan kondisi khusus</p>
          </div>
        </div>

        <div className="border-t border-border/70" />

        {/* 3. BIAYA ANTAR & JEMPUT */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            3. BIAYA ANTAR & JEMPUT
          </h4>
          <div className="space-y-2.5 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground/90">Mode Antar Jemput</Label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={formData.antarJemputEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, antarJemputEnabled: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className={cn("text-xs font-medium", formData.antarJemputEnabled ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {formData.antarJemputEnabled ? "Aktif dalam estimasi" : "Nonaktif (Rp 0)"}
                </span>
              </label>
            </div>

            {/* Pilihan Mode 3 Opsi */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              <label className={cn(
                "flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                formData.antarJemputMode === "Antar & Jemput"
                  ? "bg-primary/10 border-primary/40 font-medium text-foreground"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:bg-muted/40"
              )}>
                <input
                  type="radio"
                  name="antarJemputMode"
                  value="Antar & Jemput"
                  checked={formData.antarJemputMode === "Antar & Jemput"}
                  onChange={() => setFormData({ ...formData, antarJemputMode: "Antar & Jemput" })}
                  className="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="truncate">Antar & Jemput</span>
              </label>

              <label className={cn(
                "flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                formData.antarJemputMode === "Antar Saja"
                  ? "bg-primary/10 border-primary/40 font-medium text-foreground"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:bg-muted/40"
              )}>
                <input
                  type="radio"
                  name="antarJemputMode"
                  value="Antar Saja"
                  checked={formData.antarJemputMode === "Antar Saja"}
                  onChange={() => setFormData({ ...formData, antarJemputMode: "Antar Saja" })}
                  className="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="truncate">Antar Saja</span>
              </label>

              <label className={cn(
                "flex items-center gap-2 p-2 rounded-md border text-xs cursor-pointer transition-colors",
                formData.antarJemputMode === "Jemput Saja"
                  ? "bg-primary/10 border-primary/40 font-medium text-foreground"
                  : "bg-background/60 border-border/60 text-muted-foreground hover:bg-muted/40"
              )}>
                <input
                  type="radio"
                  name="antarJemputMode"
                  value="Jemput Saja"
                  checked={formData.antarJemputMode === "Jemput Saja"}
                  onChange={() => setFormData({ ...formData, antarJemputMode: "Jemput Saja" })}
                  className="text-primary focus:ring-primary h-3.5 w-3.5"
                />
                <span className="truncate">Jemput Saja</span>
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Nominal Tarif (Rp)</Label>
              <Input
                className="h-8.5 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                type="number"
                placeholder="50000"
                value={formData.biayaAntarJemput}
                onChange={(e) => setFormData({ ...formData, biayaAntarJemput: e.target.value })}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Tarif kurir penjemputan/pengantaran berkas ke alamat klien.
            </p>
          </div>
        </div>

        <div className="border-t border-border/70" />

        {/* 4. OPSEN PKB */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            4. OPSEN PKB
          </h4>
          <div className="space-y-1.5 p-3 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-foreground/90">Nominal OPSEN PKB</Label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                <input
                  type="checkbox"
                  checked={formData.swdklljEnabled}
                  onChange={(e) =>
                    setFormData({ ...formData, swdklljEnabled: e.target.checked })
                  }
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className={cn("text-xs font-medium", formData.swdklljEnabled ? "text-primary font-semibold" : "text-muted-foreground")}>
                  {formData.swdklljEnabled ? "Aktif dalam estimasi" : "Nonaktif"}
                </span>
              </label>
            </div>
            <Input
              className="h-8.5 text-xs font-mono tabular-nums text-right bg-input-background border-border"
              type="number"
              placeholder="143000"
              value={formData.nominalSwdkllj}
              onChange={(e) => setFormData({ ...formData, nominalSwdkllj: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              OPSEN Pajak Kendaraan Bermotor (masuk estimasi jika dicentang).
            </p>
          </div>
        </div>

        <div className="border-t border-border/70" />

        {/* 5. BIAYA LAINNYA */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              5. BIAYA LAINNYA
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddBiayaLainnyaItem}
              className="h-7 text-xs gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/5"
            >
              <Plus className="w-3 h-3" />
              <span>Tambah Biaya</span>
            </Button>
          </div>

          {formData.biayaLainnya.length === 0 ? (
            <div className="p-3 text-center border border-dashed border-border/60 rounded-lg text-xs text-muted-foreground bg-muted/10">
              Belum ada biaya lainnya. Klik "+ Tambah Biaya" untuk menambahkan biaya kustom.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
              {formData.biayaLainnya.map((bl) => (
                <div
                  key={bl.id}
                  className="flex items-center gap-2 p-2 rounded-lg border border-border/60 bg-muted/20 text-xs"
                >
                  <Input
                    placeholder="Nama Biaya (contoh: Materai / Administrasi)"
                    value={bl.label}
                    onChange={(e) => handleUpdateBiayaLainnyaItem(bl.id, { label: e.target.value })}
                    className="h-8 text-xs bg-background flex-1"
                  />
                  <div className="w-32 shrink-0">
                    <Input
                      type="number"
                      placeholder="Nominal (Rp)"
                      value={bl.nominal || ""}
                      onChange={(e) =>
                        handleUpdateBiayaLainnyaItem(bl.id, {
                          nominal: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="h-8 text-xs font-mono tabular-nums text-right bg-background"
                    />
                  </div>
                  <label className="flex items-center gap-1 cursor-pointer shrink-0 px-1 select-none">
                    <input
                      type="checkbox"
                      checked={bl.enabled}
                      onChange={(e) => handleUpdateBiayaLainnyaItem(bl.id, { enabled: e.target.checked })}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-[11px] font-medium text-muted-foreground">Aktif</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteBiayaLainnyaItem(bl.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
                    title="Hapus biaya lainnya"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border/70" />

        {/* 6. KOMPONEN SAMSAT — MUTASI MASUK */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              6. KOMPONEN SAMSAT — MUTASI MASUK
            </h4>
            <span className="text-[11px] font-mono text-muted-foreground">
              {mutasiMasukItems.filter((c) => !!selectedComponents[c.id]).length} dari {mutasiMasukItems.length} Aktif
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Komponen biaya pendaftaran mutasi masuk kendaraan di Samsat tujuan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-secondary/30 rounded-lg border border-border/50">
            {mutasiMasukItems.map((comp) => {
              const price = pricingStore.getSamsatPrice(samsatId, comp.id);
              const isChecked = !!selectedComponents[comp.id];
              return (
                <label
                  key={comp.id}
                  className={cn(
                    "flex items-center space-x-2.5 p-2 rounded border transition-colors cursor-pointer text-xs",
                    isChecked
                      ? "bg-emerald-500/10 border-emerald-500/40 text-foreground"
                      : "bg-background/60 border-border/60 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setSelectedComponents({
                        ...selectedComponents,
                        [comp.id]: e.target.checked,
                      })
                    }
                    className="rounded border-border text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs truncate">{comp.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                        {comp.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-foreground/70">
                      Rp {price.toLocaleString("id-ID")}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/70" />

        {/* 7. KOMPONEN SAMSAT — MUTASI KELUAR */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              7. KOMPONEN SAMSAT — MUTASI KELUAR
            </h4>
            <span className="text-[11px] font-mono text-muted-foreground">
              {mutasiKeluarItems.filter((c) => !!selectedComponents[c.id]).length} dari {mutasiKeluarItems.length} Aktif
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Komponen biaya pengurusan mutasi keluar kendaraan di Samsat asal.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto p-2 bg-secondary/30 rounded-lg border border-border/50">
            {mutasiKeluarItems.map((comp) => {
              const price = pricingStore.getSamsatPrice(samsatId, comp.id);
              const isChecked = !!selectedComponents[comp.id];
              return (
                <label
                  key={comp.id}
                  className={cn(
                    "flex items-center space-x-2.5 p-2 rounded border transition-colors cursor-pointer text-xs",
                    isChecked
                      ? "bg-blue-500/10 border-blue-500/40 text-foreground"
                      : "bg-background/60 border-border/60 text-muted-foreground hover:bg-muted/40"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setSelectedComponents({
                        ...selectedComponents,
                        [comp.id]: e.target.checked,
                      })
                    }
                    className="rounded border-border text-blue-600 focus:ring-blue-500 h-4 w-4"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-medium text-xs truncate">{comp.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-muted text-muted-foreground font-mono">
                        {comp.code}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono tabular-nums text-foreground/70">
                      Rp {price.toLocaleString("id-ID")}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border/70" />

        {/* 8. RINGKASAN AKTIF */}
        <Card className="p-3.5 border border-primary/20 bg-primary/5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Komponen Aktif</p>
              <p className="text-lg font-semibold font-mono tabular-nums text-foreground">
                {activeSummary.count} Komponen
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-muted-foreground">Estimasi Biaya Layanan</p>
              <p className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                Rp {activeSummary.total.toLocaleString("id-ID")}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-full space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <nav className="text-xs text-muted-foreground flex items-center gap-1.5 pb-2" aria-label="Breadcrumb">
            <span>Master Data</span>
            <span>/</span>
            <span className="text-foreground font-medium">Biaya Layanan</span>
          </nav>
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-semibold text-foreground tracking-tight">Biaya Layanan</h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              Kelola biaya layanan berdasarkan wilayah Samsat
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2 sm:mb-0">
          <Button
            variant="outline"
            className="h-8.5 text-xs gap-1.5 border-primary/40 text-primary hover:bg-primary/10 shadow-2xs font-medium"
            onClick={() => setIsEstimatorOpen(true)}
          >
            <Calculator className="w-4 h-4 text-primary" />
            <span>Kalkulator Estimasi R4</span>
          </Button>
        </div>
      </div>

      <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs flex-1 flex flex-col min-h-0">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0 space-y-4">
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 shrink-0">
            <TabsList className="inline-flex w-full min-w-max lg:grid lg:w-full lg:grid-cols-7 gap-1.5 bg-secondary/30 p-1.5 rounded-lg border border-border/40">
              {layananTabs.map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="text-xs sm:text-xs font-medium whitespace-nowrap"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {layananTabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="flex-1 flex flex-col min-h-0 space-y-3.5 mt-0 data-[state=inactive]:hidden">
              {/* Toolbar (Primary Add button at LEFT side, Search at right) */}
              <div className="flex flex-col md:flex-row gap-2.5 justify-between items-stretch md:items-center shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                    onClick={handleAddClick}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Biaya</span>
                  </Button>
                  {tab.value === "perpanjangan-1" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-primary/40 text-primary hover:bg-primary/10 gap-1.5 shadow-2xs shrink-0 font-medium"
                      onClick={() => setIsEstimatorOpen(true)}
                    >
                      <Calculator className="w-3.5 h-3.5 text-primary" />
                      <span>Kalkulator Estimasi R4</span>
                    </Button>
                  )}
                </div>
                <div className="relative w-full sm:w-72 md:w-80">
                  <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <Input 
                    placeholder="Cari wilayah..." 
                    className="pl-8 bg-background border-border h-8 text-xs font-normal placeholder:font-normal placeholder:text-muted-foreground/60"
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="rounded-lg border border-border bg-card overflow-hidden shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className={`w-full min-w-[650px] ${paginatedData.length === 0 ? "h-full" : ""}`}>
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      {renderTableHeaders()}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedData.length > 0 ? (
                      paginatedData.map((item, index) => renderTableRow(item, index))
                    ) : (
                      <TableRow className="h-full hover:bg-transparent">
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-12 text-xs h-full min-h-[200px] align-middle">
                          Tidak ada data ditemukan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Standardized Table Pagination */}
              <div className="mt-auto pt-1 shrink-0">
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredData.length}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(newSize) => {
                    setItemsPerPage(newSize);
                    setCurrentPage(1);
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                />
              </div>

              {/* Summary */}
              <Card className="p-4 border border-border bg-muted/30 shrink-0 mt-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Wilayah</p>
                    <p className="text-xl font-semibold font-mono tabular-nums text-foreground">{filteredData.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      Rata-rata Biaya Jasa
                    </p>
                    <p className="text-xl font-semibold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      Rp {filteredData.length > 0 
                        ? Math.round(
                            filteredData.reduce((acc, item) => {
                              return acc + (item.biayaJasaLengkap || item.biayaJasa || 0);
                            }, 0) / filteredData.length
                          ).toLocaleString()
                        : 0
                      }
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="border-border sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3.5 border-b border-border/70 shrink-0 bg-card">
            <DialogTitle className="text-base font-semibold">Tambah Biaya Layanan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tambahkan biaya untuk {getCurrentLayanan()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {renderFormFields(false)}
          </div>
          <DialogFooter className="px-5 py-3 border-t border-border/70 shrink-0 bg-card flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold" onClick={handleAddSubmit}>
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-border sm:max-w-xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-5 py-3.5 border-b border-border/70 shrink-0 bg-card">
            <DialogTitle className="text-base font-semibold">
              Edit Biaya Layanan — {selectedItem?.wilayah || formData.wilayah}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Pengaturan komponen biaya dan tarif Samsat untuk {getCurrentLayanan()}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-5">
            {renderFormFields(true)}
          </div>
          <DialogFooter className="px-5 py-3 border-t border-border/70 shrink-0 bg-card flex justify-end gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold" onClick={handleEditSubmit}>
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="border-border sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">Hapus Biaya Layanan?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Apakah Anda yakin ingin menghapus biaya layanan untuk wilayah{" "}
              <span className="text-foreground font-medium">{selectedItem?.wilayah}</span>?
              Aksi ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel className="h-8 text-xs">Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="h-8 text-xs bg-red-500 hover:bg-red-600 text-white shadow-xs"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Kalkulator Estimasi R4 Dialog Modal */}
      <Dialog open={isEstimatorOpen} onOpenChange={setIsEstimatorOpen}>
        <DialogContent className="border-border sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-3 border-b border-border/70">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Calculator className="w-5 h-5 text-primary" />
              Kalkulator Estimasi Pajak Tahunan R4
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Simulasi perhitungan PKB, SWDKLLJ, denda keterlambatan, dan jasa perpanjangan STNK mobil (R4) sesuai formula Samsat.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <EstimatorR4Tahunan />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
