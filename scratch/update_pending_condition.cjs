const fs = require('fs');
let code = fs.readFileSync('src/app/data/financeStore.ts', 'utf8');

const rx = /\/\/ Condition 2: Profit cannot already be realized\r?\n\s+if \(inv\.profitStatus === "REALIZED"\) return false;/;
if (rx.test(code)) {
  code = code.replace(rx, '// Condition 2: Profit stays pending until Samsat/work completion');
  fs.writeFileSync('src/app/data/financeStore.ts', code, 'utf8');
  console.log('Successfully updated condition in financeStore.ts!');
} else {
  console.log('Regex did not match');
}
