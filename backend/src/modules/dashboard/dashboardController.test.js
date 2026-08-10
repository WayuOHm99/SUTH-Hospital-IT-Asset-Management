const test = require("node:test");
const assert = require("node:assert/strict");

const createDashboardController = require("./dashboardController");

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("exposes every dashboard handler through one interface", () => {
  const dashboard = createDashboardController({});
  const handlerNames = [
    "monthlyKpi",
    "summaryByBuilding",
    "compare",
    "stats",
    "expense",
    "byDepartment",
    "highlights",
  ];

  assert.deepEqual(Object.keys(dashboard), handlerNames);
  handlerNames.forEach((name) => assert.equal(typeof dashboard[name], "function"));
});
test("monthly KPI returns rows from the injected database adapter", async () => {
  const expectedRows = [{ month: "2026-01", total_pages: 1200 }];
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [expectedRows];
    },
  };
  const response = createResponse();
  const dashboard = createDashboardController(db);

  await dashboard.monthlyKpi({ query: {} }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, expectedRows);
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /v_monthly_kpi/);
  assert.deepEqual(calls[0].params, []);
});
