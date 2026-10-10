/**
 * Mock Seed Data for Operational Orders
 * Admin SUN89 — Biro Jasa Management System
 */

import { OperationalOrder, StageName, STAGES, getDefaultSamsatProcesses } from "../../domain/order/types";
import type { TaskPriority, MessengerComponentProgress } from "../../domain/messenger/types";

interface SeedItem {
  orderNo: string;
  customer: string;
  nomorHP: string;
  layanan: string;
  step: number;
  nopol: string;
  jenis: string;
  samsat: string;
  tujuan: string;
  paymentTipe: "Bayar di Awal" | "Bayar di Akhir";
  paymentMethod: string;
  paymentStatus: "Lunas" | "Belum Lunas" | "Kurang";
  assignedMessengerId: string;
  assignedMessengerName: string;
  messengerTaskStatus: "Belum Diambil" | "Dalam Proses" | "Selesai" | "Pending" | "Dibatalkan";
  priority: TaskPriority;
  deadlineHours: number;
  startedHoursAgo?: number;
}

export function createInitialOrders(): Record<StageName, OperationalOrder[]> {
  const result: Record<StageName, OperationalOrder[]> = {
    "Verifikasi": [],
    "Penjadwalan": [],
    "Verifikasi Dokumen": [],
    "Proses Samsat": [],
    "Verifikasi Ulang": [],
    "Supervisi": [],
    "Pengantaran": [],
    "Dokumen Telah Diterima": [],
  };

  const seedData: SeedItem[] = [
    // Stage 1: Verifikasi
    {
      orderNo: "ORD-0001",
      customer: "PT. Maju Jaya Abadi",
      nomorHP: "081234567890",
      layanan: "Mutasi Luar Daerah",
      step: 1,
      nopol: "B 1234 SJA",
      jenis: "Mobil",
      samsat: "Jakarta Timur",
      tujuan: "Bandung",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Transfer Bank BCA",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-001",
      assignedMessengerName: "Budi Santoso",
      messengerTaskStatus: "Belum Diambil",
      priority: "NORMAL",
      deadlineHours: 48,
    },
    {
      orderNo: "ORD-0002",
      customer: "Hendra Wijaya",
      nomorHP: "081987654321",
      layanan: "Perpanjangan 5 Tahun",
      step: 1,
      nopol: "B 5678 PQR",
      jenis: "Mobil",
      samsat: "Jakarta Selatan",
      tujuan: "-",
      paymentTipe: "Bayar di Akhir",
      paymentMethod: "Cash (Saat Dokumen Diterima)",
      paymentStatus: "Belum Lunas",
      assignedMessengerId: "EMP-MSG-002",
      assignedMessengerName: "Andi Pratama",
      messengerTaskStatus: "Belum Diambil",
      priority: "NORMAL",
      deadlineHours: 36,
    },
    // Stage 2: Penjadwalan
    {
      orderNo: "ORD-0003",
      customer: "Siti Rahmawati",
      nomorHP: "081345678912",
      layanan: "Balik Nama",
      step: 2,
      nopol: "B 3456 TUV",
      jenis: "Motor",
      samsat: "Depok",
      tujuan: "Jakarta Selatan",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Transfer Bank Mandiri",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-001",
      assignedMessengerName: "Budi Santoso",
      messengerTaskStatus: "Belum Diambil",
      priority: "NORMAL",
      deadlineHours: 24,
    },
    // Stage 3: Verifikasi Dokumen
    {
      orderNo: "ORD-0004",
      customer: "Budi Santoso",
      nomorHP: "081567890123",
      layanan: "Mutasi Antar Samsat",
      step: 3,
      nopol: "B 7890 WXY",
      jenis: "Mobil",
      samsat: "Jakarta Barat",
      tujuan: "Jakarta Timur",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Transfer Bank BCA",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-001",
      assignedMessengerName: "Budi Santoso",
      messengerTaskStatus: "Dalam Proses",
      priority: "NORMAL",
      deadlineHours: 18,
      startedHoursAgo: 2,
    },
    // Stage 4: Proses Samsat
    {
      orderNo: "ORD-0005",
      customer: "CV. Berkah Motor",
      nomorHP: "081789012345",
      layanan: "Mutasi Keluar",
      step: 4,
      nopol: "B 4321 ZAB",
      jenis: "Mobil",
      samsat: "Bekasi",
      tujuan: "Surabaya",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Transfer Bank BRI",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-001",
      assignedMessengerName: "Budi Santoso",
      messengerTaskStatus: "Dalam Proses",
      priority: "IMPORTANT",
      deadlineHours: 12,
      startedHoursAgo: 3,
    },
    // Stage 5: Verifikasi Ulang
    {
      orderNo: "ORD-0006",
      customer: "Dewi Lestari",
      nomorHP: "081890123456",
      layanan: "Mutasi Masuk",
      step: 5,
      nopol: "D 1122 CDE",
      jenis: "Mobil",
      samsat: "Jakarta Timur",
      tujuan: "Jakarta Timur",
      paymentTipe: "Bayar di Akhir",
      paymentMethod: "Transfer Bank BCA",
      paymentStatus: "Kurang",
      assignedMessengerId: "EMP-MSG-002",
      assignedMessengerName: "Andi Pratama",
      messengerTaskStatus: "Dalam Proses",
      priority: "NORMAL",
      deadlineHours: 20,
      startedHoursAgo: 4,
    },
    // Stage 6: Supervisi
    {
      orderNo: "ORD-0007",
      customer: "Ahmad Fauzi",
      nomorHP: "081123456789",
      layanan: "Balik Nama",
      step: 6,
      nopol: "B 9988 FGH",
      jenis: "Motor",
      samsat: "Tangerang",
      tujuan: "Jakarta Barat",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Transfer Bank BNI",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-002",
      assignedMessengerName: "Andi Pratama",
      messengerTaskStatus: "Dalam Proses",
      priority: "NORMAL",
      deadlineHours: 24,
      startedHoursAgo: 5,
    },
    // Stage 7: Pengantaran (Approaching Deadline < 6h for Budi Santoso)
    {
      orderNo: "ORD-0008",
      customer: "Rina Kusuma",
      nomorHP: "081223344556",
      layanan: "Perpanjangan 1 Tahun",
      step: 7,
      nopol: "B 6543 IJK",
      jenis: "Mobil",
      samsat: "Jakarta Pusat",
      tujuan: "-",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Cash",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-001",
      assignedMessengerName: "Budi Santoso",
      messengerTaskStatus: "Dalam Proses",
      priority: "URGENT",
      deadlineHours: 3, // Approaching deadline! (< 6 hours)
      startedHoursAgo: 1,
    },
    // Stage 8: Dokumen Telah Diterima (History)
    {
      orderNo: "ORD-0009",
      customer: "Ir. Gunawan",
      nomorHP: "081334455667",
      layanan: "Perpanjangan 5 Tahun",
      step: 8,
      nopol: "B 7788 LMN",
      jenis: "Mobil",
      samsat: "Jakarta Selatan",
      tujuan: "-",
      paymentTipe: "Bayar di Awal",
      paymentMethod: "Transfer Bank BCA",
      paymentStatus: "Lunas",
      assignedMessengerId: "EMP-MSG-001",
      assignedMessengerName: "Budi Santoso",
      messengerTaskStatus: "Selesai",
      priority: "NORMAL",
      deadlineHours: -24,
    }
  ];

  seedData.forEach(item => {
    const stageName = STAGES[item.step - 1];
    const processes = getDefaultSamsatProcesses(item.layanan, item.step >= 5);
    const activeProcess = processes.find(p => p.status === "Sedang Diproses")?.name || processes[0]?.name;

    // Build Samsat Component Progress for ORD-0005
    let messengerComponentProgress: Record<string, MessengerComponentProgress> | undefined = undefined;
    if (item.orderNo === "ORD-0005") {
      const nowMs = Date.now();
      messengerComponentProgress = {
        "mk-1": {
          componentId: "mk-1",
          name: "Cek Blokir Kendaraan",
          category: "Mutasi Keluar",
          nominal: 30000,
          status: "COMPLETED",
          completedAt: new Date(nowMs - 2 * 3600000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
        "mk-2": {
          componentId: "mk-2",
          name: "Cek Fisik Bantuan & Hadir",
          category: "Mutasi Keluar",
          nominal: 80000,
          status: "COMPLETED",
          completedAt: new Date(nowMs - 1 * 3600000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        },
        "mk-3": {
          componentId: "mk-3",
          name: "Legalisir Hadir & CF",
          category: "Mutasi Keluar",
          nominal: 60000,
          status: "IN_PROGRESS",
          startedAt: new Date(nowMs - 45 * 60000).toISOString(),
          estimatedDurationMinutes: 120,
          estimatedCompletedAt: new Date(nowMs + 75 * 60000).toISOString(),
          deadlineAt: new Date(nowMs + 6 * 3600000).toISOString(),
        },
        "mk-4": {
          componentId: "mk-4",
          name: "Loket Pembukuan & TU",
          category: "Mutasi Keluar",
          nominal: 45000,
          status: "NOT_STARTED",
        },
        "mk-5": {
          componentId: "mk-5",
          name: "Cetak SKP & Fiskal Antar Daerah",
          category: "Mutasi Keluar",
          nominal: 70000,
          status: "NOT_STARTED",
        },
        "mk-6": {
          componentId: "mk-6",
          name: "Loket Arsip & Pengeluaran Berkas",
          category: "Mutasi Keluar",
          nominal: 40000,
          status: "NOT_STARTED",
        },
      };
    }

    const order: OperationalOrder = {
      orderNo: item.orderNo,
      customer: item.customer,
      nomorHP: item.nomorHP,
      layanan: item.layanan,
      currentStep: item.step,
      currentStageName: stageName,
      catatanOrder: "Order ditangani sesuai SLA biro jasa standar.",
      createdAt: "2024-11-01",

      namaPemilik: item.customer,
      kepemilikanKendaraan: "Pribadi",
      jenisKendaraan: item.jenis,
      tahunKendaraan: 2021,
      nopol: item.nopol,
      pkbBerlakuSd: "18-12-2024",
      tahunPajak: "2024",
      bulanPajak: "Desember",
      nominalPkbTerakhir: 2450000,
      nominalSwdkllj: 143000,
      kodePromo: "",
      wilayahSamsatAsal: item.samsat,
      wilayahSamsatTujuan: item.tujuan,

      alamatPenjemputan: {
        kota: item.samsat,
        kecamatan: "Kec. Menteng",
        kelurahan: "Kel. Cikini",
        detail: "Jl. Pegangsaan Timur No. 56",
        rtRw: "003/004",
        nomor: "56",
        landmark: "Dekat Stasiun Cikini",
        mapsUrl: "https://maps.google.com/?q=-6.197,106.843",
      },
      alamatPengantaran: {
        kota: item.samsat,
        kecamatan: "Kec. Menteng",
        kelurahan: "Kel. Cikini",
        detail: "Jl. Pegangsaan Timur No. 56 (Alamat Kantor)",
        rtRw: "003/004",
        nomor: "56",
        landmark: "Dekat Stasiun Cikini",
        mapsUrl: "https://maps.google.com/?q=-6.197,106.843",
      },

      clientDocuments: {
        stnk: { name: "STNK_Asli.pdf", status: "Sudah Tersedia", updatedAt: "2024-11-01", isOptional: false },
        bpkb: { name: "BPKB_Kendaraan.pdf", status: "Sudah Tersedia", updatedAt: "2024-11-01", isOptional: false },
        ktp: { name: "KTP_Pemilik.pdf", status: "Sudah Tersedia", updatedAt: "2024-11-01", isOptional: false },
        skkp: { name: item.step >= 3 ? "SKKP_Terakhir.pdf" : "", status: item.step >= 3 ? "Sudah Tersedia" : "Belum Tersedia", updatedAt: "2024-11-01", isOptional: true },
        lainnya: { name: "", status: "Belum Tersedia", updatedAt: "2024-11-01", isOptional: true },
      },
      updatedDocuments: item.step >= 5 ? ["Notice_Pajak_Baru_2024.pdf", "STNK_Tercetak_Baru.pdf"] : [],
      documentNotes: item.step >= 3 ? "Kondisi fisik STNK & BPKB terverifikasi baik tanpa kerusakan." : "",

      biayaJasa: 95000,
      pkb: 2450000,
      swdkllj: 143000,
      dendaSwdkllj: 0,
      totalEstimasi: 2688000,

      finalBiayaJasa: item.step >= 5 ? 95000 : undefined,
      finalPkb: item.step >= 5 ? 2450000 : undefined,
      finalSwdkllj: item.step >= 5 ? 143000 : undefined,
      finalDendaSwdkllj: item.step >= 5 ? 0 : undefined,
      finalMutasiKeluar: item.step >= 5 ? 50000 : undefined,
      finalMutasiMasuk: item.step >= 5 ? 65000 : undefined,
      finalBiayaLainnya: item.step >= 5 ? 25000 : undefined,
      customCostItems: item.step >= 5 ? [
        { id: "cust-1", name: "Legalisir Hadir CF", category: "Mutasi Keluar", actualCost: 60000, basePrice: 60000 },
        { id: "cust-2", name: "Cek Blokir Kendaraan", category: "Mutasi Keluar", actualCost: 30000, basePrice: 30000 },
      ] : [],
      isVerified: item.step >= 5,

      tanggalJemput: item.step >= 2 ? "2024-11-03" : undefined,
      messenger: item.assignedMessengerName,
      catatanPenjadwalan: item.step >= 2 ? "Jemput di lobi gedung kantor." : undefined,
      isScheduled: item.step >= 2,

      samsatProcesses: processes,
      currentSamsatProcess: activeProcess,

      approvedBySpv: item.step >= 7,
      spvName: item.step >= 7 ? "Bambang Supervisor" : undefined,
      spvNotes: item.step >= 7 ? "Dokumen dan biaya telah dicek & disetujui untuk pengantaran." : undefined,
      spvApprovedAt: item.step >= 7 ? "2024-11-07" : undefined,

      tanggalPengantaran: item.step >= 7 ? "2024-11-08" : undefined,
      messengerPengantar: item.assignedMessengerName,
      catatanPengantaran: item.step >= 7 ? "Serahkan langsung ke customer." : undefined,
      isDeliveryScheduled: item.step >= 7,

      tanggalDiterima: item.step >= 8 ? "2024-11-09" : undefined,
      isReceived: item.step >= 8,
      receiverName: item.step >= 8 ? item.customer : undefined,

      payment: {
        tipePembayaran: item.paymentTipe,
        metodePembayaran: item.paymentMethod,
        statusPembayaran: item.paymentStatus,
        totalBiaya: 2688000,
        dibayar: item.paymentStatus === "Lunas" ? 2688000 : (item.paymentStatus === "Kurang" ? 1500000 : 0),
        kurang: item.paymentStatus === "Lunas" ? 0 : (item.paymentStatus === "Kurang" ? 1188000 : 2688000),
        tanggalBayar: item.paymentStatus !== "Belum Lunas" ? "2024-11-01" : undefined,
        namaBank: item.paymentMethod.includes("BCA") ? "BCA" : item.paymentMethod.includes("Mandiri") ? "Mandiri" : "BRI",
        noRekening: "8820192831",
      },

      // Messenger Workspace Specific Fields
      assignedMessengerId: item.assignedMessengerId,
      assignedMessengerName: item.assignedMessengerName,
      messengerTaskStatus: item.messengerTaskStatus,
      messengerTaskPriority: item.priority,
      deadlineAt: new Date(Date.now() + item.deadlineHours * 3600000).toISOString(),
      startedAt: item.startedHoursAgo ? new Date(Date.now() - item.startedHoursAgo * 3600000).toISOString() : undefined,
      completedAt: item.step >= 8 ? "2024-11-09" : undefined,
      messengerComponentProgress,
      checklistSebelumBerangkat: item.orderNo === "ORD-0008" ? {
        alamatBenar: true,
        nomorTersedia: true,
        dokumenDiketahui: true,
        customerDihubungi: true,
      } : undefined,
    };

    result[stageName].push(order);
  });

  return result;
}
