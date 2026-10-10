import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Separator } from "./ui/separator";
import { Printer, Download } from "lucide-react";
import { toast } from "sonner";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export function InvoiceDialog({ open, onOpenChange, order }: InvoiceDialogProps) {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
    toast.success("Invoice siap dicetak!");
  };

  const handleDownloadPDF = () => {
    toast.success("Invoice berhasil diunduh sebagai PDF!");
  };

  // Format invoice number: BJ_YY-MM_XXXX
  const invoiceDate = new Date(order.tanggal);
  const invoiceNo = `BJ_${invoiceDate.getFullYear().toString().slice(-2)}-${String(invoiceDate.getMonth() + 1).padStart(2, '0')}_${order.orderNo.split('-')[1]}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-full print:border-0">
        <DialogHeader className="print:hidden">
          <DialogTitle>Invoice - {invoiceNo}</DialogTitle>
          <DialogDescription>
            Cetak atau unduh invoice untuk order ini
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Content */}
        <div className="bg-white text-black p-8 rounded-lg">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl mb-2">SUN 89 BIRO JASA</h1>
              <div className="text-sm space-y-1">
                <p>Jl. Raya Sukahati No. 6</p>
                <p>Kel. Sukahati, Kec. Cibinong-Bogor</p>
                <p>Tel: 021-83715981</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl mb-4">INVOICE</h2>
              <div className="text-sm space-y-1">
                <div className="flex gap-4">
                  <span className="w-24">No Faktur</span>
                  <span>:</span>
                  <span className="font-mono">{invoiceNo}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-24">Tanggal</span>
                  <span>:</span>
                  <span>{invoiceDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-24">Customer</span>
                  <span>:</span>
                  <span>{order.customer}</span>
                </div>
                <div className="flex gap-4">
                  <span className="w-24">Alamat</span>
                  <span>:</span>
                  <span>-</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6 bg-black" />

          {/* Service Details Table */}
          <div className="mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 px-2">KETERANGAN</th>
                  <th className="text-right py-2 px-2">HARGA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-2">{order.layanan}</td>
                  <td className="text-right py-3 px-2">Rp {order.totalBiaya.toLocaleString('id-ID')}</td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="py-3 px-2">Nopol: {order.nopol}</td>
                  <td className="text-right py-3 px-2">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          <div className="flex justify-end mb-6">
            <div className="w-1/2">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span>Total Biaya:</span>
                  <span>Rp {order.totalBiaya.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-300">
                  <span>Sudah Dibayar:</span>
                  <span className="text-green-600">Rp {order.dibayar.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between py-2 border-b-2 border-black">
                  <span>Kekurangan:</span>
                  <span className={order.kurang > 0 ? "text-red-600" : "text-green-600"}>
                    Rp {order.kurang.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8 text-sm">
            <p className="mb-2">Catatan:</p>
            <p>Pembayaran ke Rekening BCA 7175095764 a/n. ANISA SUSANTI</p>
          </div>

          <Separator className="my-6 bg-black" />

          {/* Footer Signatures */}
          <div className="flex justify-between items-end">
            <div className="text-center">
              <p className="mb-16">Tanda Terima</p>
              <div className="border-t border-black w-48 mx-auto"></div>
            </div>
            <div className="text-center">
              <p className="mb-16">Hormat Kami</p>
              <div className="border-t border-black w-48 mx-auto"></div>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
            <Printer className="w-4 h-4 mr-2" />
            Cetak Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
