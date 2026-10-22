import fs from 'node:fs';
import path from 'node:path';

function walkDir(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'brain') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else {
      fileList.push(fullPath.replace(/\\/g, '/'));
    }
  }
  return fileList;
}

const allFiles = walkDir('.');

// 1. Backend routers, controllers, services, repositories
const backendFiles = allFiles.filter(f => f.startsWith('server/src/'));
console.log('Backend files count:', backendFiles.length);

// 2. Frontend stores & repositories
const frontendDataFiles = allFiles.filter(f => f.includes('src/app/data/') || f.includes('src/data/') || f.includes('src/domain/'));
console.log('Frontend data files count:', frontendDataFiles.length);

// 3. Scan for mock / dummy / fixture files
const mockFiles = allFiles.filter(f => 
  f.toLowerCase().includes('dummy') || 
  f.toLowerCase().includes('mock') || 
  f.toLowerCase().includes('fake') || 
  f.toLowerCase().includes('fixture') ||
  f.toLowerCase().includes('sample')
);
console.log('\n=== MOCK / DUMMY / SAMPLE FILES ===');
mockFiles.forEach(f => console.log(' -', f));

// 4. Scan for localStorage / sessionStorage usage
const storageUsages = [];
for (const file of allFiles) {
  if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js') && !file.endsWith('.mjs')) continue;
  if (file.includes('scratch/') || file.includes('tests/')) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('localStorage') || line.includes('sessionStorage')) {
      storageUsages.push({ file, line: idx + 1, snippet: line.trim().slice(0, 100) });
    }
  });
}
console.log(`\n=== LOCALSTORAGE / SESSIONSTORAGE USAGES (${storageUsages.length}) ===`);
storageUsages.forEach(u => console.log(`[${u.file}:${u.line}] ${u.snippet}`));

