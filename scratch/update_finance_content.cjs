const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "src", "app", "components", "FinanceContent.tsx");
let content = fs.readFileSync(filePath, "utf8");

// 1. Add imports
const importAnchor = `import { useKaryawanPengguna } from "../data/karyawanPenggunaAdapter";`;
const newImports = `import { useKaryawanPengguna } from "../data/karyawanPenggunaAdapter";
import { documentRepository } from "../../data/repositories/documentRepository";
import { processDocumentUpload, formatFileSize } from "../utils/fileCompressor";
import { usePaymentMethods } from "../data/paymentMethodStore";
import type { PaymentProof } from "../../domain/order/types";
import { Upload, ImageIcon, FileIcon, Trash2, Eye } from "lucide-react";`;

content = content.replace(importAnchor, newImports);

// 2. Add state and handlers
const stateAnchor = `  const [cashbackTargetItem, setCashbackTargetItem] = useState<any | null>(null);
  const [isSubmittingCashback, setIsSubmittingCashback] = useState(false);`;

const newState = `  const [cashbackTargetItem, setCashbackTargetItem] = useState<any | null>(null);
  const [isSubmittingCashback, setIsSubmittingCashback] = useState(false);
  const { activeMethods } = usePaymentMethods();
  const [lunasMethod, setLunasMethod] = useState("Transfer BCA");
  const [lunasProof, setLunasProof] = useState<PaymentProof | null>(null);
  const [isUploadingLunasProof, setIsUploadingLunasProof] = useState(false);

  const [cashbackMethod, setCashbackMethod] = useState("Transfer BCA");
  const [cashbackProof, setCashbackProof] = useState<PaymentProof | null>(null);
  const [isUploadingCashbackProof, setIsUploadingCashbackProof] = useState(false);

  const handleUploadLunasProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLunasProof(true);
      toast.info(\`Memproses bukti pelunasan \${file.name}...\`);
      const processed = await processDocumentUpload(file);
      const uploaded = await documentRepository.uploadDocument(processed.file, {
        orderNo: lunasTargetItem?.orderNo,
        documentType: "BUKTI_PEMBAYARAN",
      });
      setLunasProof({
        fileName: processed.fileName,
        fileType: processed.fileType,
        fileUrl: uploaded.fileUrl,
        fileSize: formatFileSize(processed.fileSize),
        documentId: uploaded.id,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(\`Bukti pelunasan \${processed.fileName} berhasil diunggah.\`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah bukti pelunasan.");
    } finally {
      setIsUploadingLunasProof(false);
      e.target.value = "";
    }
  };

  const handleUploadCashbackProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingCashbackProof(true);
      toast.info(\`Memproses bukti pencairan \${file.name}...\`);
      const processed = await processDocumentUpload(file);
      const uploaded = await documentRepository.uploadDocument(processed.file, {
        orderNo: cashbackTargetItem?.orderNo,
        documentType: "BUKTI_CASHBACK",
      });
      setCashbackProof({
        fileName: processed.fileName,
        fileType: processed.fileType,
        fileUrl: uploaded.fileUrl,
        fileSize: formatFileSize(processed.fileSize),
        documentId: uploaded.id,
        uploadedAt: new Date().toISOString(),
      });
      toast.success(\`Bukti pencairan \${processed.fileName} berhasil diunggah.\`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengunggah bukti pencairan.");
    } finally {
      setIsUploadingCashbackProof(false);
      e.target.value = "";
    }
  };`;

content = content.replace(stateAnchor, newState);

// 3. Update handleConfirmLunas
const oldConfirmLunas = `    const handleConfirmLunas = async () => {
      if (!lunasTargetItem) return;
      try {
        setIsSubmittingLunas(true);
        const ok = resolveInvoice(lunasTargetItem.id);
        if (ok) {
          toast.success(
            \`Tagihan \${lunasTargetItem.invoice || lunasTargetItem.invoiceNo} (\${lunasTargetItem.customer}) berhasil ditandai LUNAS. Penerimaan kas dicatat ke Kas Kantor.\`
          );
          setLunasTargetItem(null);
        } else {
          toast.error("Gagal memperbarui status pelunasan tagihan. Silakan periksa kembali data transaksi.");
        }
      } catch (err: any) {
        toast.error(err?.message || "Terjadi kesalahan saat memproses pelunasan.");
      } finally {
        setIsSubmittingLunas(false);
      }
    };`;

const newConfirmLunas = `    const handleConfirmLunas = async () => {
      if (!lunasTargetItem) return;
      if (!lunasProof) {
        toast.error("File bukti pembayaran wajib diunggah sebelum tagihan dapat ditandai lunas.");
        return;
      }
      try {
        setIsSubmittingLunas(true);
        const ok = recordPayment(lunasTargetItem.id, lunasTargetItem.sisa, {
          paymentMethod: lunasMethod,
          bank: lunasMethod,
          buktiPembayaran: lunasProof,
          catatan: \`Pelunasan tagihan \${lunasTargetItem.invoice || lunasTargetItem.invoiceNo}\`,
        });
        if (ok) {
          toast.success(
            \`Tagihan \${lunasTargetItem.invoice || lunasTargetItem.invoiceNo} (\${lunasTargetItem.customer}) berhasil ditandai LUNAS dengan bukti terlampir.\`
          );
          setLunasTargetItem(null);
          setLunasProof(null);
        } else {
          toast.error("Gagal memperbarui status pelunasan tagihan. Silakan periksa kembali data transaksi.");
        }
      } catch (err: any) {
        toast.error(err?.message || "Terjadi kesalahan saat memproses pelunasan.");
      } finally {
        setIsSubmittingLunas(false);
      }
    };`;

content = content.replace(oldConfirmLunas, newConfirmLunas);

// 4. Update handleConfirmCashbackPayment
const oldConfirmCashback = `  const handleConfirmCashbackPayment = async () => {
    if (!cashbackTargetItem) return;
    try {
      setIsSubmittingCashback(true);
      const isOverpaymentOnly = cashbackTargetItem.nominalKelebihan > 0 && (cashbackTargetItem.nominalKomisi || 0) === 0;
      const paymentType = isOverpaymentOnly ? "KELEBIHAN" : ((cashbackTargetItem.nominalKomisi || 0) > 0 && (cashbackTargetItem.nominalKelebihan || 0) === 0 ? "KOMISI" : "ALL");
      
      const ok = processCashbackPayment(cashbackTargetItem.id, {
        processedBy: "Finance Admin",
        paymentType,
      });

      if (ok) {
        toast.success(
          \`Pencairan \${isOverpaymentOnly ? "pengembalian kelebihan bayar" : "komisi cashback"} untuk \${cashbackTargetItem.invoice || cashbackTargetItem.orderNo} sebesar \${formatRupiah(cashbackTargetItem.jumlahCashback)} berhasil dicatat ke Kas Kantor.\`
        );
        setCashbackTargetItem(null);
      } else {
        toast.error("Gagal memproses pencairan cashback / refund.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat memproses pencairan.");
    } finally {
      setIsSubmittingCashback(false);
    }
  };`;

const newConfirmCashback = `  const handleConfirmCashbackPayment = async () => {
    if (!cashbackTargetItem) return;
    if (!cashbackProof) {
      toast.error("File bukti transfer / pembayaran wajib diunggah sebelum pencairan cashback/komisi dapat dikonfirmasi.");
      return;
    }
    try {
      setIsSubmittingCashback(true);
      const isOverpaymentOnly = cashbackTargetItem.nominalKelebihan > 0 && (cashbackTargetItem.nominalKomisi || 0) === 0;
      const paymentType = isOverpaymentOnly ? "KELEBIHAN" : ((cashbackTargetItem.nominalKomisi || 0) > 0 && (cashbackTargetItem.nominalKelebihan || 0) === 0 ? "KOMISI" : "ALL");
      
      const ok = processCashbackPayment(cashbackTargetItem.id, {
        processedBy: "Finance Admin",
        paymentType,
        bukti: cashbackProof.fileUrl,
        paymentMethod: cashbackMethod,
        catatan: \`Pencairan \${isOverpaymentOnly ? "pengembalian kelebihan bayar" : "komisi cashback"} ke \${cashbackTargetItem.penerimaCashback}\`,
      });

      if (ok) {
        toast.success(
          \`Pencairan \${isOverpaymentOnly ? "pengembalian kelebihan bayar" : "komisi cashback"} untuk \${cashbackTargetItem.invoice || cashbackTargetItem.orderNo} sebesar \${formatRupiah(cashbackTargetItem.jumlahCashback)} berhasil dicatat dengan bukti transfer.\`
        );
        setCashbackTargetItem(null);
        setCashbackProof(null);
      } else {
        toast.error("Gagal memproses pencairan cashback / refund.");
      }
    } catch (err: any) {
      toast.error(err?.message || "Terjadi kesalahan saat memproses pencairan.");
    } finally {
      setIsSubmittingCashback(false);
    }
  };`;

content = content.replace(oldConfirmCashback, newConfirmCashback);

// 5. Update dialog UI for lunasTargetItem
const oldLunasDialog = `        {/* Confirmation Dialog: Pelunasan Tagihan (Prioritas Audit Utama) */}
        <AlertDialog open={!!lunasTargetItem} onOpenChange={(open) => { if (!open && !isSubmittingLunas) setLunasTargetItem(null); }}>
          <AlertDialogContent className="border-border sm:max-w-md bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Konfirmasi pembayaran lunas
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1 space-y-3">
                <p className="leading-relaxed">
                  Pastikan pembayaran untuk tagihan ini benar-benar sudah diterima dan nominalnya sesuai. Setelah dikonfirmasi, status tagihan akan berubah menjadi <strong className="text-foreground font-semibold">Lunas</strong> dan penerimaan kas akan dicatat ke Kas Kantor.
                </p>
                {lunasTargetItem && (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">No Tagihan / Invoice:</span>
                      <span className="font-mono font-semibold text-foreground">{lunasTargetItem.invoice || lunasTargetItem.invoiceNo}</span>
                    </div>
                    {lunasTargetItem.orderNo && (
                      <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">No Order Terkait:</span>
                        <span className="font-mono font-medium text-foreground">{lunasTargetItem.orderNo}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Nama Customer:</span>
                      <span className="font-medium text-foreground">{lunasTargetItem.customer}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Nopol & Layanan:</span>
                      <span className="font-medium text-foreground">{lunasTargetItem.nopol} • {lunasTargetItem.jenisLayanan || lunasTargetItem.layanan}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Total Tagihan:</span>
                      <span className="font-semibold text-foreground">{formatRupiah(lunasTargetItem.totalTagihan)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground font-semibold">Sisa Tagihan yang Dilunasi:</span>
                      <span className="font-bold text-primary text-sm">{formatRupiah(lunasTargetItem.sisa)}</span>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel disabled={isSubmittingLunas} className="h-8 text-xs font-medium">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmittingLunas}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmLunas();
                }}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs flex items-center gap-1.5"
              >
                {isSubmittingLunas ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Ya, Tandai Lunas"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>`;

const newLunasDialog = `        {/* Confirmation Dialog: Pelunasan Tagihan (Standar Bukti Pembayaran Wajib) */}
        <AlertDialog open={!!lunasTargetItem} onOpenChange={(open) => { if (!open && !isSubmittingLunas) { setLunasTargetItem(null); setLunasProof(null); } }}>
          <AlertDialogContent className="border-border sm:max-w-md bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle className="w-4 h-4 text-primary" />
                Konfirmasi Pelunasan Tagihan
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1 space-y-3">
                <p className="leading-relaxed">
                  Pencatatan pembayaran konfirmasi wajib melampirkan berkas bukti transfer / setor kas sebelum status tagihan dapat diselesaikan menjadi Lunas.
                </p>
                {lunasTargetItem && (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">No Tagihan / Invoice:</span>
                      <span className="font-mono font-semibold text-foreground">{lunasTargetItem.invoice || lunasTargetItem.invoiceNo}</span>
                    </div>
                    {lunasTargetItem.orderNo && (
                      <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                        <span className="text-muted-foreground">No Order Terkait:</span>
                        <span className="font-mono font-medium text-foreground">{lunasTargetItem.orderNo}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Nama Customer:</span>
                      <span className="font-medium text-foreground">{lunasTargetItem.customer}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Sisa yang Dilunasi:</span>
                      <span className="font-bold text-primary text-sm">{formatRupiah(lunasTargetItem.sisa)}</span>
                    </div>

                    {/* Metode Pembayaran */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-semibold text-foreground block">
                        Metode Pembayaran Pelunasan <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={lunasMethod}
                        onChange={(e) => setLunasMethod(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {activeMethods.length > 0 ? (
                          activeMethods.map((m) => (
                            <option key={m.id} value={m.nama_metode}>
                              {m.nama_metode} ({m.bank}{m.nomor_rekening ? \` - \${m.nomor_rekening}\` : ""})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Transfer BCA">Transfer BCA</option>
                            <option value="Transfer Mandiri">Transfer Mandiri</option>
                            <option value="Transfer BRI">Transfer BRI</option>
                            <option value="Tunai / Kas Loket">Tunai / Kas Loket</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Upload Bukti Pembayaran Wajib */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-primary" />
                          Bukti Pembayaran <span className="text-destructive">* (Wajib)</span>
                        </label>
                        <span className={lunasProof ? "text-emerald-600 font-medium text-[10px]" : "text-destructive font-medium text-[10px]"}>
                          {lunasProof ? "✓ Terlampir" : "Wajib diunggah"}
                        </span>
                      </div>

                      {lunasProof ? (
                        <div className="p-2 rounded border border-emerald-500/30 bg-emerald-500/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {lunasProof.fileType === "pdf" ? <FileIcon className="w-4 h-4 text-emerald-600 shrink-0" /> : <ImageIcon className="w-4 h-4 text-emerald-600 shrink-0" />}
                            <span className="font-mono text-[11px] truncate text-foreground">{lunasProof.fileName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">({lunasProof.fileType})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setLunasProof(null)}
                            className="text-destructive hover:text-destructive/80 p-1 text-xs"
                            title="Hapus / ganti berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-3 border border-dashed border-border rounded-lg bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[11px] font-medium text-foreground">
                            {isUploadingLunasProof ? "Mengunggah..." : "Klik untuk upload bukti pembayaran (JPG, PNG, PDF, HEIC)"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Maksimal 5 MB (dikompres otomatis)</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic,.HEIC"
                            className="hidden"
                            disabled={isUploadingLunasProof}
                            onChange={handleUploadLunasProof}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel disabled={isSubmittingLunas} className="h-8 text-xs font-medium">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmittingLunas || !lunasProof || isUploadingLunasProof}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmLunas();
                }}
                className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingLunas ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Ya, Konfirmasi Pelunasan"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>`;

content = content.replace(oldLunasDialog, newLunasDialog);

// 6. Update dialog UI for cashbackTargetItem
const oldCashbackDialog = `        {/* Modal Konfirmasi Pencairan Cashback / Refund */}
        <AlertDialog open={!!cashbackTargetItem} onOpenChange={(open) => { if (!open && !isSubmittingCashback) setCashbackTargetItem(null); }}>
          <AlertDialogContent className="border-border sm:max-w-md bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                Konfirmasi Pencairan Cashback / Refund
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1 space-y-3">
                <p className="leading-relaxed">
                  Pastikan pembayaran atau pengembalian dana ini telah siap diproses. Pengeluaran kas akan dicatat tepat satu kali di Kas Kantor sebagai Kredit.
                </p>
                {cashbackTargetItem && (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">No Invoice / Order:</span>
                      <span className="font-mono font-semibold text-foreground">{cashbackTargetItem.invoice || cashbackTargetItem.orderNo}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Jenis Kewajiban:</span>
                      <span className="font-semibold text-foreground">{cashbackTargetItem.jenisKewajiban}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Penerima Dana:</span>
                      <span className="font-medium text-foreground">{cashbackTargetItem.penerimaCashback}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Sumber / Alasan:</span>
                      <span className="text-foreground">{cashbackTargetItem.sumberKewajiban}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-muted-foreground font-semibold">Nominal Dicairkan:</span>
                      <span className="font-bold text-blue-600 text-sm">{formatRupiah(cashbackTargetItem.jumlahCashback)}</span>
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel disabled={isSubmittingCashback} className="h-8 text-xs font-medium">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmittingCashback}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmCashbackPayment();
                }}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs flex items-center gap-1.5"
              >
                {isSubmittingCashback ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Ya, Cairkan Dana"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>`;

const newCashbackDialog = `        {/* Modal Konfirmasi Pencairan Cashback / Refund (Standar Bukti Pembayaran Wajib) */}
        <AlertDialog open={!!cashbackTargetItem} onOpenChange={(open) => { if (!open && !isSubmittingCashback) { setCashbackTargetItem(null); setCashbackProof(null); } }}>
          <AlertDialogContent className="border-border sm:max-w-md bg-card">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                Konfirmasi Pencairan Cashback / Refund
              </AlertDialogTitle>
              <AlertDialogDescription className="text-xs text-muted-foreground pt-1 space-y-3">
                <p className="leading-relaxed">
                  Pencatatan pengeluaran kas cashback/komisi wajib melampirkan berkas bukti transfer ke rekening partner sebelum status berubah menjadi sudah dibayar.
                </p>
                {cashbackTargetItem && (
                  <div className="rounded-lg border border-border/80 bg-muted/30 p-3 space-y-2 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">No Invoice / Order:</span>
                      <span className="font-mono font-semibold text-foreground">{cashbackTargetItem.invoice || cashbackTargetItem.orderNo}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Jenis Kewajiban:</span>
                      <span className="font-semibold text-foreground">{cashbackTargetItem.jenisKewajiban}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Penerima Dana:</span>
                      <span className="font-medium text-foreground">{cashbackTargetItem.penerimaCashback}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-border/40">
                      <span className="text-muted-foreground">Nominal Dicairkan:</span>
                      <span className="font-bold text-blue-600 text-sm">{formatRupiah(cashbackTargetItem.jumlahCashback)}</span>
                    </div>

                    {/* Saluran Pembayaran */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[11px] font-semibold text-foreground block">
                        Saluran Pengeluaran Kas <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={cashbackMethod}
                        onChange={(e) => setCashbackMethod(e.target.value)}
                        className="w-full h-8 px-2.5 rounded-md border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-blue-600"
                      >
                        {activeMethods.length > 0 ? (
                          activeMethods.map((m) => (
                            <option key={m.id} value={m.nama_metode}>
                              {m.nama_metode} ({m.bank}{m.nomor_rekening ? \` - \${m.nomor_rekening}\` : ""})
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Transfer BCA">Transfer BCA</option>
                            <option value="Transfer Mandiri">Transfer Mandiri</option>
                            <option value="Transfer BRI">Transfer BRI</option>
                            <option value="Kas Tunai">Kas Tunai</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Upload Bukti Transfer Wajib */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-foreground flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-blue-600" />
                          Bukti Transfer / Kas Keluar <span className="text-destructive">* (Wajib)</span>
                        </label>
                        <span className={cashbackProof ? "text-emerald-600 font-medium text-[10px]" : "text-destructive font-medium text-[10px]"}>
                          {cashbackProof ? "✓ Terlampir" : "Wajib diunggah"}
                        </span>
                      </div>

                      {cashbackProof ? (
                        <div className="p-2 rounded border border-blue-500/30 bg-blue-500/10 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {cashbackProof.fileType === "pdf" ? <FileIcon className="w-4 h-4 text-blue-600 shrink-0" /> : <ImageIcon className="w-4 h-4 text-blue-600 shrink-0" />}
                            <span className="font-mono text-[11px] truncate text-foreground">{cashbackProof.fileName}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">({cashbackProof.fileType})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCashbackProof(null)}
                            className="text-destructive hover:text-destructive/80 p-1 text-xs"
                            title="Hapus / ganti berkas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-3 border border-dashed border-border rounded-lg bg-background hover:bg-muted/30 cursor-pointer transition-colors">
                          <Upload className="w-4 h-4 text-muted-foreground mb-1" />
                          <span className="text-[11px] font-medium text-foreground">
                            {isUploadingCashbackProof ? "Mengunggah..." : "Klik untuk upload struk transfer (JPG, PNG, PDF, HEIC)"}
                          </span>
                          <span className="text-[10px] text-muted-foreground">Maksimal 5 MB (dikompres otomatis)</span>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.heic,.HEIC"
                            className="hidden"
                            disabled={isUploadingCashbackProof}
                            onChange={handleUploadCashbackProof}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4 gap-2">
              <AlertDialogCancel disabled={isSubmittingCashback} className="h-8 text-xs font-medium">
                Batal
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmittingCashback || !cashbackProof || isUploadingCashbackProof}
                onClick={(e) => {
                  e.preventDefault();
                  handleConfirmCashbackPayment();
                }}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingCashback ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Ya, Cairkan Dana"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>`;

content = content.replace(oldCashbackDialog, newCashbackDialog);

fs.writeFileSync(filePath, content, "utf8");
console.log("FinanceContent.tsx updated successfully!");
