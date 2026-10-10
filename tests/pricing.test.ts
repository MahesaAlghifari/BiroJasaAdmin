import test from "node:test";
import assert from "node:assert";
import {
  getHargaDasarItem,
  hargaDasarMutasiKeluar,
  hargaDasarMutasiMasuk,
  formatMutasiLabel,
} from "../src/app/data/pricingReference";
import { pricingStore } from "../src/app/data/pricingStore";

test("Pricing - getHargaDasarItem returns correct baseline prices", () => {
  // Test Mutasi Keluar keys
  const legalisirPrice = getHargaDasarItem("mutasiKeluarLegalisir");
  assert.ok(legalisirPrice > 0, "Legalisir price should be positive");
  assert.strictEqual(typeof legalisirPrice, "number");

  const hadirPrice = getHargaDasarItem("mutasiKeluarHadir");
  assert.ok(hadirPrice > 0, "Hadir price should be positive");

  // Test Mutasi Masuk keys
  const legalisirMutmasPrice = getHargaDasarItem("mutasiMasukLegalisir");
  assert.ok(legalisirMutmasPrice > 0, "Legalisir Mutmas price should be positive");

  // Non-existent key returns 0 without crashing
  const nonExistent = getHargaDasarItem("nonExistentKey123");
  assert.strictEqual(nonExistent, 0, "Non-existent key should return 0");
});

test("Pricing - Proxy access (hargaDasarMutasiKeluar & Masuk) returns correct numbers", () => {
  assert.ok(hargaDasarMutasiKeluar.mutasiKeluarLegalisir > 0);
  assert.ok(hargaDasarMutasiKeluar.mutasiKeluarHadir > 0);
  assert.ok(hargaDasarMutasiMasuk.mutasiMasukLegalisir > 0);
  assert.ok(hargaDasarMutasiMasuk.mutasiMasukDaftarBpkb > 0);

  // Object.keys should still list all available keys
  const keluarKeys = Object.keys(hargaDasarMutasiKeluar);
  assert.ok(keluarKeys.includes("mutasiKeluarLegalisir"));
  assert.ok(keluarKeys.includes("mutasiKeluarHadir"));

  const masukKeys = Object.keys(hargaDasarMutasiMasuk);
  assert.ok(masukKeys.includes("mutasiMasukLegalisir"));
});

test("Pricing - Master Pricing updates reflect via getHargaDasarItem and Proxy", () => {
  // Check baseline price for mutasi-legalisir at Samsat Jakarta Timur
  const initialPrice = pricingStore.getSamsatPrice("samsat-jakarta-timur", "mutasi-legalisir");
  assert.ok(initialPrice > 0);

  // Temporarily update Samsat price in Master Pricing
  pricingStore.updateSamsatPrice("samsat-jakarta-timur", "mutasi-legalisir", 99000);

  // Dynamic lookup via getHargaDasarItem and proxy
  const updatedItemPrice = getHargaDasarItem("mutasiKeluarLegalisir", "Jakarta Timur");
  assert.strictEqual(updatedItemPrice, 99000, "Price should reflect updated master pricing");

  const proxyPrice = hargaDasarMutasiKeluar.mutasiKeluarLegalisir;
  assert.strictEqual(proxyPrice, 99000, "Proxy access should reflect updated master pricing");

  // Revert back to original price
  pricingStore.updateSamsatPrice("samsat-jakarta-timur", "mutasi-legalisir", initialPrice);
  assert.strictEqual(getHargaDasarItem("mutasiKeluarLegalisir", "Jakarta Timur"), initialPrice);
});

test("Pricing - formatMutasiLabel correctly formats camelCase keys into human readable strings", () => {
  assert.strictEqual(formatMutasiLabel("mutasiKeluarLegalisir"), "Legalisir");
  assert.strictEqual(formatMutasiLabel("mutasiKeluarCekBlokir"), "Cek Blokir");
  assert.strictEqual(formatMutasiLabel("mutasiMasukDaftarBpkb"), "Daftar Bpkb");
});
