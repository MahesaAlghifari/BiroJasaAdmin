/**
 * Client-side Document & Image Processor with Adaptive Compression & HEIC Support
 * Admin SUN89 — Biro Jasa Management System
 * 
 * Supports: PDF, JPEG, JPG, PNG, HEIC, HEIF
 * Maximum allowed size: 5MB
 * Adaptive compression: Images are compressed via Canvas (high quality 0.85, max 1920px)
 * preserving crisp document text while reducing multi-megabyte photos to compact sizes (~200KB - 500KB).
 * HEIC images are seamlessly converted to high-fidelity JPEGs before upload.
 */

export interface ProcessedDocumentResult {
  fileUrl: string;
  file: File;
  fileType: "image" | "pdf";
  fileName: string;
  fileSize: number;
  originalSize: number;
  mimeType: string;
  compressed: boolean;
  compressionRatio?: string;
}

export const MAX_DOCUMENT_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
];

export const ALLOWED_DOCUMENT_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
];

/**
 * Format raw bytes into human-readable string (e.g. 420 KB, 1.8 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Validates document format against supported types.
 */
export function validateDocumentFile(file: File): void {
  const ext = `.${file.name.split(".").pop()?.toLowerCase() || ""}`;
  const isExtensionValid = ALLOWED_DOCUMENT_EXTENSIONS.includes(ext);
  const isMimeValid =
    !file.type ||
    ALLOWED_DOCUMENT_MIME_TYPES.includes(file.type.toLowerCase()) ||
    file.type.startsWith("image/");

  if (!isExtensionValid && !isMimeValid) {
    throw new Error(
      `Format file "${ext}" tidak didukung. Harap unggah berkas dengan format PDF, JPEG, JPG, PNG, atau HEIC.`
    );
  }
}

/**
 * Converts HEIC/HEIF file to high-quality JPEG in the browser.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const heic2anyModule = await import("heic2any");
    const heic2any = (heic2anyModule as any).default || heic2anyModule;
    const converted = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.85,
    });
    const blob: Blob = Array.isArray(converted) ? converted[0] : converted;
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (err: any) {
    console.warn("[fileCompressor] HEIC conversion warning:", err);
    throw new Error(
      `Gagal mengonversi file HEIC "${file.name}". Pastikan berkas foto HEIC valid.`
    );
  }
}

/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Resizes images exceeding 1920px in either dimension to preserve clarity of text on documents,
 * and encodes with high-fidelity JPEG compression (quality 0.85).
 */
export async function compressImageFile(
  file: File,
  maxDimension = 1920,
  quality = 0.85
): Promise<{ dataUrl: string; file: File; size: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar untuk proses kompresi"));
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        // Downscale proportionally if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const originalData = reader.result as string;
          resolve({ dataUrl: originalData, file, size: file.size });
          return;
        }

        // Enable high-quality bicubic/smooth image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Fill white background (useful for transparent PNGs converted to JPEG)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);

        // Draw image
        ctx.drawImage(img, 0, 0, width, height);

        // Export as Blob with 0.85 quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const originalData = reader.result as string;
              resolve({ dataUrl: originalData, file, size: file.size });
              return;
            }
            const sanitizedName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
            const compressedFile = new File([blob], sanitizedName, { type: "image/jpeg" });
            const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
            resolve({
              dataUrl: compressedDataUrl,
              file: compressedFile,
              size: blob.size,
            });
          },
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Universal document processor for PDF, JPEG, JPG, PNG, and HEIC files.
 * - Handles HEIC conversion to JPEG automatically.
 * - Enforces 5MB maximum size (after compression for images, raw for PDF).
 * - Compresses images to compact size without losing quality or readability.
 * - Retains PDFs in their original high-fidelity format.
 */
export async function processDocumentUpload(rawFile: File): Promise<ProcessedDocumentResult> {
  // 1. Format validation
  validateDocumentFile(rawFile);

  let file = rawFile;
  const rawExt = file.name.split(".").pop()?.toLowerCase() || "";
  const isHeic = rawExt === "heic" || rawExt === "heif" || file.type.includes("heic") || file.type.includes("heif");

  // 2. Convert HEIC if needed
  if (isHeic) {
    file = await convertHeicToJpeg(file);
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const isPdf = ext === "pdf" || file.type === "application/pdf";

  // 3. Process PDF (Lossless)
  if (isPdf) {
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      throw new Error(
        `Ukuran berkas PDF (${formatFileSize(file.size)}) melebihi batas maksimum 5MB. Silakan pilih berkas PDF yang lebih kecil.`
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Gagal membaca file PDF"));
      reader.onload = () => {
        resolve({
          fileUrl: reader.result as string,
          file,
          fileType: "pdf",
          fileName: file.name,
          fileSize: file.size,
          originalSize: rawFile.size,
          mimeType: "application/pdf",
          compressed: false,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  // 4. Process Image with adaptive compression
  try {
    const { dataUrl, file: compressedFile, size: compressedBytes } = await compressImageFile(file);

    // Validate size AFTER compression
    if (compressedBytes > MAX_DOCUMENT_FILE_SIZE) {
      throw new Error(
        `Ukuran berkas gambar setelah kompresi (${formatFileSize(compressedBytes)}) masih melebihi batas maksimum 5MB. Harap gunakan foto dengan resolusi lebih rendah.`
      );
    }

    const reductionPercent =
      rawFile.size > 0 ? Math.round(((rawFile.size - compressedBytes) / rawFile.size) * 100) : 0;
    const sanitizedName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";

    return {
      fileUrl: dataUrl,
      file: compressedFile,
      fileType: "image",
      fileName: sanitizedName,
      fileSize: compressedBytes,
      originalSize: rawFile.size,
      mimeType: "image/jpeg",
      compressed: reductionPercent > 0,
      compressionRatio: reductionPercent > 0 ? `${reductionPercent}% lebih kecil` : undefined,
    };
  } catch (err: any) {
    if (err.message && err.message.includes("5MB")) {
      throw err;
    }
    // Fallback if canvas compression fails
    if (file.size > MAX_DOCUMENT_FILE_SIZE) {
      throw new Error(
        `Ukuran berkas (${formatFileSize(file.size)}) melebihi batas maksimum 5MB.`
      );
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
      reader.onload = () => {
        resolve({
          fileUrl: reader.result as string,
          file,
          fileType: "image",
          fileName: file.name,
          fileSize: file.size,
          originalSize: rawFile.size,
          mimeType: file.type || "image/jpeg",
          compressed: false,
        });
      };
      reader.readAsDataURL(file);
    });
  }
}
