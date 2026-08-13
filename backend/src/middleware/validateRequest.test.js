const test = require("node:test");
const assert = require("node:assert/strict");

const validateRequest = require("./validateRequest");
const {
  deviceSchema,
  importFileSchema,
  printTransactionSchema,
  monthQuerySchema,
} = require("../modules/validation/schemas");

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

test("normalizes validated body before the route handler runs", () => {
  const request = {
    body: {
      serial_number: "  SUTH-PR-001  ",
      building_id: "12",
      price_override: "1.25",
    },
  };
  const response = createResponse();
  let called = false;

  validateRequest({ body: deviceSchema })(request, response, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.deepEqual(request.body, {
    serial_number: "SUTH-PR-001",
    building_id: 12,
    price_override: 1.25,
  });
  assert.equal(response.statusCode, 200);
});

test("returns one actionable error shape and does not call the handler", () => {
  const request = {
    body: {
      device_id: "not-an-id",
      month: "2026-13",
      pages: "",
    },
  };
  const response = createResponse();
  let called = false;

  validateRequest({ body: printTransactionSchema })(request, response, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.error, "Validation failed");
  assert.equal(response.body.message, "Request validation failed");
  assert.ok(Array.isArray(response.body.details));
  assert.ok(response.body.details.some((detail) => detail.field === "device_id"));
  assert.ok(response.body.details.some((detail) => detail.field === "month"));
});

test("does not coerce null or blank numeric values into zero", () => {
  const request = {
    body: {
      device_id: null,
      month: "2026-09",
      pages: "",
    },
  };
  const response = createResponse();
  let called = false;

  validateRequest({ body: printTransactionSchema })(request, response, () => {
    called = true;
  });

  assert.equal(called, false);
  assert.equal(response.statusCode, 400);
  assert.ok(response.body.details.some((detail) => detail.field === "device_id"));
  assert.ok(response.body.details.some((detail) => detail.field === "pages"));
});

test("does not coerce arrays, objects, or booleans into numeric identifiers", () => {
  const values = [[], {}, true];

  for (const value of values) {
    const request = {
      body: {
        device_id: value,
        month: "2026-09",
        pages: 0,
      },
    };
    const response = createResponse();

    validateRequest({ body: printTransactionSchema })(request, response, () => {});

    assert.equal(response.statusCode, 400);
    assert.ok(response.body.details.some((detail) => detail.field === "device_id"));
  }
});

test("normalizes a comma-separated month query without accepting invalid months", () => {
  const request = { query: { month: "2025-10, 2026-09" } };
  const response = createResponse();
  let called = false;

  validateRequest({ query: monthQuerySchema })(request, response, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(request.query.month, "2025-10,2026-09");
  assert.equal(response.statusCode, 200);
});

test("rejects empty entries in a month list", () => {
  const request = { query: { month: "2026-09," } };
  const response = createResponse();

  validateRequest({ query: monthQuerySchema })(request, response, () => {});

  assert.equal(response.statusCode, 400);
  assert.ok(response.body.details.some((detail) => detail.field === "month"));
});

test("validates uploaded file metadata through the shared import schema", () => {
  const request = {
    file: {
      originalname: "devices.csv",
      mimetype: "text/csv",
      path: "uploads/devices.csv",
      size: 128,
    },
  };
  const response = createResponse();
  let called = false;

  validateRequest({ file: importFileSchema })(request, response, () => {
    called = true;
  });

  assert.equal(called, true);
  assert.equal(response.statusCode, 200);
  assert.equal(request.file.path, "uploads/devices.csv");
});
