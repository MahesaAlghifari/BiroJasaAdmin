import { Button } from "./ui/button";
import { Card } from "./ui/card";

const groups = [
  { title: "Informasi Kendaraan", fields: ["R4 / R2", "Plat Nomor di BPKB / STNK", "Nama Customer", "Nama Sesuai BPKB / STNK"] },
  { title: "Informasi Pengurusan", fields: ["Jenis Pengurusan", "Samsat", "Jenis Bayar"] },
  { title: "Keuangan", fields: ["Tanggal Uang Masuk", "Uang Masuk dari Konsumen", "Bank Uang Keluar", "Tanggal Uang Keluar", "Uang Keluar dari Biro Jasa", "Profit", "Status"] },
  { title: "Dokumen", fields: ["No Invoice", "Tanggal Invoice", "Tanda Terima", "BPKB", "Status BPKB", "TTB BPKB"] },
];

export function PenjualanAdd() {
 return <div className="space-y-6">
  <div><h2 className="text-2xl font-semibold">Tambah Data Penjualan</h2><p className="text-muted-foreground">Input data penjualan baru</p></div>
  {groups.map((g)=><Card key={g.title} className="p-6"><h3 className="font-semibold mb-4">{g.title}</h3><div className="grid md:grid-cols-2 gap-4">{g.fields.map(f=><div key={f}><label className="text-sm text-muted-foreground">{f}</label><input className="mt-1 w-full h-10 rounded-md border px-3 bg-background" /></div>)}</div></Card>)}
  <div className="flex justify-end gap-2"><Button variant="outline">Batal</Button><Button>Simpan</Button></div>
 </div>
}
