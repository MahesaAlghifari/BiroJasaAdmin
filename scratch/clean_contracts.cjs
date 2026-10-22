const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "src", "app", "data", "penjualanContractData.ts");
const content = fs.readFileSync(filePath, "utf8");

const splitHeader = "/**\n * Initial Contract Datasets\n */";
const idx = content.indexOf(splitHeader);
if (idx === -1) {
  console.error("Split header not found");
  process.exit(1);
}

const preservedCode = content.slice(0, idx);
const newContracts = `/**
 * Initial Contract Datasets (Clean Initial State - Transactions Derived from Canonical Orders)
 */
export const initialMutasiLDContract: any[] = [];
export const initialMutasiASContract: any[] = [];
export const initialBBNContract: any[] = [];
export const initialPerpanjanganPajakContract: any[] = [];
export const initialLainLainContract: any[] = [];
export const initialBelumKurangBayarContract: any[] = [];
export const initialProfitTerpendingContract: any[] = [];
export const initialCashbackTerpendingContract: any[] = [];
`;

fs.writeFileSync(filePath, preservedCode + newContracts, "utf8");
console.log("Successfully cleaned initial contracts in penjualanContractData.ts!");
