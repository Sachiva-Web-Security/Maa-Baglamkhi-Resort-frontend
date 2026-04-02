import { expect, test } from "playwright/test";

async function loginAsAccountant(page) {
  await page.goto("/login");
  await page.locator('input[type="email"]').fill("accounts@test.com");
  await page.locator('input[type="password"]').fill("Staff@123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/(accounts-dashboard|accounts)$/, { timeout: 30_000 });
  await page.goto("/accounts");
  await page.waitForURL(/\/accounts$/, { timeout: 30_000 });
  await expect(page.getByText("Accounts workspace in dashboard style")).toBeVisible();
}

test.describe("Accounts page smoke flow", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("loads API-backed summary widgets and finance tabs", async ({ page }) => {
    await expect(page.getByText("Total Income").first()).toBeVisible();
    await expect(page.getByText("Total Expense").first()).toBeVisible();
    await expect(page.getByText("Net Profit").first()).toBeVisible();
    await expect(page.getByText("GST Payable").first()).toBeVisible();
    await expect(page.getByText("Combined billed amount for the current filter.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Bank Entry" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Petty Cash" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save GST Record" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Vendor Payment" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create PO" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Payroll" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Profit Entry" })).toBeVisible();
  });

  test("opens pending reconciliation entries from the summary card", async ({ page }) => {
    await page.getByRole("button", { name: /Pending Reconciliation/i }).click();

    await expect(
      page.getByRole("heading", { name: "Billing to bank reconciliation view" }),
    ).toBeVisible();
    await expect(
      page.getByText("Showing bank entries that still need reconciliation."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Show All" })).toBeVisible();
  });

  test("creates a bank entry from the UI and shows it in recent records", async ({ page }) => {
    const suffix = Date.now();
    const bankName = `PW Bank ${suffix}`;

    await page.locator('input[name="entryDate"]').fill("2026-03-31");
    await page.locator('input[name="bankName"]').fill(bankName);
    await page.locator('input[name="referenceNo"]').fill(`PW-BNK-${suffix}`);
    await page.locator('input[name="description"]').fill("Accounts smoke bank entry");
    await page.locator('input[name="debit"]').fill("0");
    await page.locator('input[name="credit"]').fill("4321");
    await page.locator('select[name="reconciliationStatus"]').selectOption("Paid");
    await page.locator('textarea[name="notes"]').fill("Created by Playwright accounts smoke test");
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole("cell", { name: bankName })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Paid" }).first()).toBeVisible();
  });

  test("switches to profit entry tab and creates a backend-connected record", async ({ page }) => {
    const suffix = Date.now();

    await page.getByRole("button", { name: "Add Profit Entry" }).click();
    await expect(page.getByText("Profit Center Split")).toBeVisible();

    await page.locator('select[name="centerName"]').selectOption("Spa");
    await page.locator('input[name="entryDate"]').fill("2026-03-31");
    await page.locator('input[name="incomeAmount"]').fill("3210");
    await page.locator('input[name="expenseAmount"]').fill("210");
    await page.locator('textarea[name="notes"]').fill(`Playwright profit entry ${suffix}`);
    await page.locator('form button[type="submit"]').click();

    await expect(page.getByRole("cell", { name: "Spa" }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "₹3,210" }).first()).toBeVisible();
  });
});
