/**
 * File Validation & Magic Bytes Security Inspector
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Inspects file binary signatures (magic bytes) to guarantee authenticity,
 * preventing MIME-spoofing, active content execution, and malicious payloads.
 */

import path from "node:path";
import { ApiError } from "../middleware/errorHandler";
import { CONFIG } from "../config/env";

export interface FileValidationResult {
  mimeType: "application/pdf" | "image/jpeg" | "image/png";
  extension: ".pdf" | ".jpg" | ".png";
  sanitizedOriginalName: string;
}

// Magic bytes signatures
const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const JPEG_MAGIC = Buffer.from([0xFF, 0xD8, 0xFF]);

// Executable / malicious signatures
const MZ_EXE = Buffer.from([0x4D, 0x5A]); // Windows PE EXE / DLL
const ELF_BIN = Buffer.from([0x7F, 0x45, 0x4C, 0x46]); // Linux ELF

/**
 * Validates the file buffer magic bytes against allowed document formats.
 */
export function detectMagicMimeType(buffer: Buffer): "application/pdf" | "image/jpeg" | "image/png" | null {
  if (!buffer || buffer.length < 4) {
    return null;
  }

  // Check for executable signatures first
  if (buffer.length >= 2 && buffer[0] === MZ_EXE[0] && buffer[1] === MZ_EXE[1]) {
    return null;
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === ELF_BIN[0] &&
    buffer[1] === ELF_BIN[1] &&
    buffer[2] === ELF_BIN[2] &&
    buffer[3] === ELF_BIN[3]
  ) {
    return null;
  }

  // Check PDF (%PDF)
  if (
    buffer.length >= 4 &&
    buffer[0] === PDF_MAGIC[0] &&
    buffer[1] === PDF_MAGIC[1] &&
    buffer[2] === PDF_MAGIC[2] &&
    buffer[3] === PDF_MAGIC[3]
  ) {
    return "application/pdf";
  }

  // Check PNG
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return "image/png";
  }

  // Check JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === JPEG_MAGIC[0] &&
    buffer[1] === JPEG_MAGIC[1] &&
    buffer[2] === JPEG_MAGIC[2]
  ) {
    return "image/jpeg";
  }

  return null;
}

/**
 * Sanitizes original filename: strips path separators, null bytes, and non-printable chars.
 */
export function sanitizeFileName(name: string): string {
  if (!name) return "dokumen";
  // Extract base name to strip directory traversal components
  const base = path.basename(name);
  // Replace dangerous/disallowed characters
  const clean = base
    .replace(/[<>:"/\\|?*\x00-\x1F;&$`~]/g, "_")
    .replace(/\s+/g, "_")
    .trim();
  return clean.slice(0, 150) || "dokumen";
}

/**
 * Comprehensive file inspection: verifies size, magic bytes, and reported mime type.
 */
export function validateUploadedDocument(
  buffer: Buffer,
  originalName: string,
  reportedMime?: string
): FileValidationResult {
  // 1. Enforce size limit
  if (buffer.length > CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new ApiError(
      400,
      "FILE_TOO_LARGE",
      `Ukuran berkas melebihi batas maksimum (${Math.round(CONFIG.MAX_FILE_SIZE_BYTES / 1024 / 1024)}MB).`
    );
  }

  if (buffer.length === 0) {
    throw new ApiError(400, "EMPTY_FILE", "Berkas tidak boleh kosong (0 bytes).");
  }

  // 2. Inspect binary magic bytes
  const detectedMime = detectMagicMimeType(buffer);
  if (!detectedMime) {
    throw new ApiError(
      400,
      "INVALID_FILE_TYPE",
      "Format berkas tidak didukung atau isi berkas tidak valid. Hanya berkas PDF, JPEG, dan PNG yang diizinkan."
    );
  }

  // 3. Prevent MIME spoofing if reportedMime is provided
  if (reportedMime) {
    const normReported = reportedMime.toLowerCase().trim();
    if (detectedMime === "application/pdf" && normReported !== "application/pdf") {
      throw new ApiError(400, "MIME_MISMATCH", "Header Content-Type tidak sesuai dengan isi berkas PDF.");
    }
    if (detectedMime === "image/jpeg" && normReported !== "image/jpeg" && normReported !== "image/jpg") {
      throw new ApiError(400, "MIME_MISMATCH", "Header Content-Type tidak sesuai dengan isi berkas JPEG.");
    }
    if (detectedMime === "image/png" && normReported !== "image/png") {
      throw new ApiError(400, "MIME_MISMATCH", "Header Content-Type tidak sesuai dengan isi berkas PNG.");
    }
  }

  // 4. Resolve canonical extension
  const extension: ".pdf" | ".jpg" | ".png" =
    detectedMime === "application/pdf"
      ? ".pdf"
      : detectedMime === "image/png"
      ? ".png"
      : ".jpg";

  const sanitizedOriginalName = sanitizeFileName(originalName);

  return {
    mimeType: detectedMime,
    extension,
    sanitizedOriginalName,
  };
}
