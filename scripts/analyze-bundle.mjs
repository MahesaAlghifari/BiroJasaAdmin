import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) results = results.concat(walk(full));
    else if (/\.(ts|tsx|js|jsx)$/.test(f)) {
      results.push({
        path: full,
        size: fs.statSync(full).size,
        lines: fs.readFileSync(full, 'utf8').split('\n').length
      });
    }
  }
  return results;
}

const files = walk('src');
files.sort((a, b) => b.size - a.size);

console.log('Top 20 largest source files:');
files.slice(0, 20).forEach(f => {
  console.log(`${(f.size / 1024).toFixed(1)} KB | ${f.lines} lines | ${f.path}`);
});
