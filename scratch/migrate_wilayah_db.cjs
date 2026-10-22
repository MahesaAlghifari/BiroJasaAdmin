const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../server/data/database.sqlite');
console.log('Connecting to database:', dbPath);
const db = new DatabaseSync(dbPath);

console.log('--- 1. Creating Tables ---');
db.exec(`
  CREATE TABLE IF NOT EXISTS wilayah_administratif (
    kode_kabupaten_kota TEXT PRIMARY KEY,
    kode_provinsi TEXT NOT NULL,
    nama_provinsi TEXT NOT NULL,
    nama_kabupaten_kota TEXT NOT NULL,
    jenis_wilayah TEXT NOT NULL CHECK(jenis_wilayah IN ('Kabupaten', 'Kota')),
    status_aktif INTEGER NOT NULL DEFAULT 1,
    sumber_referensi TEXT NOT NULL DEFAULT 'Kepmendagri No. 300.2.2-2138 Tahun 2025',
    tahun_referensi INTEGER NOT NULL DEFAULT 2025,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_wilayah_provinsi ON wilayah_administratif(kode_provinsi);
  CREATE INDEX IF NOT EXISTS idx_wilayah_nama ON wilayah_administratif(nama_kabupaten_kota);

  CREATE TABLE IF NOT EXISTS samsat_offices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    wilayah TEXT NOT NULL,
    alamat TEXT,
    kode_kabupaten_kota TEXT,
    is_verified INTEGER NOT NULL DEFAULT 1,
    status_aktif INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (kode_kabupaten_kota) REFERENCES wilayah_administratif(kode_kabupaten_kota)
  );

  CREATE INDEX IF NOT EXISTS idx_samsat_wilayah ON samsat_offices(kode_kabupaten_kota);
`);

console.log('--- 2. Populating Wilayah Administratif ---');
const dataJsonPath = path.resolve(__dirname, 'wilayah_indonesia_514.json');
const rawData = JSON.parse(fs.readFileSync(dataJsonPath, 'utf-8'));

const insertWilayah = db.prepare(`
  INSERT OR REPLACE INTO wilayah_administratif (
    kode_kabupaten_kota, kode_provinsi, nama_provinsi, nama_kabupaten_kota,
    jenis_wilayah, status_aktif, sumber_referensi, tahun_referensi, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

let insertedWilayah = 0;
for (const item of rawData.kabupaten_kota) {
  insertWilayah.run(
    item.kode_kabupaten_kota,
    item.kode_provinsi,
    item.nama_provinsi.trim(),
    item.nama_kabupaten_kota.trim(),
    item.jenis_wilayah,
    item.status_aktif ? 1 : 0,
    item.sumber_referensi,
    item.tahun_referensi
  );
  insertedWilayah++;
}
console.log(`Successfully populated ${insertedWilayah} kabupaten/kota into wilayah_administratif.`);

console.log('--- 3. Populating Samsat Offices ---');
const insertSamsatOffice = db.prepare(`
  INSERT OR REPLACE INTO samsat_offices (
    id, name, wilayah, alamat, kode_kabupaten_kota, is_verified, status_aktif, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
`);

const verifiedOffices = [
  { id: "samsat-jakarta-timur", name: "Samsat Jakarta Timur", wilayah: "Jakarta Timur", alamat: "Jl. Raya Pondok Gede", kode: "31.75" },
  { id: "samsat-jakarta-barat", name: "Samsat Jakarta Barat", wilayah: "Jakarta Barat", alamat: "Jl. Daan Mogot", kode: "31.73" },
  { id: "samsat-jakarta-selatan", name: "Samsat Jakarta Selatan", wilayah: "Jakarta Selatan", alamat: "Jl. TB Simatupang", kode: "31.74" },
  { id: "samsat-jakarta-utara", name: "Samsat Jakarta Utara", wilayah: "Jakarta Utara", alamat: "Jl. Yos Sudarso", kode: "31.72" },
  { id: "samsat-jakarta-pusat", name: "Samsat Jakarta Pusat", wilayah: "Jakarta Pusat", alamat: "Jl. Gn. Sahari", kode: "31.71" },
  { id: "samsat-depok", name: "Samsat Depok", wilayah: "Depok", alamat: "Jl. Margonda Raya", kode: "32.76" },
  { id: "samsat-bekasi", name: "Samsat Bekasi", wilayah: "Bekasi", alamat: "Jl. Ahmad Yani", kode: "32.75" },
  { id: "samsat-tangerang", name: "Samsat Tangerang", wilayah: "Tangerang", alamat: "Jl. Gatot Subroto", kode: "36.71" },
  { id: "samsat-bogor", name: "Samsat Bogor", wilayah: "Bogor", alamat: "Jl. Pajajaran", kode: "32.71" },
  { id: "samsat-tangerang-selatan", name: "Samsat Tangerang Selatan", wilayah: "Tangerang Selatan", alamat: "Jl. Pahlawan Seribu", kode: "36.74" },
];

for (const office of verifiedOffices) {
  insertSamsatOffice.run(
    office.id,
    office.name,
    office.wilayah,
    office.alamat,
    office.kode,
    1,
    1
  );
}
console.log(`Successfully populated ${verifiedOffices.length} verified operational Samsat offices.`);

console.log('--- 4. Verification Check ---');
const totalWilayah = db.prepare('SELECT COUNT(*) as c FROM wilayah_administratif').get().c;
const totalProvinces = db.prepare('SELECT COUNT(DISTINCT kode_provinsi) as c FROM wilayah_administratif').get().c;
const totalKab = db.prepare("SELECT COUNT(*) as c FROM wilayah_administratif WHERE jenis_wilayah = 'Kabupaten'").get().c;
const totalKota = db.prepare("SELECT COUNT(*) as c FROM wilayah_administratif WHERE jenis_wilayah = 'Kota'").get().c;
const totalSamsat = db.prepare('SELECT COUNT(*) as c FROM samsat_offices').get().c;

console.log('Results in SQLite Database:');
console.log('- Total Wilayah Administratif:', totalWilayah);
console.log('- Total Provinsi:', totalProvinces);
console.log('- Total Kabupaten:', totalKab);
console.log('- Total Kota:', totalKota);
console.log('- Total Kantor Samsat Terdaftar:', totalSamsat);

db.close();
console.log('Migration completed successfully!');
