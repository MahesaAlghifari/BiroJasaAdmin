/**
 * Finance Export Utility — Admin SUN89
 * Generates actual-data CSV with UTF-8 BOM and printable PDF documents.
 * Completely free of canvas/screenshot rendering for true vector/text fidelity.
 */

import { formatDateDDMMYYYY, parseDateTimestamp, formatRupiah } from "./financeFormatters";

export type ExportFormat = "csv" | "pdf";
export type ExportPeriodOption = "all" | "today" | "this_week" | "this_month" | "this_year" | "custom";

export interface ExportColumn {
  key: string;
  label: string;
  align?: "left" | "center" | "right";
}

export interface SummaryMetric {
  label: string;
  value: string | number;
}

export interface CSVExportOptions {
  title: string;
  columns: ExportColumn[];
  data: any[];
  filename?: string;
  periodLabel?: string;
}

export interface PDFExportOptions {
  title: string;
  subTitle?: string;
  periodLabel: string;
  columns: ExportColumn[];
  data: any[];
  summaryMetrics?: SummaryMetric[];
  printedBy?: string;
}

/**
 * Filter dataset by chosen export period
 */
export function filterDataByExportPeriod(
  data: any[],
  columns: ExportColumn[],
  period: ExportPeriodOption,
  customRange?: { start?: string; end?: string }
): any[] {
  if (period === "all" || !data || data.length === 0) {
    return data;
  }

  // Detect primary date field in data
  const dateCol = columns.find((c) => {
    const k = c.key.toLowerCase();
    return k.includes("tanggal") || k.includes("tgl") || k.includes("tempo") || k.includes("date");
  });

  const dateKey = dateCol ? dateCol.key : "tanggal";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 86400000 - 1;

  if (period === "today") {
    return data.filter((row) => {
      const ts = parseDateTimestamp(row[dateKey]);
      return ts >= startOfDay && ts <= endOfDay;
    });
  }

  if (period === "this_week") {
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday).getTime();
    const endOfWeek = startOfWeek + 7 * 86400000 - 1;

    return data.filter((row) => {
      const ts = parseDateTimestamp(row[dateKey]);
      return ts >= startOfWeek && ts <= endOfWeek;
    });
  }

  if (period === "this_month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    return data.filter((row) => {
      const ts = parseDateTimestamp(row[dateKey]);
      return ts >= startOfMonth && ts <= endOfMonth;
    });
  }

  if (period === "this_year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();

    return data.filter((row) => {
      const ts = parseDateTimestamp(row[dateKey]);
      return ts >= startOfYear && ts <= endOfYear;
    });
  }

  if (period === "custom" && customRange?.start && customRange?.end) {
    const startCustom = new Date(customRange.start).getTime();
    const endCustom = new Date(customRange.end).getTime() + 86400000 - 1;

    return data.filter((row) => {
      const ts = parseDateTimestamp(row[dateKey]);
      return ts >= startCustom && ts <= endCustom;
    });
  }

  return data;
}

/**
 * Format individual cell value for display/export
 */
export function formatExportValue(val: any, colKey: string): string {
  if (val === null || val === undefined || val === "") return "-";

  const lowerKey = colKey.toLowerCase();

  // If date field
  if (lowerKey.includes("tanggal") || lowerKey.includes("tgl") || lowerKey.includes("tempo")) {
    return formatDateDDMMYYYY(String(val));
  }

  // If numeric currency
  if (typeof val === "number") {
    if (
      lowerKey.includes("uang") ||
      lowerKey.includes("tagihan") ||
      lowerKey.includes("terbayar") ||
      lowerKey.includes("sisa") ||
      lowerKey.includes("biaya") ||
      lowerKey.includes("profit") ||
      lowerKey.includes("debit") ||
      lowerKey.includes("kredit") ||
      lowerKey.includes("saldo") ||
      lowerKey.includes("total") ||
      lowerKey.includes("nominal") ||
      lowerKey.includes("in") ||
      lowerKey.includes("out") ||
      lowerKey.includes("cashback")
    ) {
      return formatRupiah(val);
    }
    return String(val);
  }

  return String(val).trim();
}

/**
 * Clean sanitization for CSV cell values
 */
function escapeCSVCell(value: string): string {
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes(";")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 1. ACTUAL DATA CSV EXPORT
 * Produces UTF-8 with BOM CSV that opens cleanly in Excel on Windows/Mac without mangling.
 */
export function exportToCSV({
  title,
  columns,
  data,
  filename,
  periodLabel,
}: CSVExportOptions): void {
  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  const actualFilename = filename || `AdminSUN89_${safeTitle}_${dateStr}.csv`;

  // Build CSV content
  const lines: string[] = [];

  // Metadata headers
  lines.push(`"LAPORAN: ${title.toUpperCase()}"`);
  if (periodLabel) {
    lines.push(`"PERIODE: ${periodLabel}"`);
  }
  lines.push(`"TANGGAL CETAK: ${new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}"`);
  lines.push(`"TOTAL BARIS: ${data.length} Transaksi"`);
  lines.push(""); // empty row before table

  // Table Column Headers
  const headers = columns.map((c) => escapeCSVCell(c.label));
  lines.push(headers.join(","));

  // Table Data Rows
  data.forEach((row) => {
    const rowValues = columns.map((col) => {
      const rawVal = row[col.key];
      const formatted = formatExportValue(rawVal, col.key);
      return escapeCSVCell(formatted);
    });
    lines.push(rowValues.join(","));
  });

  // Prepend UTF-8 BOM (\uFEFF)
  const csvContent = "\uFEFF" + lines.join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", actualFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 2. ACTUAL DATA PDF / PRINTABLE DOCUMENT EXPORT
 * Injects clean semantic HTML into a hidden print iframe and executes print dialog.
 * Crisp vector fonts, proper paper margins, repeated thead on all pages, no canvas blur.
 */
export function exportToPDF({
  title,
  subTitle,
  periodLabel,
  columns,
  data,
  summaryMetrics,
  printedBy = "Admin Keuangan SUN89",
}: PDFExportOptions): void {
  const printDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const printTime = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Build Summary Metrics HTML if provided
  let summaryHtml = "";
  if (summaryMetrics && summaryMetrics.length > 0) {
    summaryHtml = `
      <div class="summary-grid">
        ${summaryMetrics
          .map(
            (m) => `
          <div class="summary-card">
            <div class="summary-label">${m.label}</div>
            <div class="summary-value">${typeof m.value === "number" ? formatRupiah(m.value) : m.value}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  // Build Table HTML
  const theadHtml = columns
    .map((col) => {
      const align = col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left";
      return `<th class="${align}">${col.label}</th>`;
    })
    .join("");

  const tbodyHtml = data
    .map((row, idx) => {
      const rowClass = idx % 2 === 0 ? "even" : "odd";
      const cellsHtml = columns
        .map((col) => {
          const val = row[col.key];
          const formatted = formatExportValue(val, col.key);
          const align =
            col.align === "right" || formatted.startsWith("Rp") || formatted.startsWith("-Rp")
              ? "text-right font-mono"
              : col.align === "center"
              ? "text-center"
              : "text-left";

          let cellClass = align;
          if (val === "Lunas" || val === "Selesai") {
            cellClass += " badge-success";
          } else if (val === "Kurang Bayar" || val === "Pending") {
            cellClass += " badge-warning";
          } else if (val === "Belum Bayar") {
            cellClass += " badge-danger";
          }

          return `<td class="${cellClass}">${formatted}</td>`;
        })
        .join("");

      return `<tr class="${rowClass}">${cellsHtml}</tr>`;
    })
    .join("");

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>${title} - Admin SUN89</title>
        <style>
          @page {
            size: landscape;
            margin: 10mm 12mm 12mm 12mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 8.5pt;
            line-height: 1.35;
            padding: 8px;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .header-box {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .brand-title {
            font-size: 13pt;
            font-weight: 800;
            letter-spacing: -0.3px;
            color: #0f172a;
          }
          .brand-sub {
            font-size: 8pt;
            color: #475569;
            margin-top: 1px;
          }
          .meta-box {
            text-align: right;
            font-size: 7.5pt;
            color: #475569;
          }
          .report-heading {
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 12pt;
            font-weight: 700;
            color: #0f172a;
          }
          .report-sub {
            font-size: 8pt;
            color: #64748b;
            margin-top: 2px;
          }
          .summary-grid {
            display: flex;
            gap: 10px;
            margin-bottom: 12px;
          }
          .summary-card {
            flex: 1;
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 6px 10px;
            background-color: #f8fafc;
          }
          .summary-label {
            font-size: 7pt;
            color: #64748b;
            text-transform: uppercase;
            font-weight: 600;
          }
          .summary-value {
            font-size: 10.5pt;
            font-weight: 700;
            color: #0f172a;
            margin-top: 2px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background-color: #f1f5f9;
            color: #0f172a;
            font-weight: 700;
            border: 1px solid #cbd5e1;
            padding: 5px 6px;
            text-transform: uppercase;
            font-size: 7.5pt;
            letter-spacing: 0.2px;
          }
          td {
            border: 1px solid #cbd5e1;
            padding: 4.5px 6px;
          }
          tr.odd {
            background-color: #ffffff;
          }
          tr.even {
            background-color: #f8fafc;
          }
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-mono {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          }
          .badge-success {
            font-weight: 600;
            color: #15803d;
          }
          .badge-warning {
            font-weight: 600;
            color: #b45309;
          }
          .badge-danger {
            font-weight: 600;
            color: #b91c1c;
          }
          .signatures {
            margin-top: 24px;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .signature-col {
            width: 220px;
            text-align: center;
          }
          .signature-label {
            font-size: 8pt;
            color: #475569;
            margin-bottom: 45px;
          }
          .signature-line {
            border-top: 1px solid #0f172a;
            padding-top: 3px;
            font-size: 8pt;
            font-weight: 600;
          }
          .doc-footer {
            margin-top: 16px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 5px;
            display: flex;
            justify-content: space-between;
            font-size: 7pt;
            color: #94a3b8;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="brand-title">ADMIN SUN89</div>
            <div class="brand-sub">Biro Jasa & Manajemen Layanan Samsat Terpadu</div>
          </div>
          <div class="meta-box">
            <div><strong>Waktu Cetak:</strong> ${printDate}, ${printTime} WIB</div>
            <div><strong>Petugas:</strong> ${printedBy}</div>
          </div>
        </div>

        <div class="report-heading">
          <div class="report-title">${title}</div>
          <div class="report-sub">
            Periode: <strong>${periodLabel}</strong> &nbsp;|&nbsp; 
            Total Data: <strong>${data.length} transaksi</strong>
            ${subTitle ? ` &nbsp;|&nbsp; ${subTitle}` : ""}
          </div>
        </div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>${theadHtml}</tr>
          </thead>
          <tbody>
            ${data.length > 0 ? tbodyHtml : `<tr><td colspan="${columns.length}" style="text-align:center; padding: 20px; color:#64748b;">Tidak ada data transaksi yang ditemukan.</td></tr>`}
          </tbody>
        </table>

        <div class="signatures">
          <div class="signature-col">
            <div class="signature-label">Dibuat Oleh (Admin Keuangan):</div>
            <div class="signature-line">( ........................................ )</div>
          </div>
          <div class="signature-col">
            <div class="signature-label">Mengetahui (SPV Operasional):</div>
            <div class="signature-line">( ........................................ )</div>
          </div>
        </div>

        <div class="doc-footer">
          <span>Dicetak otomatis dari Sistem Administrasi Keuangan SUN89 — Valid tanpa tanda tangan basah untuk arsip internal.</span>
          <span>Halaman Dokumen Laporan</span>
        </div>
      </body>
    </html>
  `;

  // Hidden print iframe execution
  const printFrame = document.createElement("iframe");
  printFrame.style.position = "fixed";
  printFrame.style.right = "0";
  printFrame.style.bottom = "0";
  printFrame.style.width = "0";
  printFrame.style.height = "0";
  printFrame.style.border = "0";
  printFrame.setAttribute("aria-hidden", "true");

  document.body.appendChild(printFrame);

  const frameDoc = printFrame.contentWindow?.document;
  if (!frameDoc) {
    // Fallback to new tab if iframe fails
    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 250);
    }
    return;
  }

  frameDoc.open();
  frameDoc.write(htmlContent);
  frameDoc.close();

  printFrame.contentWindow?.focus();
  setTimeout(() => {
    try {
      printFrame.contentWindow?.print();
    } catch (err) {
      console.error("Print error:", err);
    } finally {
      setTimeout(() => {
        if (document.body.contains(printFrame)) {
          document.body.removeChild(printFrame);
        }
      }, 2000);
    }
  }, 400);
}
