/**
 * Deterministic Production Release Packaging Script
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Packages an immutable application release artifact into releases/<version>/
 * completely decoupled from mutable runtime state (data, uploads, backups, .env).
 * 
 * Usage: npx tsx scripts/package-release.ts
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

export interface ReleaseManifest {
  applicationName: string;
  applicationVersion: string;
  gitCommit: string;
  buildTimestamp: string;
  nodeRuntimeVersion: string;
  lockfileVersion: number;
  frontendArtifacts: {
    entryHtmlSha256: string;
    totalFiles: number;
    totalBytes: number;
  };
  backendArtifacts: {
    entryServerSha256: string;
    totalFiles: number;
  };
  deploymentModel: string;
}

export function generateFileSha256(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function copyDirRecursiveSync(srcDir: string, destDir: string, excludeDirs: string[] = []): { fileCount: number; byteCount: number } {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  let fileCount = 0;
  let byteCount = 0;

  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (excludeDirs.includes(entry.name)) {
      continue;
    }

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      const sub = copyDirRecursiveSync(srcPath, destPath, excludeDirs);
      fileCount += sub.fileCount;
      byteCount += sub.byteCount;
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
      const stat = fs.statSync(srcPath);
      fileCount += 1;
      byteCount += stat.size;
    }
  }

  return { fileCount, byteCount };
}

export function packageRelease(customTargetDir?: string): { releaseDir: string; manifest: ReleaseManifest } {
  const projectRoot = path.resolve(process.cwd());
  const pkgJsonPath = path.join(projectRoot, "package.json");
  const pkgLockPath = path.join(projectRoot, "package-lock.json");
  const distDir = path.join(projectRoot, "dist");
  const serverDir = path.join(projectRoot, "server");

  // 1. Verify required source artifacts
  if (!fs.existsSync(pkgJsonPath)) throw new Error("package.json not found");
  if (!fs.existsSync(pkgLockPath)) throw new Error("package-lock.json not found");
  if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error("Frontend production build ('dist/') missing. Run 'npm run build' first.");
  }
  if (!fs.existsSync(serverDir) || !fs.existsSync(path.join(serverDir, "src/server.ts"))) {
    throw new Error("Backend server sources ('server/src/server.ts') missing.");
  }

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
  const pkgLock = JSON.parse(fs.readFileSync(pkgLockPath, "utf-8"));
  const version = pkg.version || "1.0.0";

  // 2. Resolve Git Commit Hash
  let gitCommit = "unknown";
  try {
    gitCommit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
  } catch {
    gitCommit = "standalone-build";
  }

  // 3. Define target release directory
  const releaseBaseDir = customTargetDir || path.join(projectRoot, "releases", version);
  if (fs.existsSync(releaseBaseDir)) {
    fs.rmSync(releaseBaseDir, { recursive: true, force: true });
  }
  fs.mkdirSync(releaseBaseDir, { recursive: true });

  // 4. Copy Immutable Frontend Artifacts
  const targetDistDir = path.join(releaseBaseDir, "dist");
  const distCopyStats = copyDirRecursiveSync(distDir, targetDistDir);
  const entryHtmlSha = generateFileSha256(path.join(distDir, "index.html"));

  // 5. Copy Immutable Backend Code (Strictly copy server/src to eliminate any ephemeral or data directories)
  const targetServerDir = path.join(releaseBaseDir, "server");
  fs.mkdirSync(targetServerDir, { recursive: true });
  const serverCopyStats = copyDirRecursiveSync(path.join(serverDir, "src"), path.join(targetServerDir, "src"));
  const entryServerSha = generateFileSha256(path.join(serverDir, "src/server.ts"));

  // 6. Copy Manifests
  fs.copyFileSync(pkgJsonPath, path.join(releaseBaseDir, "package.json"));
  fs.copyFileSync(pkgLockPath, path.join(releaseBaseDir, "package-lock.json"));

  // 7. Generate Release Manifest
  const manifest: ReleaseManifest = {
    applicationName: pkg.name || "Admin-SUN89",
    applicationVersion: version,
    gitCommit,
    buildTimestamp: new Date().toISOString(),
    nodeRuntimeVersion: process.version,
    lockfileVersion: pkgLock.lockfileVersion || 3,
    frontendArtifacts: {
      entryHtmlSha256: entryHtmlSha,
      totalFiles: distCopyStats.fileCount,
      totalBytes: distCopyStats.byteCount,
    },
    backendArtifacts: {
      entryServerSha256: entryServerSha,
      totalFiles: serverCopyStats.fileCount,
    },
    deploymentModel: "Single-Server Linux/Windows Node.js Systemd/Service with Nginx/Caddy Reverse Proxy",
  };

  const manifestPath = path.join(releaseBaseDir, "release-manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");

  // 8. Strict Invariant Validations
  // Ensure NO mutable runtime data was bundled
  if (fs.existsSync(path.join(releaseBaseDir, "server/data"))) {
    throw new Error("INVARIANT VIOLATION: server/data was included in immutable release artifact!");
  }
  if (fs.existsSync(path.join(releaseBaseDir, "server/uploads"))) {
    throw new Error("INVARIANT VIOLATION: server/uploads was included in immutable release artifact!");
  }
  if (fs.existsSync(path.join(releaseBaseDir, "server/backups"))) {
    throw new Error("INVARIANT VIOLATION: server/backups was included in immutable release artifact!");
  }
  if (fs.existsSync(path.join(releaseBaseDir, ".env"))) {
    throw new Error("INVARIANT VIOLATION: .env secret file was included in release artifact!");
  }

  // Ensure manifest contains no credentials
  const manifestStr = JSON.stringify(manifest);
  if (manifestStr.includes("jwt") || manifestStr.includes("password") || manifestStr.includes("secret") || manifestStr.includes("key-2026")) {
    throw new Error("SECURITY VIOLATION: Sensitive secrets detected in release manifest!");
  }

  return { releaseDir: releaseBaseDir, manifest };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith("package-release.ts")) {
  try {
    console.log("[SUN89 Release] Starting production release packaging...");
    const { releaseDir, manifest } = packageRelease();
    console.log(`[SUN89 Release] Release packaged successfully at: ${releaseDir}`);
    console.log(`[SUN89 Release] Version: ${manifest.applicationVersion} (Git: ${manifest.gitCommit})`);
    console.log(`[SUN89 Release] Frontend Files: ${manifest.frontendArtifacts.totalFiles} (${manifest.frontendArtifacts.totalBytes} bytes)`);
    console.log(`[SUN89 Release] Backend Files: ${manifest.backendArtifacts.totalFiles}`);
    console.log(`[SUN89 Release] Release Manifest: ${path.join(releaseDir, "release-manifest.json")}`);
  } catch (err) {
    console.error("[SUN89 Release] Packaging failed:", err);
    process.exit(1);
  }
}
