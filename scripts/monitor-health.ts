/**
 * Operational Monitoring & Health Baseline Script
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Usage:
 *   npx tsx scripts/monitor-health.ts [baseUrl]
 * Example:
 *   npx tsx scripts/monitor-health.ts http://127.0.0.1:3001
 */

import fs from "node:fs";
import path from "node:path";
import { CONFIG } from "../server/src/config/env";

const baseUrl = process.argv[2] || `http://127.0.0.1:${CONFIG.PORT || 3001}`;

interface HealthReport {
  timestamp: string;
  status: "HEALTHY" | "DEGRADED" | "CRITICAL";
  probes: {
    liveness: { ok: boolean; status?: number; data?: any; error?: string };
    readiness: { ok: boolean; status?: number; checks?: any; error?: string };
  };
  storage: {
    dbFileExists: boolean;
    dbSizeBytes: number;
    uploadsDirExists: boolean;
    uploadsCount: number;
    uploadsTotalBytes: number;
    backupDirExists: boolean;
    latestBackupTimestamp?: string;
    backupFreshnessHours?: number;
    isBackupFresh: boolean;
  };
  warnings: string[];
  errors: string[];
}

async function runHealthCheck(): Promise<void> {
  console.log(`[SUN89 Monitor] Checking application health at: ${baseUrl}...`);
  const report: HealthReport = {
    timestamp: new Date().toISOString(),
    status: "HEALTHY",
    probes: {
      liveness: { ok: false },
      readiness: { ok: false },
    },
    storage: {
      dbFileExists: false,
      dbSizeBytes: 0,
      uploadsDirExists: false,
      uploadsCount: 0,
      uploadsTotalBytes: 0,
      backupDirExists: false,
      isBackupFresh: false,
    },
    warnings: [],
    errors: [],
  };

  // 1. Check Liveness Probe
  try {
    const liveRes = await fetch(`${baseUrl}/api/health/live`, { signal: AbortSignal.timeout(5000) });
    report.probes.liveness.status = liveRes.status;
    if (liveRes.ok) {
      report.probes.liveness.ok = true;
      report.probes.liveness.data = await liveRes.json();
    } else {
      report.errors.push(`Liveness probe returned HTTP ${liveRes.status}`);
    }
  } catch (err: any) {
    report.probes.liveness.error = err.message;
    report.errors.push(`Liveness probe connection failed: ${err.message}`);
  }

  // 2. Check Readiness Probe
  try {
    const readyRes = await fetch(`${baseUrl}/api/health/ready`, { signal: AbortSignal.timeout(5000) });
    report.probes.readiness.status = readyRes.status;
    const body = await readyRes.json().catch(() => ({}));
    report.probes.readiness.checks = body.checks;
    if (readyRes.ok && body.status === "ready") {
      report.probes.readiness.ok = true;
    } else {
      report.errors.push(`Readiness probe reported not ready (HTTP ${readyRes.status})`);
    }
  } catch (err: any) {
    report.probes.readiness.error = err.message;
    report.errors.push(`Readiness probe connection failed: ${err.message}`);
  }

  // 3. Inspect Local Persistent Storage
  if (fs.existsSync(CONFIG.DB_PATH)) {
    report.storage.dbFileExists = true;
    report.storage.dbSizeBytes = fs.statSync(CONFIG.DB_PATH).size;
  } else {
    report.errors.push(`Database file not found at: ${CONFIG.DB_PATH}`);
  }

  if (fs.existsSync(CONFIG.UPLOAD_DIR)) {
    report.storage.uploadsDirExists = true;
    const files = fs.readdirSync(CONFIG.UPLOAD_DIR).filter(f => !f.startsWith("."));
    report.storage.uploadsCount = files.length;
    let totalBytes = 0;
    for (const f of files) {
      try {
        totalBytes += fs.statSync(path.join(CONFIG.UPLOAD_DIR, f)).size;
      } catch {
        // ignore concurrent read
      }
    }
    report.storage.uploadsTotalBytes = totalBytes;
  } else {
    report.errors.push(`Upload directory not found at: ${CONFIG.UPLOAD_DIR}`);
  }

  // 4. Inspect Backup Freshness (Alert if no backup in past 24 hours)
  if (fs.existsSync(CONFIG.BACKUP_DIR)) {
    report.storage.backupDirExists = true;
    const backups = fs.readdirSync(CONFIG.BACKUP_DIR).filter(f => f.startsWith("db_backup_") && f.endsWith(".sqlite"));
    if (backups.length > 0) {
      backups.sort().reverse();
      const latestBackup = backups[0];
      const stat = fs.statSync(path.join(CONFIG.BACKUP_DIR, latestBackup));
      report.storage.latestBackupTimestamp = stat.mtime.toISOString();
      const ageHours = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);
      report.storage.backupFreshnessHours = Number(ageHours.toFixed(1));
      if (ageHours <= 24) {
        report.storage.isBackupFresh = true;
      } else {
        report.warnings.push(`Most recent database backup is ${report.storage.backupFreshnessHours} hours old (> 24h threshold).`);
      }
    } else {
      report.warnings.push("No database backups found in backup directory.");
    }
  } else {
    report.warnings.push(`Backup directory does not exist at: ${CONFIG.BACKUP_DIR}`);
  }

  // 5. Evaluate Overall Status
  if (report.errors.length > 0) {
    report.status = "CRITICAL";
  } else if (report.warnings.length > 0) {
    report.status = "DEGRADED";
  } else {
    report.status = "HEALTHY";
  }

  // Print Summary
  console.log("\n==================== OPERATIONAL HEALTH REPORT ====================");
  console.log(`Overall Status:   ${report.status}`);
  console.log(`Liveness Probe:   ${report.probes.liveness.ok ? "OK (200)" : "FAILED"}`);
  console.log(`Readiness Probe:  ${report.probes.readiness.ok ? "OK (200)" : "FAILED"}`);
  console.log(`Database Size:    ${(report.storage.dbSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Upload Files:     ${report.storage.uploadsCount} files (${(report.storage.uploadsTotalBytes / 1024).toFixed(1)} KB)`);
  console.log(`Latest Backup:    ${report.storage.latestBackupTimestamp || "None"} (${report.storage.backupFreshnessHours ?? "N/A"}h ago)`);
  console.log(`Backup Freshness: ${report.storage.isBackupFresh ? "FRESH (< 24h)" : "STALE / MISSING"}`);

  if (report.warnings.length > 0) {
    console.log("\nWarnings:");
    report.warnings.forEach(w => console.log(`  ⚠ ${w}`));
  }

  if (report.errors.length > 0) {
    console.log("\nErrors:");
    report.errors.forEach(e => console.log(`  ✖ ${e}`));
  }
  console.log("===================================================================\n");

  if (report.status === "CRITICAL") {
    process.exit(1);
  }
}

runHealthCheck().catch(err => {
  console.error("Monitor execution failed:", err);
  process.exit(1);
});
