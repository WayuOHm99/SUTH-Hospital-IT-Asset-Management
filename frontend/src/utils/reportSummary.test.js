import test from "node:test";
import assert from "node:assert/strict";

import { summarizeMonthlyReport } from "./reportSummary.js";

test("summarizes report rows and preserves months without transactions", () => {
  const result = summarizeMonthlyReport(
    [
      {
        device_id: 1,
        month: "2025-10",
        pages_printed: "100",
        net_pages: "80",
        total_cost: "40.50",
      },
      {
        device_id: 2,
        month: "2025-10",
        pages_printed: 50,
        net_pages: 40,
        total_cost: 20,
      },
      {
        device_id: 1,
        month: "2025-11",
        pages_printed: 25,
        net_pages: 20,
        total_cost: 10,
      },
    ],
    ["2025-10", "2025-11", "2025-12"]
  );

  assert.deepEqual(result.monthly, [
    {
      month: "2025-10",
      pagesPrinted: 150,
      netPages: 120,
      totalCost: 60.5,
      activeDevices: 2,
    },
    {
      month: "2025-11",
      pagesPrinted: 25,
      netPages: 20,
      totalCost: 10,
      activeDevices: 1,
    },
    {
      month: "2025-12",
      pagesPrinted: 0,
      netPages: 0,
      totalCost: 0,
      activeDevices: 0,
    },
  ]);
  assert.deepEqual(result.totals, {
    pagesPrinted: 175,
    netPages: 140,
    totalCost: 70.5,
    activeDevices: 2,
  });
});
