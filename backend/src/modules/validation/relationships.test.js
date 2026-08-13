const test = require("node:test");
const assert = require("node:assert/strict");

const { findDeviceRelationshipErrors } = require("./relationships");

test("rejects a floor that belongs to another building before a device write", async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return [[]];
    },
  };

  const details = await findDeviceRelationshipErrors(db, {
    building_id: 10,
    floor_id: 99,
  });

  assert.deepEqual(details.map((detail) => detail.field), ["floor_id"]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [99, 10]);
});
test("rejects a department without its division and accepts matching relationships", async () => {
  const db = {
    async query() {
      return [[{ id: 1 }]];
    },
  };

  const missingDivision = await findDeviceRelationshipErrors(db, { department_id: 4 });
  assert.deepEqual(missingDivision.map((detail) => detail.field), ["division_id"]);

  const valid = await findDeviceRelationshipErrors(db, {
    building_id: 10,
    floor_id: 99,
    division_id: 20,
    department_id: 4,
  });
  assert.deepEqual(valid, []);
});
