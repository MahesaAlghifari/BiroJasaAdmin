/**
 * Automated Production Backup Script
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Usage: npx tsx scripts/backup.ts
 */

import { backupDatabase, backupUploads } from "../server/src/utils/backupRestore";

async function main() {
  console.log("[SUN89 Backup] Starting automated backup process...");

  // 1. Snapshot SQLite database
  const dbResult = backupDatabase();
  console.log(`[SUN89 Backup] Database backup complete: ${dbResult.backupPath} (${dbResult.sizeBytes} bytes)`);

  // 2. Backup document storage directory
  const uploadsResult = backupUploads();
  console.log(`[SUN89 Backup] Uploads backup complete: ${uploadsResult.backupDir} (${uploadsResult.fileCount} files, ${uploadsResult.totalBytes} bytes)`);

  console.log("[SUN89 Backup] All backups finished successfully.");
}

main().catch((err) => {
  console.error("[SUN89 Backup] Error during backup:", err);
  process.exit(1);
});
