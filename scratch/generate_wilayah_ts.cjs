const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'wilayah_indonesia_514.json'), 'utf-8'));

// Clean any trailing spaces in names
data.provinsi.forEach(p => {
  p.nama_provinsi = p.nama_provinsi.trim();
});

data.kabupaten_kota.forEach(k => {
  k.nama_kabupaten_kota = k.nama_kabupaten_kota.trim();
  k.nama_provinsi = k.nama_provinsi.trim();
});

const tsContent = `/**
 * Master Data Wilayah Administratif Indonesia (Kepmendagri No. 300.2.2-2138 Tahun 2025)
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Target Cakupan Resmi:
 * - 38 Provinsi
 * - 416 Kabupaten
 * - 98 Kota
 * - Total 514 Kabupaten/Kota
 */

export interface ProvinsiItem {
  kode_provinsi: string;
  nama_provinsi: string;
}

export interface WilayahAdministratifItem {
  kode_kabupaten_kota: string; // Official code e.g. "31.75"
  kode_provinsi: string; // Official province code e.g. "31"
  nama_provinsi: string;
  nama_kabupaten_kota: string;
  jenis_wilayah: "Kabupaten" | "Kota";
  status_aktif: boolean;
  sumber_referensi: string;
  tahun_referensi: number;
}

export const WILAYAH_REFERENSI = {
  sumber: "Keputusan Menteri Dalam Negeri Nomor 300.2.2-2138 Tahun 2025",
  tahun: 2025,
  totalProvinsi: ${data.provinsi.length},
  totalKabupatenKota: ${data.kabupaten_kota.length},
  totalKabupaten: ${data.meta.total_kabupaten},
  totalKota: ${data.meta.total_kota},
};

export const PROVINSI_LIST: ProvinsiItem[] = ${JSON.stringify(data.provinsi, null, 2)};

export const WILAYAH_ADMINISTRATIF_LIST: WilayahAdministratifItem[] = ${JSON.stringify(data.kabupaten_kota, null, 2)};

// Fast lookup maps
const wilayahByKodeMap = new Map<string, WilayahAdministratifItem>();
const wilayahByNameMap = new Map<string, WilayahAdministratifItem>();

WILAYAH_ADMINISTRATIF_LIST.forEach((w) => {
  wilayahByKodeMap.set(w.kode_kabupaten_kota, w);
  wilayahByNameMap.set(w.nama_kabupaten_kota.toLowerCase(), w);
});

export function findWilayahByKode(kode: string): WilayahAdministratifItem | undefined {
  return wilayahByKodeMap.get(kode);
}

export function findWilayahByName(name: string): WilayahAdministratifItem | undefined {
  if (!name) return undefined;
  const normalized = name.toLowerCase().trim();
  return (
    wilayahByNameMap.get(normalized) ||
    WILAYAH_ADMINISTRATIF_LIST.find((w) => {
      const lower = w.nama_kabupaten_kota.toLowerCase();
      return lower.includes(normalized) || normalized.includes(lower.replace(/^(kabupaten|kota)\s+/i, ""));
    })
  );
}

export function getWilayahByProvinsi(kodeProvinsi: string): WilayahAdministratifItem[] {
  return WILAYAH_ADMINISTRATIF_LIST.filter((w) => w.kode_provinsi === kodeProvinsi);
}
`;

const destFrontend = path.resolve(__dirname, '../src/domain/pricing/wilayahIndonesiaData.ts');
const destBackend = path.resolve(__dirname, '../server/src/database/wilayahData.ts');

fs.writeFileSync(destFrontend, tsContent, 'utf-8');
fs.writeFileSync(destBackend, tsContent, 'utf-8');

console.log('Successfully generated:');
console.log('1.', destFrontend);
console.log('2.', destBackend);
