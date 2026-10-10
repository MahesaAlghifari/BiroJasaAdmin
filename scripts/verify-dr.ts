/**
 * Disaster Recovery Verification Script
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Usage: npx tsx scripts/verify-dr.ts
 */

import { verifyDisasterRecovery } from "../server/src/utils/backupRestore";
import { CONFIG } from "../server/src/config/env";

async function main() {
  console.log("[SUN89 DR Verify] Verifying disaster recovery consistency...");
  console.log(`[SUN89 DR Verify] Database: ${CONFIG.DB_PATH}`);
  console.log(`[SUN89 DR Verify] Uploads: ${CONFIG.UPLOAD_DIR}`);

  const result = verifyDisasterRecovery(CONFIG.DB_PATH, CONFIG.UPLOAD_DIR);

  console.log(`[SUN89 DR Verify] SQLite Integrity: ${result.dbIntegrity}`);
  console.log(`[SUN89 DR Verify] Active Documents Checked: ${result.checkedDocuments}`);
  console.log(`[SUN89 DR Verify] Missing Files Count: ${result.missingFiles.length}`);
  console.log(`[SUN89 DR Verify] Hash Mismatches Count: ${result.mismatchedHashes.length}`);

  if (result.missingFiles.length > 0) {
    console.warn("[SUN89 DR Verify] Missing files:", result.missingFiles);
  }

  if (result.mismatchedHashes.length > 0) {
    console.error("[SUN89 DR Verify] Mismatched hashes:", result.mismatchedHashes);
  }

  if (!result.valid) {
    console.error("[SUN89 DR Verify] FAIL: Recovery consistency verification failed!");
    process.exit(1);
  }

  console.log("[SUN89 DR Verify] SUCCESS: Full database and document storage consistency verified.");
}

main().catch((err) => {
  console.error("[SUN89 DR Verify] Error:", err);
  process.exit(1);
});
