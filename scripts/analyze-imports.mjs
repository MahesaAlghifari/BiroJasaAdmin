import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
    else if (/\.(ts|tsx)$/.test(f)) results.push(full);
  }
  return results;
}

const pkgs = new Set();
for (const file of walk('src')) {
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.matchAll(/from\s+['"]([^.][^'"]+)['"]/g);
  for (const m of matches) {
    const spec = m[1];
    if (spec.startsWith('@/')) continue;
    const pkg = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    pkgs.add(pkg);
  }
}

console.log(JSON.stringify(Array.from(pkgs).sort(), null, 2));
