const test = require("node:test");
const assert = require("node:assert/strict");

const db = require("../config/database");
const validateRequest = require("../middleware/validateRequest");
const { deviceSchema } = require("../modules/validation/schemas");
const deviceController = require("./deviceController");

function createResponse() {
  return {
    statusCode: 200,
    body: undefined,
    headersSent: false,
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

test("does not write when device input fails schema validation", async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    return [{ insertId: 1 }];
  };

  try {
    const request = { body: { serial_number: "" } };
    const response = createResponse();
    await validateRequest({ body: deviceSchema })(
      request,
      response,
      () => deviceController.create(request, response)
    );

    assert.equal(response.statusCode, 400);
    assert.equal(calls.length, 0);
  } finally {
    db.query = originalQuery;
  }
});

test("does not INSERT when floor and building are mismatched", async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    return [[]];
  };

  try {
    const response = createResponse();
    await deviceController.create(
      {
        validated: {
          body: {
            serial_number: "SUTH-PR-001",
            building_id: 10,
            floor_id: 99,
          },
        },
      },
      response
    );

    assert.equal(response.statusCode, 400);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /SELECT id FROM `?floor`?/);
    assert.equal(calls.some((call) => /INSERT|UPDATE/.test(call.sql)), false);
  } finally {
    db.query = originalQuery;
  }
});

test("does not UPDATE when department and division are mismatched", async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    return [[]];
  };

  try {
    const response = createResponse();
    await deviceController.update(
      {
        params: { id: 1 },
        validated: {
          body: {
            serial_number: "SUTH-PR-001",
            division_id: 20,
            department_id: 4,
          },
        },
      },
      response
    );

    assert.equal(response.statusCode, 400);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /SELECT id FROM `?department`?/);
    assert.equal(calls.some((call) => /INSERT|UPDATE/.test(call.sql)), false);
  } finally {
    db.query = originalQuery;
  }
});
