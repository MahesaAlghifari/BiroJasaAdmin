const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'components', 'FinanceDetailPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const isCrlf = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Add Badge import
const oldImport = `import { Button } from "./ui/button";`;
const newImport = `import { Button } from "./ui/button";
import { Badge } from "./ui/badge";`;

if (!content.includes(oldImport)) {
  console.error("Could not find Button import");
  process.exit(1);
}
content = content.replace(oldImport, newImport);

// 2. Insert dedicated financial anatomy cards right before {/* Rich Canonical Order Information Sections if available */}
const targetAnchor = `      {/* Rich Canonical Order Information Sections if available */}`;

const dedicatedCards = `      {/* Dedicated Financial Anatomy for Profit Terpending */}
      {subTabTitle.toLowerCase().includes("profit") && (
        <Card className="p-4 sm:p-5 border border-amber-500/30 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                💰
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Rincian Alur Keuangan &amp; Struktur Biaya (Profit Terpending)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pemisahan tegas antara dana titipan pajak Samsat, pendapatan jasa biro, dan beban pengeluaran aktual.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30 self-start sm:self-center">
              Pengerjaan Berjalan
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Uang Masuk */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                1. Uang Masuk Pelanggan
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Tagihan:</span>
                  <span className="font-mono font-medium">{formatRupiah(item.totalTagihan || item.uangMasuk || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pembayaran Terverifikasi:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(item.totalUangMasuk || item.uangMasuk || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Pembayaran:</span>
                  <span className="font-semibold text-emerald-600">Lunas</span>
                </div>
              </div>
            </div>

            {/* 2. Dana Titipan Samsat (Pass-Through) */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-rose-500">
                2. Dana Titipan Samsat (Pass-Through)
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimasi Pajak &amp; PNBP:</span>
                  <span className="font-mono font-medium text-rose-500">
                    {formatRupiah(item.danaTitipanPajak || item.biayaSamsat || 0)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                  *Diteruskan langsung ke kas negara/Samsat, bukan merupakan omset pendapatan biro jasa.
                </p>
              </div>
            </div>

            {/* 3. Ringkasan Kas & Estimasi Profit */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider text-primary">
                3. Selisih Kas &amp; Estimasi Profit
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uang Keluar Aktual:</span>
                  <span className="font-mono font-medium text-rose-500">
                    {formatRupiah(item.totalUangKeluarAktual || item.biayaSamsat || 0)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground font-medium">Selisih Kas Sementara:</span>
                  <span className="font-mono font-bold text-foreground">
                    {formatRupiah(item.selisihKasSementara ?? ((item.totalUangMasuk || item.uangMasuk || 0) - (item.totalUangKeluarAktual || item.biayaSamsat || 0)))}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-border">
                  <span className="text-muted-foreground font-semibold">Estimasi Margin Profit:</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {formatRupiah(item.estimasiProfit || item.profit || 0)}
                  </span>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium leading-tight">
                  (Estimasi — Profit final direalisasikan setelah pengerjaan selesai di Tahap 8)
                </p>
              </div>
            </div>
          </div>

          {/* Riwayat Pembayaran / Koreksi jika ada */}
          {item.riwayatPembayaran && item.riwayatPembayaran.length > 0 && (
            <div className="pt-2 border-t border-border/60">
              <h5 className="text-xs font-semibold text-foreground mb-1.5">Riwayat Pembayaran &amp; Koreksi:</h5>
              <div className="space-y-1">
                {item.riwayatPembayaran.map((r: any, idx: number) => (
                  <div key={idx} className="text-xs flex items-center justify-between p-2 rounded bg-muted/30">
                    <span>{new Date(r.tanggal).toLocaleDateString("id-ID")} • Oleh {r.admin}</span>
                    <span className="font-mono font-medium">
                      {formatRupiah(r.nominalLama)} → {formatRupiah(r.nominalBaru)}
                      {r.catatan && <span className="text-muted-foreground ml-1">({r.catatan})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Dedicated Financial Anatomy for Cashback Terpending */}
      {subTabTitle.toLowerCase().includes("cashback") && (
        <Card className="p-4 sm:p-5 border border-blue-500/30 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                🏷️
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Rincian Kewajiban Cashback &amp; Refund
                </h3>
                <p className="text-xs text-muted-foreground">
                  Pemisahan antara kewajiban pengembalian kelebihan bayar pelanggan dan komisi rekanan/agen.
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 self-start sm:self-center">
              {item.jenisKewajiban || "Kewajiban Pending"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Kelebihan Pembayaran Pelanggan */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <h4 className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                A. Kelebihan Pembayaran Pelanggan
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Kelebihan Bayar:</span>
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                    {formatRupiah(item.nominalKelebihan || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Penerima Pengembalian:</span>
                  <span className="font-medium text-foreground">Pelanggan ({item.customer})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Syarat Kelayakan:</span>
                  <span className="text-emerald-600 font-medium">Penjemputan Dokumen Selesai ✓</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alasan / Sumber:</span>
                  <span className="text-muted-foreground">{item.sumberKewajiban || "Bayar di awal melebihi tagihan"}</span>
                </div>
              </div>
            </div>

            {/* Cashback / Komisi Rekanan */}
            <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
              <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                B. Cashback / Komisi Rekanan Dijanjikan
              </h4>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nominal Komisi:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatRupiah(item.nominalKomisi || (item.nominalKelebihan ? 0 : item.jumlahCashback) || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Penerima Komisi:</span>
                  <span className="font-medium text-foreground">Rekanan / Agen Mitra</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Persentase / Acuan:</span>
                  <span className="font-medium text-foreground">{item.cashbackPersen || "3.5%"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status Pencairan:</span>
                  <span className="text-amber-600 font-semibold">{item.statusCashback || "Pending"}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Dedicated Financial Anatomy for Belum & Kurang Bayar */}
      {subTabTitle.toLowerCase().includes("belum") && (
        <Card className="p-4 sm:p-5 border border-rose-500/30 bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-border gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
                📑
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Rincian Kewajiban Piutang Pelanggan
                </h3>
                <p className="text-xs text-muted-foreground">
                  Kewajiban pembayaran yang belum dilunasi oleh pelanggan.
                </p>
              </div>
            </div>
            <Badge variant="outline" className={\`text-xs \${item.status === "Kurang Bayar" ? "bg-amber-500/10 text-amber-600 border-amber-500/30" : "bg-rose-500/10 text-rose-600 border-rose-500/30"}\`}>
              {item.status || "Piutang Aktif"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">Total Tagihan:</span>
              <p className="font-mono text-base font-semibold text-foreground mt-0.5">{formatRupiah(item.totalTagihan || 0)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-xs text-muted-foreground">Sudah Terbayar:</span>
              <p className="font-mono text-base font-semibold text-emerald-600 mt-0.5">{formatRupiah(item.terbayar || item.uangMasuk || 0)}</p>
            </div>
            <div className="p-3 rounded-lg border border-border bg-muted/20">
              <span className="text-xs text-muted-foreground font-semibold text-rose-600">Sisa Kewajiban Tagihan:</span>
              <p className="font-mono text-base font-bold text-rose-600 mt-0.5">{formatRupiah(item.kekurangan || item.sisa || 0)}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Rich Canonical Order Information Sections if available */}`;

if (!content.includes(targetAnchor)) {
  console.error("Could not find targetAnchor in FinanceDetailPage.tsx");
  process.exit(1);
}
content = content.replace(targetAnchor, dedicatedCards);

if (isCrlf) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated FinanceDetailPage.tsx!");
