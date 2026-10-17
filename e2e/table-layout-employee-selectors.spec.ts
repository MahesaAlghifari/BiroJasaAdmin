import { test, expect } from "@playwright/test";

const BASE_URL = "http://localhost:3000";

async function loginFinance(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill("#email", "finance@birojasa.com");
  await page.fill("#password", "finance123");
  await page.click("button[type='submit']");
  await page.waitForURL("**/dashboard", { timeout: 15000 });
}

test.describe("Phase 8.7: Global Table Layout & Employee Selectors", () => {
  test.beforeEach(async ({ page }) => {
    await loginFinance(page);
  });

  test("1. Global Table Layout: table container stretches to card bottom and anchors horizontal scrollbar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/finance/data-penjualan/mutasi-ld`);
    await page.waitForLoadState("domcontentloaded");

    const tableContainer = page.locator('[data-slot="table-container"]').first();
    await expect(tableContainer).toBeVisible();

    // Verify container has flex-1 and min-h-0 classes ensuring vertical stretch
    const className = await tableContainer.getAttribute("class");
    expect(className).toContain("flex-1");
    expect(className).toContain("min-h-0");
    expect(className).toContain("overflow-x-auto");

    // Check parent card bounds vs table container bounds
    const card = page.locator("div.border.bg-card").first();
    const cardBox = await card.boundingBox();
    const tableBox = await tableContainer.boundingBox();

    expect(cardBox).not.toBeNull();
    expect(tableBox).not.toBeNull();
    if (cardBox && tableBox) {
      expect(tableBox.height).toBeGreaterThan(150);
      expect(tableBox.y + tableBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height + 10);
    }
  });

  test("2. Kas Messenger: Dynamic messenger dropdown derived from active messengers only, sentence-case jenis", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/finance/kas-messenger`);
    await page.waitForLoadState("domcontentloaded");

    // Verify table container has rendered
    const tableContainer = page.locator('[data-slot="table-container"]');
    await expect(tableContainer).toBeVisible();

    // Open add page
    const tambahBtn = page.getByRole("button", { name: "Tambah" });
    await tambahBtn.click();

    // Ensure we are on FinanceAddPage
    await expect(page.getByText("Tambah data kas messenger")).toBeVisible();

    // Verify Messenger field is a Select trigger, NOT a raw text input
    await expect(page.getByText("Nama messenger")).toBeVisible();

    // Click messenger select trigger
    const messengerSelect = page.getByText("Pilih messenger");
    await expect(messengerSelect).toBeVisible();
    await messengerSelect.click();

    // Verify active messengers are listed
    await expect(page.getByRole("option", { name: "Rudi Hartono" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Joko Prasetyo" })).toBeVisible();

    // Verify non-messengers (e.g. Siti Nurhaliza, Andi Wijaya) are NOT present in messenger options
    await expect(page.getByRole("option", { name: "Siti Nurhaliza" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Andi Wijaya" })).toHaveCount(0);

    // Select Rudi Hartono
    await page.getByRole("option", { name: "Rudi Hartono" }).click();

    // Verify Jenis select trigger has sentence case options
    const jenisSelect = page.getByText("Pilih jenis transaksi");
    await expect(jenisSelect).toBeVisible();
    await jenisSelect.click();

    await expect(page.getByRole("option", { name: "Petty cash" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Operasional" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Biaya Samsat" })).toBeVisible();
    await page.getByRole("option", { name: "Petty cash" }).click();

    // Fill other fields and submit
    await page.fill("input[placeholder='Rincian keperluan kas']", "Bensin operasional armada");
    await page.locator("input[type='number']").first().fill("75000");

    const submitBtn = page.getByRole("button", { name: /Simpan data/i });
    await submitBtn.click();

    // Returns to table view
    await expect(page.getByText("Buku kas harian messenger")).toBeVisible({ timeout: 10000 });

    // Verify newly added row displays sentence-case jenis and selected messenger
    await expect(page.getByText("Petty cash").first()).toBeVisible();
    await expect(page.getByText("Rudi Hartono").first()).toBeVisible();
  });

  test("3. Kas Kantor: Penanggung Jawab dropdown derived from non-messengers, historical '-' preservation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/finance/kas-kantor`);
    await page.waitForLoadState("domcontentloaded");

    // Verify table has "Penanggung jawab" column header button
    const thPJ = page.getByRole("button", { name: "Penanggung jawab" });
    await expect(thPJ).toBeVisible();

    // Open add page
    const tambahBtn = page.getByRole("button", { name: "Tambah" });
    await tambahBtn.click();

    await expect(page.getByText("Tambah transaksi kas kantor")).toBeVisible();

    // Find Penanggung jawab field
    const pjSelect = page.getByText("Pilih penanggung jawab");
    await expect(pjSelect).toBeVisible();
    await pjSelect.click();

    // Verify active non-messengers are options
    await expect(page.getByRole("option", { name: "Siti Nurhaliza" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Andi Wijaya" })).toBeVisible();

    // Verify messengers are EXCLUDED from Penanggung jawab
    await expect(page.getByRole("option", { name: "Rudi Hartono" })).toHaveCount(0);
    await expect(page.getByRole("option", { name: "Joko Prasetyo" })).toHaveCount(0);

    // Select Siti Nurhaliza
    await page.getByRole("option", { name: "Siti Nurhaliza" }).click();

    // Select Tipe arus kas
    const statusSelect = page.getByText("Pilih tipe arus kas");
    await statusSelect.click();
    await page.getByRole("option", { name: "Debit" }).click();

    // Fill Keterangan
    await page.fill("input[placeholder*='Pembayaran invoice']", "Penerimaan titipan berkas kantor");

    // Submit
    const submitBtn = page.getByRole("button", { name: /Simpan data/i });
    await submitBtn.click();

    await expect(page.getByText("Buku kas besar kantor")).toBeVisible({ timeout: 10000 });

    // Verify newly added entry shows Siti Nurhaliza in the table
    await expect(page.getByText("Siti Nurhaliza").first()).toBeVisible();
  });

  test("4. Pengeluaran: Penanggung Jawab dropdown and historical '-' preservation", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/finance/pengeluaran`);
    await page.waitForLoadState("domcontentloaded");

    // Verify table has "Penanggung jawab" column header button
    const thPJ = page.getByRole("button", { name: "Penanggung jawab" });
    await expect(thPJ).toBeVisible();

    // Open add page
    const tambahBtn = page.getByRole("button", { name: "Tambah" });
    await tambahBtn.click();

    await expect(page.getByText("Tambah data pengeluaran")).toBeVisible();

    // Find Penanggung jawab field
    const pjSelect = page.getByText("Pilih penanggung jawab");
    await expect(pjSelect).toBeVisible();
    await pjSelect.click();

    // Verify non-messengers present, messengers excluded
    await expect(page.getByRole("option", { name: "Andi Wijaya" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Rudi Hartono" })).toHaveCount(0);

    // Select Andi Wijaya
    await page.getByRole("option", { name: "Andi Wijaya" }).click();

    // Fill Keterangan and nominal
    await page.fill("input[placeholder*='Listrik bulanan']", "Pembelian token listrik kantor cabang");
    await page.locator("input[type='number']").first().fill("250000");

    const submitBtn = page.getByRole("button", { name: /Simpan data/i });
    await submitBtn.click();

    await expect(page.getByText("Daftar beban operasional")).toBeVisible({ timeout: 10000 });

    // Verify Andi Wijaya appears in the table
    await expect(page.getByText("Andi Wijaya").first()).toBeVisible();
  });
});
