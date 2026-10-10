import test from "node:test";
import assert from "node:assert";
import { permissionStore } from "../src/app/data/permissionStore";

test("Permission - Administrator and SVP have full authority over all 8 stages", () => {
  for (let stage = 1; stage <= 8; stage++) {
    assert.strictEqual(
      permissionStore.canManageStage("administrator", stage),
      true,
      `Administrator should be allowed to manage stage ${stage}`
    );
    assert.strictEqual(
      permissionStore.canManageStage("svp", stage),
      true,
      `SVP should be allowed to manage stage ${stage}`
    );
  }
});

test("Permission - Admin role stage authorization matrix conforms to business rules", () => {
  // Admin can manage verification, scheduling, doc verification, re-verification, delivery, received
  assert.strictEqual(permissionStore.canManageStage("admin", 1), true, "Admin can manage Stage 1 (Verifikasi)");
  assert.strictEqual(permissionStore.canManageStage("admin", 2), true, "Admin can manage Stage 2 (Penjadwalan)");
  assert.strictEqual(permissionStore.canManageStage("admin", 3), true, "Admin can manage Stage 3 (Verifikasi Dokumen)");
  assert.strictEqual(permissionStore.canManageStage("admin", 5), true, "Admin can manage Stage 5 (Verifikasi Ulang)");
  assert.strictEqual(permissionStore.canManageStage("admin", 7), true, "Admin can manage Stage 7 (Pengantaran)");
  assert.strictEqual(permissionStore.canManageStage("admin", 8), true, "Admin can manage Stage 8 (Dokumen Telah Diterima)");

  // Admin cannot manage Stage 4 (Proses Samsat, done by Messenger) and Stage 6 (Supervisi, done by SVP)
  assert.strictEqual(permissionStore.canManageStage("admin", 4), false, "Admin cannot manage Stage 4 (Proses Samsat)");
  assert.strictEqual(permissionStore.canManageStage("admin", 6), false, "Admin cannot manage Stage 6 (Supervisi)");
});

test("Permission - Finance role can verify payment at Stage 1, but cannot manage operational stages 2-8", () => {
  // Finance can verify payment at Stage 1
  assert.strictEqual(
    permissionStore.canManageStage("finance", 1),
    true,
    "Finance can manage Stage 1 (Verifikasi Pembayaran)"
  );

  // Operational stages 2 through 8 are restricted for Finance
  for (let stage = 2; stage <= 8; stage++) {
    assert.strictEqual(
      permissionStore.canManageStage("finance", stage),
      false,
      `Finance should not manage operational workflow stage ${stage}`
    );
  }
});

test("Permission - Messenger role is restricted from Order Tracking stages, but authorized for Messenger Task", () => {
  // In Order Tracking, Messenger cannot mutate stages directly
  for (let stage = 1; stage <= 8; stage++) {
    assert.strictEqual(
      permissionStore.canManageStage("messenger", stage),
      false,
      `Messenger cannot manage Order Tracking stage ${stage} directly`
    );
  }

  // But Messenger has full manage permission for messenger-task module
  assert.strictEqual(
    permissionStore.canManageModule("messenger", "messenger-task"),
    true,
    "Messenger can manage messenger-task module"
  );
  assert.strictEqual(
    permissionStore.canManageModule("messenger", "order-tracking"),
    false,
    "Messenger cannot manage order-tracking module"
  );
});

test("Permission - Invalid stage numbers are rejected", () => {
  assert.strictEqual(permissionStore.canManageStage("admin", 0), false);
  assert.strictEqual(permissionStore.canManageStage("admin", 9), false);
  assert.strictEqual(permissionStore.canManageStage("admin", 99), false);
});
