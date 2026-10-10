// Utility for simplified cost calculation

export interface SimplifiedCost {
  biayaJasa: number;
  pkb: number;
  swdkllj: number;
  dendaSwdkllj: number;
  total: number;
}

export interface DetailedCost extends SimplifiedCost {
  mutasiKeluar?: number;
  mutasiMasuk?: number;
  biayaLainnya?: number;
  keteranganMutasiKeluar?: string;
  keteranganMutasiMasuk?: string;
  keteranganBiayaLainnya?: string;
}

export const calculateSimplifiedCost = (
  pkb: number,
  swdkllj: number,
  biayaJasa: number = 95000,
  dendaSwdkllj: number = 100000
): SimplifiedCost => {
  const total = biayaJasa + pkb + swdkllj + dendaSwdkllj;
  
  return {
    biayaJasa,
    pkb,
    swdkllj,
    dendaSwdkllj,
    total
  };
};

export const calculateDetailedCost = (
  pkb: number,
  swdkllj: number,
  biayaJasa: number = 95000,
  dendaSwdkllj: number = 100000,
  mutasiKeluar: number = 0,
  mutasiMasuk: number = 0,
  biayaLainnya: number = 0,
  keteranganMutasiKeluar?: string,
  keteranganMutasiMasuk?: string,
  keteranganBiayaLainnya?: string
): DetailedCost => {
  const baseTotal = biayaJasa + pkb + swdkllj + dendaSwdkllj;
  const additionalCosts = mutasiKeluar + mutasiMasuk + biayaLainnya;
  const total = baseTotal + additionalCosts;
  
  return {
    biayaJasa,
    pkb,
    swdkllj,
    dendaSwdkllj,
    mutasiKeluar,
    mutasiMasuk,
    biayaLainnya,
    keteranganMutasiKeluar,
    keteranganMutasiMasuk,
    keteranganBiayaLainnya,
    total
  };
};
