import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Eye, Download, AlertCircle, FileText, Loader2 } from "lucide-react";
import { documentRepository } from "../../data/repositories/documentRepository";
import { downloadDataUrl } from "../utils/documentSvgGenerator";

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  documentName?: string;
  rawUrl?: string;
  fileType?: "image" | "pdf" | string;
  documentId?: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  title = "Preview Dokumen",
  documentName = "Dokumen",
  rawUrl,
  fileType,
  documentId,
}: DocumentPreviewModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [resolvedMime, setResolvedMime] = useState<string | null>(null);
  const [createdBlobUrl, setCreatedBlobUrl] = useState<string | null>(null);

  // Clean up blob URL
  const cleanupBlob = () => {
    if (createdBlobUrl) {
      try {
        URL.revokeObjectURL(createdBlobUrl);
      } catch {
        // ignore
      }
      setCreatedBlobUrl(null);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      cleanupBlob();
      setDisplayUrl(null);
      setErrorMessage(null);
      setResolvedMime(null);
      setIsLoading(false);
      return;
    }

    if (!rawUrl) {
      cleanupBlob();
      setDisplayUrl(null);
      setErrorMessage(null);
      setResolvedMime(null);
      setIsLoading(false);
      return;
    }

    // 1. Legacy Base64 URL or Blob URL
    if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
      cleanupBlob();
      setDisplayUrl(rawUrl);
      if (rawUrl.startsWith("data:application/pdf")) {
        setResolvedMime("application/pdf");
      } else if (rawUrl.startsWith("data:image/")) {
        setResolvedMime("image/jpeg");
      }
      setIsLoading(false);
      return;
    }

    // 2. Server URL: fetch blob with authentication
    let isCancelled = false;
    const fetchServerDocument = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      cleanupBlob();

      try {
        let fetchUrl = rawUrl;
        const docId =
          documentId ||
          (rawUrl ? rawUrl.match(/\/documents\/([A-Za-z0-9_-]+)/)?.[1] : undefined);

        // Try getting ticket if docId is present
        if (docId) {
          try {
            fetchUrl = await documentRepository.getAuthenticatedPreviewUrl(docId);
          } catch {
            // fallback to original URL
          }
        }

        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
        const headers: Record<string, string> = {};
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(fetchUrl, { headers });
        if (isCancelled) return;

        if (res.status === 401 || res.status === 403) {
          setErrorMessage("Akses ditolak (401). Sesi Anda mungkin telah berakhir atau Anda tidak memiliki hak akses berkas ini.");
          setIsLoading(false);
          return;
        }

        if (res.status === 404) {
          setErrorMessage("Berkas dokumen tidak ditemukan di server (404).");
          setIsLoading(false);
          return;
        }

        if (!res.ok) {
          setErrorMessage(`Gagal memuat dokumen dari server (HTTP ${res.status}).`);
          setIsLoading(false);
          return;
        }

        const blob = await res.blob();
        if (isCancelled) return;

        const mime = blob.type.toLowerCase();
        setResolvedMime(mime);
        const objectUrl = URL.createObjectURL(blob);
        setCreatedBlobUrl(objectUrl);
        setDisplayUrl(objectUrl);
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMessage(err?.message || "Gagal menghubungi server untuk memuat dokumen.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchServerDocument();

    return () => {
      isCancelled = true;
      cleanupBlob();
    };
  }, [isOpen, rawUrl, documentId]);

  const handleModalClose = () => {
    cleanupBlob();
    onClose();
  };

  // Determine whether file is PDF
  const isPdf = Boolean(
    resolvedMime === "application/pdf" ||
      fileType === "pdf" ||
      (typeof rawUrl === "string" && rawUrl.startsWith("data:application/pdf")) ||
      (!resolvedMime && documentName?.toLowerCase().endsWith(".pdf"))
  );

  const handleDownload = () => {
    if (!displayUrl) return;

    const safeName = (documentName || "dokumen").replace(/[/\\?%*:|"<>]/g, "_");
    if (displayUrl.startsWith("data:")) {
      const ext = isPdf ? ".pdf" : ".jpg";
      downloadDataUrl(displayUrl, safeName.includes(".") ? safeName : `${safeName}${ext}`);
    } else {
      const a = document.createElement("a");
      a.href = displayUrl;
      a.download = safeName;
      if (!createdBlobUrl) {
        a.target = "_blank";
        a.rel = "noreferrer";
      }
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[92vh] bg-card text-card-foreground p-4 sm:p-5 flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground truncate">
            Nama Berkas: <span className="font-mono text-foreground font-medium">{documentName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2 my-2 flex items-center justify-center bg-muted/20 border border-border rounded-lg min-h-[280px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8 space-y-2 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-medium">Memuat berkas dokumen...</p>
            </div>
          ) : errorMessage ? (
            <div className="text-center p-6 space-y-2 text-rose-500">
              <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
              <p className="text-xs font-semibold">{errorMessage}</p>
              <p className="text-[11px] text-muted-foreground">
                Gagal memuat pratinjau berkas digital. Pastikan Anda telah login dengan kredensial yang sah.
              </p>
            </div>
          ) : displayUrl ? (
            isPdf ? (
              <iframe
                src={displayUrl}
                title={documentName}
                className="w-full h-[65vh] rounded border border-border bg-white"
              />
            ) : (
              <img
                src={displayUrl}
                alt={documentName}
                className="max-h-[65vh] max-w-full object-contain rounded shadow-xs"
              />
            )
          ) : (
            <div className="text-center p-6 space-y-2">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <p className="text-xs font-medium text-foreground">{documentName}</p>
              <p className="text-[11px] text-muted-foreground">
                Berkas terdaftar resmi pada sistem operasional (belum ada softcopy digital yang diunggah)
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 sm:justify-between">
          {displayUrl && !errorMessage ? (
            <Button
              size="sm"
              variant="default"
              onClick={handleDownload}
              className="inline-flex items-center justify-center h-8 px-3 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh Berkas
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" variant="outline" onClick={handleModalClose} className="w-full sm:w-auto">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
