const fs = require('fs');
let code = fs.readFileSync('src/app/components/BuatOrder.tsx', 'utf8');

const target = `                      {/* Transfer BCA / Mandiri details */}
                      {formData.metodePembayaran.includes("Transfer") && (
                        <div className="p-3 rounded-lg border border-border bg-card text-xs space-y-2">
                          <p className="font-medium text-foreground text-xs flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-primary" />
                            Rekening Resmi Penerimaan SUN89:
                          </p>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
                            <div>
                              <p className="font-semibold text-foreground text-xs">Bank Central Asia (BCA)</p>
                              <p className="font-mono text-sm font-bold text-primary mt-0.5">772-019-2831</p>
                              <p className="text-[11px] text-muted-foreground">a.n. PT Biro Jasa SUN89 Abadi</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleCopy("7720192831", "bank")}
                              className="h-8 text-xs gap-1.5 shrink-0"
                            >
                              {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedBank ? "Tersalin" : "Salin Rekening"}
                            </Button>
                          </div>
                        </div>
                      )}`;

const replacement = `                      {/* Transfer / Bank details dynamically from selected Master Data method */}
                      {(() => {
                        const matchedPm = activeMethods?.find((m) => m.nama_metode === formData.metodePembayaran);
                        const isTransfer = formData.metodePembayaran.includes("Transfer") || (matchedPm && matchedPm.bank !== "Tunai" && matchedPm.bank !== "QRIS");
                        if (!isTransfer) return null;

                        const bankName = matchedPm?.bank || "Bank Central Asia (BCA)";
                        const accNo = matchedPm?.nomor_rekening || "772-019-2831";
                        const accName = matchedPm?.nama_rekening || "PT Biro Jasa SUN89 Abadi";

                        return (
                          <div className="p-3 rounded-lg border border-border bg-card text-xs space-y-2">
                            <p className="font-medium text-foreground text-xs flex items-center gap-1.5">
                              <Building className="w-3.5 h-3.5 text-primary" />
                              Rekening Resmi Penerimaan SUN89:
                            </p>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-md bg-muted/30 border border-border/60">
                              <div>
                                <p className="font-semibold text-foreground text-xs">{bankName}</p>
                                <p className="font-mono text-sm font-bold text-primary mt-0.5">{accNo}</p>
                                {accName && <p className="text-[11px] text-muted-foreground">a.n. {accName}</p>}
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopy(accNo.replace(/[^0-9]/g, ""), "bank")}
                                className="h-8 text-xs gap-1.5 shrink-0"
                              >
                                {copiedBank ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                {copiedBank ? "Tersalin" : "Salin Rekening"}
                              </Button>
                            </div>
                          </div>
                        );
                      })()}`;

if (code.includes(target)) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/app/components/BuatOrder.tsx', code, 'utf8');
  console.log('Successfully updated bank details card in BuatOrder.tsx!');
} else {
  console.log('Target not found in BuatOrder.tsx');
}
