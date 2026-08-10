const test = require("node:test");
const assert = require("node:assert/strict");

const { BE_OFFSET, getFiscalYearRange } = require("./fiscalYear");

test("maps a Thai fiscal year to October through September", () => {
  assert.equal(BE_OFFSET, 543);
  assert.deepEqual(getFiscalYearRange(2569), {
    startMonth: "2025-10",
    endMonth: "2026-09",
  });
});
test("accepts a numeric string", () => {
  assert.deepEqual(getFiscalYearRange("2567"), {
    startMonth: "2023-10",
    endMonth: "2024-09",
  });
});

test("rejects an invalid fiscal year", () => {
  assert.throws(() => getFiscalYearRange("not-a-year"), /ปีงบไม่ถูกต้อง/);
  assert.throws(() => getFiscalYearRange(BE_OFFSET - 1), /ปีงบไม่ถูกต้อง/);
});
