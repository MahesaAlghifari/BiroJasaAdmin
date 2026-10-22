const fs = require('fs');
let code = fs.readFileSync('src/app/data/permissionStore.ts', 'utf8');

code = code.split('"master-samsat": { view: true, manage: true },').join('"master-samsat": { view: true, manage: true },\r\n      "master-metode-pembayaran": { view: true, manage: true },');
code = code.split('"master-samsat": { view: false, manage: false },').join('"master-samsat": { view: false, manage: false },\r\n      "master-metode-pembayaran": { view: false, manage: false },');

fs.writeFileSync('src/app/data/permissionStore.ts', code, 'utf8');
console.log('Successfully updated permissionStore.ts!');
