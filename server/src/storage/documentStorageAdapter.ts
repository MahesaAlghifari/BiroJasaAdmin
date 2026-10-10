/**
 * Document Storage Adapter Interface
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Provides an abstraction layer for persistent file storage,
 * allowing seamless transition between local disk and future cloud object storage (S3/GCS).
 */

import { Readable } from "node:stream";

export interface StoredFileResult {
  storageName: string;
  filePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface IDocumentStorageAdapter {
  /**
   * Persist file buffer to underlying storage medium.
   */
  saveFile(buffer: Buffer, safeExtension: string): Promise<StoredFileResult>;

  /**
   * Retrieve file buffer by storage name.
   */
  readFile(storageName: string): Promise<Buffer>;

  /**
   * Get readable stream for efficient file streaming/piping.
   */
  getReadStream(storageName: string): Readable;

  /**
   * Delete file from storage medium.
   */
  deleteFile(storageName: string): Promise<void>;

  /**
   * Check if file exists in storage medium.
   */
  exists(storageName: string): Promise<boolean>;

  /**
   * Resolve absolute file path (for local disk implementations).
   */
  getFilePath(storageName: string): string;
}
