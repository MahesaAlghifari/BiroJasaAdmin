const https = require('https');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/cahyadsn/wilayah/master/db/wilayah.sql';

console.log('Streaming from:', url);

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error('HTTP Error:', res.statusCode);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: res,
    crlfDelay: Infinity
  });

  const provinces = [];
  const regencies = [];

  // Match: ('11','Aceh') or ('11.01','Kabupaten Aceh Selatan')
  const regex = /^\('([0-9]{2}(?:\.[0-9]{2})?)','([^']+)'\)/;

  rl.on('line', (line) => {
    const trimmed = line.trim();
    const match = trimmed.match(regex);
    if (match) {
      const code = match[1];
      const name = match[2];
      if (code.length === 2) {
        provinces.push({
          kode_provinsi: code,
          nama_provinsi: name
        });
      } else if (code.length === 5 && code.includes('.')) {
        const provCode = code.slice(0, 2);
        const isKota = name.startsWith('Kota ');
        const jenis = isKota ? 'Kota' : 'Kabupaten';
        regencies.push({
          kode_provinsi: provCode,
          kode_kabupaten_kota: code,
          nama_kabupaten_kota: name,
          jenis_wilayah: jenis,
          status_aktif: true,
          sumber_referensi: 'Kepmendagri No. 300.2.2-2138 Tahun 2025',
          tahun_referensi: 2025
        });
      }
    }
  });

  rl.on('close', () => {
    console.log('\n====================================');
    console.log('KEMENDAGRI DATASET STREAMING RESULTS');
    console.log('====================================');
    console.log('Total Provinsi:', provinces.length);
    console.log('Total Kabupaten/Kota:', regencies.length);

    const kabCount = regencies.filter(r => r.jenis_wilayah === 'Kabupaten').length;
    const kotaCount = regencies.filter(r => r.jenis_wilayah === 'Kota').length;
    console.log('Kabupaten:', kabCount);
    console.log('Kota:', kotaCount);

    const provMap = new Map();
    provinces.forEach(p => provMap.set(p.kode_provinsi, { ...p, kabKotaCount: 0 }));
    regencies.forEach(r => {
      const p = provMap.get(r.kode_provinsi);
      if (p) {
        r.nama_provinsi = p.nama_provinsi;
        p.kabKotaCount++;
      } else {
        console.error('Orphan regency without province:', r);
      }
    });

    console.log('\nRincian per Provinsi:');
    Array.from(provMap.values()).forEach(p => {
      console.log(`[${p.kode_provinsi}] ${p.nama_provinsi}: ${p.kabKotaCount} kab/kota`);
    });

    // Save output
    const output = {
      meta: {
        sumber: 'Keputusan Menteri Dalam Negeri Nomor 300.2.2-2138 Tahun 2025',
        tahun: 2025,
        total_provinsi: provinces.length,
        total_kabupaten_kota: regencies.length,
        total_kabupaten: kabCount,
        total_kota: kotaCount
      },
      provinsi: provinces,
      kabupaten_kota: regencies
    };

    const outPath = path.resolve(__dirname, 'wilayah_indonesia_514.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    console.log('\nSaved verified dataset to:', outPath);
  });
}).on('error', (err) => {
  console.error('Download error:', err);
});
