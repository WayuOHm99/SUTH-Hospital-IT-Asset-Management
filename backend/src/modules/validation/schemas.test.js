const test = require("node:test");
const assert = require("node:assert/strict");

const {
  bulkPrintTransactionsSchema,
  bulkDeviceSchema,
  contractSchema,
  dashboardQuerySchema,
  dashboardSingleMonthQuerySchema,
  deviceSchema,
  fiscalYearSchema,
  importFileSchema,
  loginSchema,
  normalizeMonth,
  paginationSchema,
  roleSchema,
  printTransactionSchema,
  MAX_BULK_ITEMS,
  MAX_BULK_DEVICE_ITEMS,
} = require("./schemas");

test("accepts Thai fiscal-year values and preserves the normalized string", () => {
  const result = fiscalYearSchema.safeParse({ year: "2569" });

  assert.equal(result.success, true);
  assert.deepEqual(result.data, { year: "2569" });
});

test("rejects a fiscal-year value that cannot describe a Thai fiscal year", () => {
  const result = fiscalYearSchema.safeParse({ year: "543" });
  assert.equal(result.success, false);
});

test("accepts only four-digit Thai fiscal-year values", () => {
  assert.equal(fiscalYearSchema.safeParse({ year: "999" }).success, false);
  assert.equal(fiscalYearSchema.safeParse({ year: "1543" }).success, false);
  assert.equal(fiscalYearSchema.safeParse({ year: "1544" }).success, true);
  assert.equal(fiscalYearSchema.safeParse({ year: "9999" }).success, true);
  assert.equal(fiscalYearSchema.safeParse({ year: "10000" }).success, false);
});

test("preserves password characters while rejecting an all-whitespace password", () => {
  const valid = loginSchema.safeParse({ username: " admin ", password: " pass word " });
  assert.equal(valid.success, true);
  assert.equal(valid.data.username, "admin");
  assert.equal(valid.data.password, " pass word ");

  assert.equal(loginSchema.safeParse({ username: "admin", password: "   " }).success, false);
});

test("keeps existing login compatibility for long non-blank passwords", () => {
  const result = loginSchema.safeParse({
    username: "admin",
    password: ` ${"p".repeat(250)} `,
  });

  assert.equal(result.success, true);
});

test("rejects usernames longer than the database column", () => {
  assert.equal(
    loginSchema.safeParse({ username: "u".repeat(50), password: "secret" }).success,
    true
  );
  assert.equal(
    loginSchema.safeParse({ username: "u".repeat(51), password: "secret" }).success,
    false
  );
});

test("normalizes one-digit months and rejects month 13", () => {
  assert.equal(normalizeMonth("2026-7"), "2026-07");
  assert.equal(normalizeMonth("2026-13"), null);
  assert.equal(normalizeMonth("2026-00"), null);
});

test("keeps multi-month dashboard filters away from single-month endpoints", () => {
  const multipleMonths = { month: "2025-10,2025-11" };

  assert.equal(dashboardQuerySchema.safeParse(multipleMonths).success, true);
  assert.equal(dashboardSingleMonthQuerySchema.safeParse(multipleMonths).success, false);
  assert.deepEqual(
    dashboardSingleMonthQuerySchema.parse({ month: "2026-7" }),
    { month: "2026-07" }
  );
});

test("caps bulk print requests before database work", () => {
  const tooManyItems = Array.from({ length: MAX_BULK_ITEMS + 1 }, (_, index) => ({
    device_id: index + 1,
    pages: 0,
  }));
  const result = bulkPrintTransactionsSchema.safeParse({
    month: "2026-09",
    items: tooManyItems,
  });

  assert.equal(result.success, false);
  assert.ok(result.error.issues.some((issue) => issue.path.join(".") === "items"));
});

test("enforces empty, exact-limit, and over-limit boundaries for both bulk schemas", () => {
  const monthlyItems = Array.from({ length: MAX_BULK_ITEMS }, (_, index) => ({
    device_id: index + 1,
    pages: 0,
  }));
  const deviceMonths = Array.from({ length: MAX_BULK_DEVICE_ITEMS }, (_, index) => ({
    month: `2026-${String(index + 1).padStart(2, "0")}`,
    pages: 0,
  }));

  assert.equal(
    bulkPrintTransactionsSchema.safeParse({ month: "2026-09", items: [] }).success,
    false
  );
  assert.equal(
    bulkPrintTransactionsSchema.safeParse({ month: "2026-09", items: monthlyItems }).success,
    true
  );
  assert.equal(
    bulkDeviceSchema.safeParse({ device_id: 1, items: [] }).success,
    false
  );
  assert.equal(
    bulkDeviceSchema.safeParse({ device_id: 1, items: deviceMonths }).success,
    true
  );
  assert.equal(
    bulkDeviceSchema.safeParse({
      device_id: 1,
      items: [...deviceMonths, { month: "2027-01", pages: 0 }],
    }).success,
    false
  );
});

test("provides reusable role and pagination schemas", () => {
  assert.equal(roleSchema.safeParse("admin").success, true);
  assert.equal(roleSchema.safeParse("operator").success, false);
  assert.deepEqual(paginationSchema.parse({}), { page: 1, limit: 50 });
  assert.equal(paginationSchema.safeParse({ page: 0 }).success, false);
  assert.equal(paginationSchema.safeParse({ limit: 101 }).success, false);
});

test("validates import file metadata with the shared Zod schema", () => {
  const validFile = importFileSchema.safeParse({
    originalname: "assets.xlsx",
    mimetype: "application/octet-stream",
    path: "uploads/assets.xlsx",
    size: 1024,
  });
  assert.equal(validFile.success, true);

  const invalidFile = importFileSchema.safeParse({
    originalname: "payload.exe",
    mimetype: "application/octet-stream",
    path: "uploads/payload.exe",
    size: 1024,
  });
  assert.equal(invalidFile.success, false);
});

test("requires explicit pages for the single print endpoint but accepts a recorded zero", () => {
  const base = { device_id: 1, month: "2026-09" };
  assert.equal(printTransactionSchema.safeParse(base).success, false);
  assert.equal(printTransactionSchema.safeParse({ ...base, pages: "" }).success, false);
  assert.equal(printTransactionSchema.safeParse({ ...base, pages: null }).success, false);
  assert.equal(printTransactionSchema.safeParse({ ...base, pages: 0 }).success, true);
});

test("keeps blank bulk-device months as unrecorded values that the handler can skip", () => {
  const result = bulkDeviceSchema.safeParse({
    device_id: 1,
    items: [
      { month: "2026-08", pages: null },
      { month: "2026-09", pages: "" },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.data.items[0].pages, null);
  assert.equal(result.data.items[1].pages, undefined);
});

test("rejects device text that exceeds the database column limits", () => {
  const valid = deviceSchema.safeParse({
    serial_number: "S".repeat(100),
    model: "M".repeat(100),
  });
  const serialTooLong = deviceSchema.safeParse({
    serial_number: "S".repeat(101),
  });
  const modelTooLong = deviceSchema.safeParse({
    serial_number: "SUTH-PR-001",
    model: "M".repeat(101),
  });

  assert.equal(valid.success, true);
  assert.equal(serialTooLong.success, false);
  assert.equal(modelTooLong.success, false);
});

test("accepts only money values representable by DECIMAL(10,2)", () => {
  const validContract = contractSchema.safeParse({
    contract_no: "SUTH-2026-001",
    price_per_page: 99999999.99,
  });
  const excessiveContractPrice = contractSchema.safeParse({
    contract_no: "SUTH-2026-001",
    price_per_page: 100000000,
  });
  const excessivePrecision = deviceSchema.safeParse({
    serial_number: "SUTH-PR-001",
    price_override: 0.001,
  });

  assert.equal(validContract.success, true);
  assert.equal(excessiveContractPrice.success, false);
  assert.equal(excessivePrecision.success, false);
});

test("rejects identifiers and page counts outside the MySQL INT range", () => {
  const maximum = printTransactionSchema.safeParse({
    device_id: 2147483647,
    month: "2026-09",
    pages: 2147483647,
  });
  const excessiveId = printTransactionSchema.safeParse({
    device_id: 2147483648,
    month: "2026-09",
    pages: 0,
  });
  const excessivePages = printTransactionSchema.safeParse({
    device_id: 1,
    month: "2026-09",
    pages: 2147483648,
  });

  assert.equal(maximum.success, true);
  assert.equal(excessiveId.success, false);
  assert.equal(excessivePages.success, false);
});
