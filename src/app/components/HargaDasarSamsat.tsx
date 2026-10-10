import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Plus, Edit, Trash2, FileText, Car, MapPin, FileSignature, FolderOpen, Copy } from "lucide-react";
import { toast } from "sonner";
import { pricingStore, usePricingStore } from "../data/pricingStore";

export function HargaDasarSamsat() {
  usePricingStore();
  const hargaDasar = pricingStore.getHargaDasarRows();
  const mutasiAS = pricingStore.getMutasiASRows();
  const mutasiLD = pricingStore.getMutasiLDRows();
  const balikNama = pricingStore.getBalikNamaRows();
  const tarikBerkas = pricingStore.getTarikBerkasRows();
  const duplikatSTNK = pricingStore.getDuplikatSTNKRows();
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("mutasi-as");
  const [editFormData, setEditFormData] = useState<any>({});
  const [addFormData, setAddFormData] = useState<any>({});

  const handleEdit = (item: any, tab: string) => {
    setSelectedItem(item);
    setEditFormData(item);
    setCurrentTab(tab);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    switch (currentTab) {
      case "harga-dasar":
        pricingStore.updateHargaDasarRow(selectedItem.id, editFormData);
        break;
      case "mutasi-as":
        pricingStore.updateMutasiASRow(selectedItem.id, editFormData);
        break;
      case "mutasi-ld":
        pricingStore.updateMutasiLDRow(selectedItem.id, editFormData);
        break;
      case "balik-nama":
        pricingStore.updateBalikNamaRow(selectedItem.id, editFormData);
        break;
      case "tarik-berkas":
        pricingStore.updateTarikBerkasRow(selectedItem.id, editFormData);
        break;
      case "duplikat-stnk":
        pricingStore.updateDuplikatSTNKRow(selectedItem.id, editFormData);
        break;
    }
    
    setIsEditDialogOpen(false);
    toast.success("Data berhasil diupdate!");
  };

  const handleDelete = (id: number, tab: string) => {
    switch (tab) {
      case "harga-dasar":
        pricingStore.deleteHargaDasarRow(id);
        break;
      case "mutasi-as":
        pricingStore.deleteMutasiASRow(id);
        break;
      case "mutasi-ld":
        pricingStore.deleteMutasiLDRow(id);
        break;
      case "balik-nama":
        pricingStore.deleteBalikNamaRow(id);
        break;
      case "tarik-berkas":
        pricingStore.deleteTarikBerkasRow(id);
        break;
      case "duplikat-stnk":
        pricingStore.deleteDuplikatSTNKRow(id);
        break;
    }
    
    toast.success("Data berhasil dihapus!");
  };

  const handleAddNew = (tab: string) => {
    setCurrentTab(tab);
    
    switch(tab) {
      case "harga-dasar":
        setAddFormData({
          namaSamsat: "",
          hargaDasar: 0,
          adminSamsat: 0,
          jasa: 0,
          totalEstimasi: 0
        });
        break;
      case "mutasi-as":
        setAddFormData({
          namaSamsat: "",
          legalisir: 0, hadir: 0, legalisirCf: 0, cf: 0, bantuan: 0, hadir2: 0,
          cekBlokir: 0, lokPembukuan: 0, lokTu: 0, lokTuNopil: 0, loksus: 0,
          cetakSkp: 0, cetakFiskal: 0, lokArsip: 0, cekProgresif: 0, matiinNopil: 0,
          daftarMutmasNormal: 0, daftarMutmasKilat: 0,
          legalisirMutmas: 0, mutmasByPendaftaran: 0, reqGanjilGenap: 0, acak: 0, lokTuMasuk: 0,
          lokPembukuanMasuk: 0, daftarBpkb: 0, penulisanBpkb: 0,
          cetakNotice: 0, cetakStnk: 0, cetakPlat: 0,
        });
        break;
      case "mutasi-ld":
        setAddFormData({ namaSamsat: "", totalBiaya: 0 });
        break;
      case "balik-nama":
        setAddFormData({
          namaSamsat: "",
          biayaPengurusan: 0,
          biayaAdmin: 0,
          biayaLegalisir: 0,
          biayaCetak: 0,
          totalEstimasi: 0
        });
        break;
      case "tarik-berkas":
        setAddFormData({
          namaSamsat: "",
          biayaPengambilan: 0,
          biayaAdmin: 0,
          biayaEkspedisi: 0,
          totalEstimasi: 0
        });
        break;
      case "duplikat-stnk":
        setAddFormData({
          namaSamsat: "",
          biayaPembuatan: 0,
          biayaAdmin: 0,
          biayaCetak: 0,
          biayaValidasi: 0,
          totalEstimasi: 0
        });
        break;
    }
    
    setIsAddDialogOpen(true);
  };

  const handleSaveAdd = () => {
    switch (currentTab) {
      case "harga-dasar":
        pricingStore.addHargaDasarRow(addFormData);
        break;
      case "mutasi-as":
        pricingStore.addMutasiASRow(addFormData);
        break;
      case "mutasi-ld":
        pricingStore.addMutasiLDRow(addFormData);
        break;
      case "balik-nama":
        pricingStore.addBalikNamaRow(addFormData);
        break;
      case "tarik-berkas":
        pricingStore.addTarikBerkasRow(addFormData);
        break;
      case "duplikat-stnk":
        pricingStore.addDuplikatSTNKRow(addFormData);
        break;
    }
    
    setIsAddDialogOpen(false);
    toast.success("Data berhasil ditambahkan!");
  };

  return (
    <div className="flex-1 flex flex-col min-h-full space-y-4 w-full min-w-0 text-left">
      <div>
        <nav className="text-xs text-muted-foreground flex items-center gap-1.5 pb-2" aria-label="Breadcrumb">
          <span>Master Data</span>
          <span>/</span>
          <span className="text-foreground font-medium">Harga Dasar Samsat</span>
        </nav>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground tracking-tight">Harga Dasar Samsat</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Kelola harga dasar untuk semua jenis layanan di setiap Samsat</p>
        </div>
      </div>

      <Tabs defaultValue="mutasi-as" className="flex-1 flex flex-col min-h-0 space-y-4" onValueChange={setCurrentTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 shrink-0">
          <TabsList className="inline-flex w-full min-w-max lg:grid lg:w-full lg:grid-cols-6 bg-secondary/30 p-1.5 rounded-lg border border-border/40 gap-1.5">
            <TabsTrigger value="mutasi-as" className="text-xs font-medium whitespace-nowrap">
              <Car className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Mutasi AS</span>
              <span className="sm:hidden">AS</span>
            </TabsTrigger>
            <TabsTrigger value="mutasi-ld" className="text-xs font-medium whitespace-nowrap">
              <MapPin className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Mutasi LD</span>
              <span className="sm:hidden">LD</span>
            </TabsTrigger>
            <TabsTrigger value="balik-nama" className="text-xs font-medium whitespace-nowrap">
              <FileSignature className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Balik Nama</span>
              <span className="sm:hidden">BN</span>
            </TabsTrigger>
            <TabsTrigger value="tarik-berkas" className="text-xs font-medium whitespace-nowrap">
              <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Tarik Berkas</span>
              <span className="sm:hidden">Tarik</span>
            </TabsTrigger>
            <TabsTrigger value="duplikat-stnk" className="text-xs font-medium whitespace-nowrap">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Duplikat STNK</span>
              <span className="sm:hidden">Duplikat</span>
            </TabsTrigger>
            <TabsTrigger value="harga-dasar" className="text-xs font-medium whitespace-nowrap">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              <span className="hidden sm:inline">Harga Dasar</span>
              <span className="sm:hidden">Dasar</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Harga Dasar */}
        <TabsContent value="harga-dasar" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleAddNew("harga-dasar")} 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data</span>
                  </Button>
                </div>
                <h4 className="text-xs font-medium text-muted-foreground">Harga Dasar Layanan</h4>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className="w-full min-w-[560px]">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80">Nama Samsat</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Harga Dasar</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Admin Samsat</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Jasa</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Total Estimasi</TableHead>
                      <TableHead className="h-9 px-2 text-xs font-semibold text-foreground/80 text-center w-[95px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hargaDasar.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                        <TableCell className="px-3.5 py-2 text-xs font-normal text-foreground/90">{item.namaSamsat}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.hargaDasar.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.adminSamsat.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.jasa.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">Rp {item.totalEstimasi.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                              onClick={() => handleEdit(item, "harga-dasar")}
                              aria-label="Edit harga dasar"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(item.id, "harga-dasar")}
                              aria-label="Hapus harga dasar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Mutasi AS */}
        <TabsContent value="mutasi-as" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleAddNew("mutasi-as")} 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data</span>
                  </Button>
                </div>
                <h4 className="text-xs font-medium text-muted-foreground">Mutasi Keluar & Mutasi Masuk (Antar Samsat)</h4>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className="w-full">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[180px] sticky left-0 bg-muted z-20 font-semibold text-xs h-9 px-3.5 text-foreground/80">Nama Samsat</TableHead>
                      <TableHead colSpan={18} className="text-center border-b border-border/60 font-semibold text-xs h-9 px-3.5 text-foreground/80">Mutasi Keluar</TableHead>
                      <TableHead colSpan={11} className="text-center border-b border-border/60 font-semibold text-xs h-9 px-3.5 text-foreground/80">Mutasi Masuk</TableHead>
                      <TableHead className="text-center sticky right-0 bg-muted z-20 font-semibold text-xs h-9 px-2 text-foreground/80 w-[95px]">Aksi</TableHead>
                    </TableRow>
                    <TableRow className="hover:bg-transparent text-xs">
                      <TableHead className="sticky left-0 bg-muted z-20 h-8 px-3.5"></TableHead>
                      {/* Mutasi Keluar */}
                      <TableHead className="min-w-[100px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Legalisir</TableHead>
                      <TableHead className="min-w-[100px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Hadir</TableHead>
                      <TableHead className="min-w-[110px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Legalisir CF</TableHead>
                      <TableHead className="min-w-[80px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">CF</TableHead>
                      <TableHead className="min-w-[100px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Bantuan</TableHead>
                      <TableHead className="min-w-[100px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Hadir</TableHead>
                      <TableHead className="min-w-[105px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cek Blokir</TableHead>
                      <TableHead className="min-w-[130px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Lok. Pembukuan</TableHead>
                      <TableHead className="min-w-[100px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Lok. TU</TableHead>
                      <TableHead className="min-w-[120px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Lok. TU Nopil</TableHead>
                      <TableHead className="min-w-[100px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Loksus</TableHead>
                      <TableHead className="min-w-[105px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cetak SKP</TableHead>
                      <TableHead className="min-w-[110px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cetak Fiskal</TableHead>
                      <TableHead className="min-w-[105px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Lok. Arsip</TableHead>
                      <TableHead className="min-w-[120px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cek Progresif</TableHead>
                      <TableHead className="min-w-[120px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Matiin Nopil</TableHead>
                      <TableHead className="min-w-[160px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Daftar Mutmas Normal</TableHead>
                      <TableHead className="min-w-[160px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Daftar Mutmas Kilat</TableHead>
                      {/* Mutasi Masuk */}
                      <TableHead className="min-w-[120px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Legalisir</TableHead>
                      <TableHead className="min-w-[180px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Mutmas By Pendaftaran</TableHead>
                      <TableHead className="min-w-[160px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Req. Ganjil/Genap</TableHead>
                      <TableHead className="min-w-[90px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Acak</TableHead>
                      <TableHead className="min-w-[95px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Lok. TU</TableHead>
                      <TableHead className="min-w-[130px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Lok. Pembukuan</TableHead>
                      <TableHead className="min-w-[110px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Daftar BPKB</TableHead>
                      <TableHead className="min-w-[130px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Penulisan BPKB</TableHead>
                      <TableHead className="min-w-[110px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cetak Notice</TableHead>
                      <TableHead className="min-w-[110px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cetak STNK</TableHead>
                      <TableHead className="min-w-[110px] h-8 px-3 text-right text-xs font-semibold text-foreground/70">Cetak Plat</TableHead>
                      <TableHead className="sticky right-0 bg-muted z-20 h-8 px-2"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mutasiAS.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                        <TableCell className="px-3.5 py-2 text-xs font-normal sticky left-0 bg-card z-10 text-foreground/90">{item.namaSamsat}</TableCell>
                        {/* Mutasi Keluar */}
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.legalisir.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.hadir.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.legalisirCf.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cf.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.bantuan.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.hadir2.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cekBlokir.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.lokPembukuan.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.lokTu.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.lokTuNopil.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.loksus.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cetakSkp.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cetakFiskal.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.lokArsip.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cekProgresif.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.matiinNopil.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.daftarMutmasNormal.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.daftarMutmasKilat.toLocaleString('id-ID')}</TableCell>
                        {/* Mutasi Masuk */}
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.legalisirMutmas.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.mutmasByPendaftaran.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.reqGanjilGenap.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.acak.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.lokTuMasuk.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.lokPembukuanMasuk.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.daftarBpkb.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.penulisanBpkb.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cetakNotice.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cetakStnk.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.cetakPlat.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center sticky right-0 bg-card z-10">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                              onClick={() => handleEdit(item, "mutasi-as")}
                              aria-label="Edit mutasi AS"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(item.id, "mutasi-as")}
                              aria-label="Hapus mutasi AS"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Mutasi LD */}
        <TabsContent value="mutasi-ld" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleAddNew("mutasi-ld")} 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data</span>
                  </Button>
                </div>
                <h4 className="text-xs font-medium text-muted-foreground">Harga Total Mutasi Luar Daerah</h4>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className="w-full min-w-[420px]">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80">Nama Samsat</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Total Biaya</TableHead>
                      <TableHead className="h-9 px-2 text-xs font-semibold text-foreground/80 text-center w-[95px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mutasiLD.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                        <TableCell className="px-3.5 py-2 text-xs font-normal text-foreground/90">{item.namaSamsat}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">Rp {item.totalBiaya.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                              onClick={() => handleEdit(item, "mutasi-ld")}
                              aria-label="Edit mutasi LD"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(item.id, "mutasi-ld")}
                              aria-label="Hapus mutasi LD"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Balik Nama */}
        <TabsContent value="balik-nama" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleAddNew("balik-nama")} 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data</span>
                  </Button>
                </div>
                <h4 className="text-xs font-medium text-muted-foreground">Harga Balik Nama Kendaraan</h4>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className="w-full min-w-[650px]">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80">Nama Samsat</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Pengurusan</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Admin</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Legalisir</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Cetak</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Total Estimasi</TableHead>
                      <TableHead className="h-9 px-2 text-xs font-semibold text-foreground/80 text-center w-[95px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {balikNama.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                        <TableCell className="px-3.5 py-2 text-xs font-normal text-foreground/90">{item.namaSamsat}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaPengurusan.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaAdmin.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaLegalisir.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaCetak.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">Rp {item.totalEstimasi.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                              onClick={() => handleEdit(item, "balik-nama")}
                              aria-label="Edit balik nama"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(item.id, "balik-nama")}
                              aria-label="Hapus balik nama"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Tarik Berkas */}
        <TabsContent value="tarik-berkas" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleAddNew("tarik-berkas")} 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data</span>
                  </Button>
                </div>
                <h4 className="text-xs font-medium text-muted-foreground">Harga Tarik Berkas</h4>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className="w-full min-w-[580px]">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80">Nama Samsat</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Pengambilan</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Admin</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Ekspedisi</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Total Estimasi</TableHead>
                      <TableHead className="h-9 px-2 text-xs font-semibold text-foreground/80 text-center w-[95px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tarikBerkas.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                        <TableCell className="px-3.5 py-2 text-xs font-normal text-foreground/90">{item.namaSamsat}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaPengambilan.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaAdmin.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaEkspedisi.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">Rp {item.totalEstimasi.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                              onClick={() => handleEdit(item, "tarik-berkas")}
                              aria-label="Edit tarik berkas"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(item.id, "tarik-berkas")}
                              aria-label="Hapus tarik berkas"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Duplikat STNK */}
        <TabsContent value="duplikat-stnk" className="flex-1 flex flex-col min-h-0 mt-0 data-[state=inactive]:hidden">
          <div className="space-y-3.5 flex-1 flex flex-col min-h-0">
            <Card className="p-4 sm:p-5 border border-border/80 bg-card shadow-xs space-y-3.5 flex-1 flex flex-col min-h-0">
              <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-start sm:items-center shrink-0">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleAddNew("duplikat-stnk")} 
                    size="sm"
                    className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data</span>
                  </Button>
                </div>
                <h4 className="text-xs font-medium text-muted-foreground">Harga Duplikat STNK</h4>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-x-auto shadow-2xs flex-1 flex flex-col min-h-[220px]">
                <Table className="w-full min-w-[650px]">
                  <TableHeader className="bg-muted/40 border-b border-border">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80">Nama Samsat</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Pembuatan</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Admin</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Cetak</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Biaya Validasi</TableHead>
                      <TableHead className="h-9 px-3.5 text-xs font-semibold text-foreground/80 text-right">Total Estimasi</TableHead>
                      <TableHead className="h-9 px-2 text-xs font-semibold text-foreground/80 text-center w-[95px]">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {duplikatSTNK.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30 transition-colors border-b border-border/60 last:border-0 h-10">
                        <TableCell className="px-3.5 py-2 text-xs font-normal text-foreground/90">{item.namaSamsat}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaPembuatan.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaAdmin.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaCetak.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium">Rp {item.biayaValidasi.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-3.5 py-2 text-xs text-right font-mono tabular-nums font-medium text-foreground">Rp {item.totalEstimasi.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                              onClick={() => handleEdit(item, "duplikat-stnk")}
                              aria-label="Edit duplikat STNK"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                              onClick={() => handleDelete(item.id, "duplikat-stnk")}
                              aria-label="Hapus duplikat STNK"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={`border-border ${currentTab === "mutasi-as" ? "sm:max-w-4xl" : "sm:max-w-xl"} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Edit Harga Dasar Samsat</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Update harga dasar untuk samsat ini</DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">Nama Samsat</Label>
              <Input
                value={editFormData.namaSamsat || ""}
                onChange={(e) => setEditFormData({...editFormData, namaSamsat: e.target.value})}
                className="h-8 text-xs bg-input-background border-border"
              />
            </div>

            {currentTab === "harga-dasar" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "hargaDasar", label: "Harga Dasar" },
                  { key: "adminSamsat", label: "Admin Samsat" },
                  { key: "jasa", label: "Jasa" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={editFormData[field.key] || 0}
                      onChange={(e) => setEditFormData({...editFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentTab === "mutasi-as" && (
              <>
                <h4 className="text-xs font-semibold text-foreground/90 mt-2">Mutasi Keluar</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "legalisir", label: "Legalisir" },
                    { key: "hadir", label: "Hadir" },
                    { key: "legalisirCf", label: "Legalisir CF" },
                    { key: "cf", label: "CF" },
                    { key: "bantuan", label: "Bantuan" },
                    { key: "hadir2", label: "Hadir 2" },
                    { key: "cekBlokir", label: "Cek Blokir" },
                    { key: "lokPembukuan", label: "Lok. Pembukuan" },
                    { key: "lokTu", label: "Lok. TU" },
                    { key: "lokTuNopil", label: "Lok. TU Nopil" },
                    { key: "loksus", label: "Loksus" },
                    { key: "cetakSkp", label: "Cetak SKP" },
                    { key: "cetakFiskal", label: "Cetak Fiskal" },
                    { key: "lokArsip", label: "Lok. Arsip" },
                    { key: "cekProgresif", label: "Cek Progresif" },
                    { key: "matiinNopil", label: "Matiin Nopil" },
                    { key: "daftarMutmasNormal", label: "Daftar Mutmas Normal" },
                    { key: "daftarMutmasKilat", label: "Daftar Mutmas Kilat" },
                  ].map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                      <Input
                        type="number"
                        value={editFormData[field.key] || 0}
                        onChange={(e) => setEditFormData({...editFormData, [field.key]: parseInt(e.target.value) || 0})}
                        className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                      />
                    </div>
                  ))}
                </div>

                <h4 className="text-xs font-semibold text-foreground/90 mt-3">Mutasi Masuk</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { key: "legalisirMutmas", label: "Legalisir" },
                    { key: "mutmasByPendaftaran", label: "Mutmas By Pendaftaran" },
                    { key: "reqGanjilGenap", label: "Req. Ganjil/Genap" },
                    { key: "acak", label: "Acak" },
                    { key: "lokTuMasuk", label: "Lok. TU" },
                    { key: "lokPembukuanMasuk", label: "Lok. Pembukuan" },
                    { key: "daftarBpkb", label: "Daftar BPKB" },
                    { key: "penulisanBpkb", label: "Penulisan BPKB" },
                    { key: "cetakNotice", label: "Cetak Notice" },
                    { key: "cetakStnk", label: "Cetak STNK" },
                    { key: "cetakPlat", label: "Cetak Plat" },
                  ].map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                      <Input
                        type="number"
                        value={editFormData[field.key] || 0}
                        onChange={(e) => setEditFormData({...editFormData, [field.key]: parseInt(e.target.value) || 0})}
                        className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {currentTab === "mutasi-ld" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/80">Total Biaya</Label>
                <Input
                  type="number"
                  value={editFormData.totalBiaya || 0}
                  onChange={(e) => setEditFormData({...editFormData, totalBiaya: parseInt(e.target.value) || 0})}
                  className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                />
              </div>
            )}

            {currentTab === "balik-nama" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "biayaPengurusan", label: "Biaya Pengurusan" },
                  { key: "biayaAdmin", label: "Biaya Admin" },
                  { key: "biayaLegalisir", label: "Biaya Legalisir" },
                  { key: "biayaCetak", label: "Biaya Cetak" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={editFormData[field.key] || 0}
                      onChange={(e) => setEditFormData({...editFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentTab === "tarik-berkas" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "biayaPengambilan", label: "Biaya Pengambilan" },
                  { key: "biayaAdmin", label: "Biaya Admin" },
                  { key: "biayaEkspedisi", label: "Biaya Ekspedisi" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={editFormData[field.key] || 0}
                      onChange={(e) => setEditFormData({...editFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentTab === "duplikat-stnk" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "biayaPembuatan", label: "Biaya Pembuatan" },
                  { key: "biayaAdmin", label: "Biaya Admin" },
                  { key: "biayaCetak", label: "Biaya Cetak" },
                  { key: "biayaValidasi", label: "Biaya Validasi" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={editFormData[field.key] || 0}
                      onChange={(e) => setEditFormData({...editFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 flex justify-end">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsEditDialogOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveEdit} className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={`border-border ${currentTab === "mutasi-as" ? "sm:max-w-4xl" : "sm:max-w-xl"} max-h-[90vh] overflow-y-auto`}>
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Tambah Harga Dasar Samsat</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Tambahkan harga dasar untuk samsat baru</DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground/80">Nama Samsat</Label>
              <Input
                value={addFormData.namaSamsat || ""}
                onChange={(e) => setAddFormData({...addFormData, namaSamsat: e.target.value})}
                className="h-8 text-xs bg-input-background border-border"
                placeholder="Masukkan nama samsat"
              />
            </div>

            {currentTab === "harga-dasar" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "hargaDasar", label: "Harga Dasar" },
                  { key: "adminSamsat", label: "Admin Samsat" },
                  { key: "jasa", label: "Jasa" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={addFormData[field.key] || 0}
                      onChange={(e) => setAddFormData({...addFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentTab === "mutasi-ld" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground/80">Total Biaya</Label>
                <Input
                  type="number"
                  value={addFormData.totalBiaya || 0}
                  onChange={(e) => setAddFormData({...addFormData, totalBiaya: parseInt(e.target.value) || 0})}
                  className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                />
              </div>
            )}

            {currentTab === "balik-nama" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "biayaPengurusan", label: "Biaya Pengurusan" },
                  { key: "biayaAdmin", label: "Biaya Admin" },
                  { key: "biayaLegalisir", label: "Biaya Legalisir" },
                  { key: "biayaCetak", label: "Biaya Cetak" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={addFormData[field.key] || 0}
                      onChange={(e) => setAddFormData({...addFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentTab === "tarik-berkas" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "biayaPengambilan", label: "Biaya Pengambilan" },
                  { key: "biayaAdmin", label: "Biaya Admin" },
                  { key: "biayaEkspedisi", label: "Biaya Ekspedisi" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={addFormData[field.key] || 0}
                      onChange={(e) => setAddFormData({...addFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}

            {currentTab === "duplikat-stnk" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "biayaPembuatan", label: "Biaya Pembuatan" },
                  { key: "biayaAdmin", label: "Biaya Admin" },
                  { key: "biayaCetak", label: "Biaya Cetak" },
                  { key: "biayaValidasi", label: "Biaya Validasi" },
                  { key: "totalEstimasi", label: "Total Estimasi" },
                ].map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">{field.label}</Label>
                    <Input
                      type="number"
                      value={addFormData[field.key] || 0}
                      onChange={(e) => setAddFormData({...addFormData, [field.key]: parseInt(e.target.value) || 0})}
                      className="h-8 text-xs font-mono tabular-nums text-right bg-input-background border-border"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 gap-2 flex justify-end">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setIsAddDialogOpen(false)}>
              Batal
            </Button>
            <Button size="sm" onClick={handleSaveAdd} className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
              Tambah
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
