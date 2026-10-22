const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "src", "app", "data", "financeStore.ts");
let content = fs.readFileSync(filePath, "utf8");

// 1. In syncFromRepository: if (Array.isArray(repoInvoices))
content = content.replace(
  "if (Array.isArray(repoInvoices) && repoInvoices.length > 0) {\r\n      this.invoices = repoInvoices;\r\n    }",
  "if (Array.isArray(repoInvoices)) {\r\n      this.invoices = repoInvoices;\r\n    }"
);
content = content.replace(
  "if (Array.isArray(repoInvoices) && repoInvoices.length > 0) {\n      this.invoices = repoInvoices;\n    }",
  "if (Array.isArray(repoInvoices)) {\n      this.invoices = repoInvoices;\n    }"
);

// 2. reimbursementRequests: ReimbursementRequest[] = [];
const reimbStart = content.indexOf("private reimbursementRequests: ReimbursementRequest[] = [");
if (reimbStart !== -1) {
  const reimbEnd = content.indexOf("];", reimbStart);
  if (reimbEnd !== -1) {
    content = content.slice(0, reimbStart) + "private reimbursementRequests: ReimbursementRequest[] = [];" + content.slice(reimbEnd + 2);
  }
}

// 3. buildInitialInvoices returns [] if rawTagihanData is empty (already empty now)
fs.writeFileSync(filePath, content, "utf8");
console.log("financeStore.ts updated successfully!");
