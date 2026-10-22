/**
 * Document SVG Generator for Digital Previews and Downloads
 * Biro Jasa SUN89
 */

export function generateDocumentSvgUrl(
  title: string,
  orderNo: string,
  nopol: string,
  customer: string,
  extraNotes?: string
): string {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
    <!-- Background -->
    <rect width="800" height="1100" fill="#ffffff" />
    <rect x="25" y="25" width="750" height="1050" fill="none" stroke="#0f172a" stroke-width="2" />
    <rect x="35" y="35" width="730" height="1030" fill="none" stroke="#94a3b8" stroke-width="1" />
    
    <!-- Watermark Background Text -->
    <text x="400" y="600" text-anchor="middle" font-family="Arial, sans-serif" font-size="64" font-weight="bold" fill="#f1f5f9" transform="rotate(-35, 400, 600)" letter-spacing="4">BIRO JASA SUN89</text>

    <!-- Header Box -->
    <rect x="50" y="55" width="700" height="110" fill="#f8fafc" stroke="#cbd5e1" rx="8" />
    <text x="75" y="95" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a">BIRO JASA SUN89</text>
    <text x="75" y="118" font-family="Arial, sans-serif" font-size="12" font-weight="semibold" fill="#475569">Sistem Digitalisasi Dokumen Operasional &amp; Arsip Samsat</text>
    <text x="75" y="138" font-family="Arial, sans-serif" font-size="11" fill="#64748b">Jl. Raya Sukahati No. 6, Kel. Sukahati, Kec. Cibinong - Bogor • Telp: 0812-3456-7890</text>
    
    <!-- Title & Badge -->
    <rect x="520" y="70" width="210" height="30" fill="#0f172a" rx="4" />
    <text x="625" y="90" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#ffffff" letter-spacing="1">${title.toUpperCase()}</text>
    <text x="730" y="125" text-anchor="end" font-family="monospace" font-size="12" font-weight="bold" fill="#0284c7">REG: ARC-${orderNo}</text>
    <text x="730" y="145" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#64748b">Tgl: ${dateStr}</text>

    <!-- Metadata Section -->
    <rect x="50" y="185" width="700" height="220" fill="#ffffff" stroke="#e2e8f0" rx="8" />
    <text x="75" y="215" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#334155">INFORMASI RESMI DOKUMEN BERKAS:</text>
    
    <!-- Rows -->
    <line x1="75" y1="225" x2="725" y2="225" stroke="#f1f5f9" stroke-width="1.5" />
    
    <text x="75" y="250" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Nomor Polisi (Nopol)</text>
    <text x="260" y="250" font-family="monospace" font-size="15" font-weight="bold" fill="#0f172a">: ${nopol.toUpperCase()}</text>
    
    <text x="75" y="280" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Nama Customer / Pemilik</text>
    <text x="260" y="280" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#0f172a">: ${customer.toUpperCase()}</text>
    
    <text x="75" y="310" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Jenis Dokumen</text>
    <text x="260" y="310" font-family="Arial, sans-serif" font-size="13" font-weight="semibold" fill="#0369a1">: ${title}</text>
    
    <text x="75" y="340" font-family="Arial, sans-serif" font-size="12" fill="#64748b">No. Referensi Order</text>
    <text x="260" y="340" font-family="monospace" font-size="13" fill="#0f172a">: ${orderNo}</text>
    
    <text x="75" y="370" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Status Pengerjaan</text>
    <text x="260" y="370" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#16a34a">: SELESAI &amp; TERVERIFIKASI RESMI SAMSAT</text>

    <!-- Document Content Simulation Area -->
    <rect x="50" y="425" width="700" height="350" fill="#f8fafc" stroke="#cbd5e1" rx="8" stroke-dasharray="4,4" />
    <text x="400" y="480" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="bold" fill="#1e293b">BERKAS FISIK RESMI DILAMPIRKAN PADA ARSIP OPERASIONAL</text>
    <text x="400" y="510" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">Dokumen asli telah melalui verifikasi fisik loket, registrasi berkas di Samsat, dan pengesahan resmi.</text>
    
    <rect x="150" y="550" width="500" height="150" fill="#ffffff" stroke="#e2e8f0" rx="6" />
    <text x="180" y="585" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#334155">Rincian Kelengkapan Berkas:</text>
    <text x="180" y="615" font-family="Arial, sans-serif" font-size="11" fill="#475569">• Nomor Identifikasi Kendaraan terverifikasi dengan data Samsat</text>
    <text x="180" y="640" font-family="Arial, sans-serif" font-size="11" fill="#475569">• Tanda pengesahan resmi dan cap dinas telah diselesaikan</text>
    <text x="180" y="665" font-family="Arial, sans-serif" font-size="11" fill="#475569">• Berkas fisik diserahkan kepada klien secara sah pada alur serah terima</text>
    
    <!-- Seal & Signature Area -->
    <g transform="translate(540, 840)">
      <circle cx="80" cy="80" r="70" fill="none" stroke="#16a34a" stroke-width="3" stroke-dasharray="8,4"/>
      <circle cx="80" cy="80" r="62" fill="#f0fdf4" stroke="#16a34a" stroke-width="1"/>
      <text x="80" y="65" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#15803d">BIRO JASA SUN89</text>
      <text x="80" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#166534">VERIFIED</text>
      <text x="80" y="105" text-anchor="middle" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="#15803d">ARSIP RESMI</text>
    </g>

    <text x="75" y="880" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#334155">Biro Jasa SUN89</text>
    <text x="75" y="900" font-family="Arial, sans-serif" font-size="10" fill="#64748b">Bagian Administrasi &amp; Arsip Digital</text>
    <line x1="75" y1="960" x2="250" y2="960" stroke="#0f172a" stroke-width="1.5" />
    <text x="75" y="978" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="#0f172a">( PETUGAS PENGURUSAN SAMSAT )</text>

    <!-- Footer Note -->
    <rect x="50" y="1005" width="700" height="45" fill="#f1f5f9" rx="4" />
    <text x="400" y="1032" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#475569">Dokumen digital ini diterbitkan secara otomatis dan terintegrasi dengan database operasional Biro Jasa SUN89.</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function downloadDataUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
