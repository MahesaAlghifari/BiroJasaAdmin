/**
 * Canonical Domain Types for Vehicles and Samsat Registrations
 * Admin SUN89 — Biro Jasa Management System
 */

export type VehicleType = "R2" | "R4" | "Motor" | "Mobil" | "Truk" | "Bus" | string;

export interface Vehicle {
  nopol: string;
  namaPemilik: string;
  kepemilikanKendaraan: string;
  jenisKendaraan: VehicleType;
  tahunKendaraan: number | string;
  pkbBerlakuSd?: string;
  tahunPajak?: string;
  bulanPajak?: string;
  nominalPkbTerakhir?: number;
  nominalSwdkllj?: number;
  wilayahSamsatAsal?: string;
  wilayahSamsatTujuan?: string;
}

export interface SamsatRegion {
  id: string;
  nama: string;
  kodeWilayah: string;
  provinsi: string;
  biayaDasarSamsat?: number;
}
