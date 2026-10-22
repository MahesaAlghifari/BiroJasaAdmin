const fs = require('fs');
const readline = require('readline');

const filePath = 'C:/Users/mahes/.gemini/antigravity/brain/4869b8c1-4be9-45c8-ac32-b2a933495169/.system_generated/steps/27855/content.md';

const rl = readline.createInterface({
  input: fs.createReadStream(filePath),
  crlfDelay: Infinity
});

const provinces = [];
const regencies = [];

// regex to extract ('kode', 'nama', ...)
// e.g. ('11','Aceh','Banda Aceh', ...)
// e.g. ('11.01','Kabupaten Aceh Selatan','Tapak Tuan', ...)
const insertRegex = /^\('([0-9]{2}(?:\.[0-9]{2})?)','([^']+)',/;

rl.on('line', (line) => {
  const match = line.match(insertRegex);
  if (match) {
    const code = match[1];
    const name = match[2];
    if (code.length === 2) {
      provinces.push({ code, name });
    } else if (code.length === 5 && code.includes('.')) {
      const provCode = code.slice(0, 2);
      const isKota = name.startsWith('Kota ');
      const jenis = isKota ? 'Kota' : 'Kabupaten';
      regencies.push({
        kode_provinsi: provCode,
        kode_kabupaten_kota: code,
        nama_kabupaten_kota: name,
        jenis_wilayah: jenis,
      });
    }
  }
});

rl.on('close', () => {
  console.log('--- DATASET SUMMARY ---');
  console.log('Total Provinces:', provinces.length);
  console.log('Total Regencies/Cities:', regencies.length);

  const kabCount = regencies.filter(r => r.jenis_wilayah === 'Kabupaten').length;
  const kotaCount = regencies.filter(r => r.jenis_wilayah === 'Kota').length;
  console.log('Kabupaten:', kabCount);
  console.log('Kota:', kotaCount);

  // Group by province
  const provMap = new Map();
  provinces.forEach(p => provMap.set(p.code, { ...p, items: [] }));
  regencies.forEach(r => {
    const p = provMap.get(r.kode_provinsi);
    if (p) p.items.push(r);
    else console.warn('Missing province for:', r);
  });

  console.log('\nSample Provinces:');
  provinces.slice(0, 5).forEach(p => console.log(`[${p.code}] ${p.name} (${provMap.get(p.code)?.items.length} kab/kota)`));
  console.log('...');
  provinces.slice(-5).forEach(p => console.log(`[${p.code}] ${p.name} (${provMap.get(p.code)?.items.length} kab/kota)`));
});
