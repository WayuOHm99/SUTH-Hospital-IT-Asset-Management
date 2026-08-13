const test = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");

process.env.JWT_SECRET = "issue-19-test-secret";

const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");

const app = require("./app");
const db = require("./config/database");

async function withServer(run) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.closeIdleConnections?.();
    server.closeAllConnections?.();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function createAdminToken() {
  return jwt.sign(
    { id: 1, username: "issue-19-admin", role: "admin" },
    process.env.JWT_SECRET
  );
}

function createWorkbook(rows) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Meter");
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

test("meter import skips a page count outside the database integer range", async () => {
  const originalQuery = db.query;
  const writeCalls = [];

  db.query = async (sql, params) => {
    if (/SELECT id, serial_number FROM devices/.test(sql)) {
      return [[{ id: 1, serial_number: "SUTH-PR-001" }]];
    }
    if (/INSERT INTO print_transactions/.test(sql)) {
      writeCalls.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected database call: ${sql}`);
  };

  try {
    await withServer(async (baseUrl) => {
      const workbook = createWorkbook([
        ["SN.", "meter 9/69"],
        ["SUTH-PR-001", 2147483648],
      ]);
      const form = new FormData();
      form.append(
        "file",
        new Blob([workbook], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "meter.xlsx"
      );

      const response = await fetch(`${baseUrl}/api/print-transactions/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${createAdminToken()}` },
        body: form,
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.rows_upserted, 0);
      assert.equal(writeCalls.length, 0);
      assert.match(body.skipped[0].reason, /จำนวนเต็มที่ไม่ติดลบ/);
    });
  } finally {
    db.query = originalQuery;
  }
});

test("master-data writes reject names longer than their database columns", async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    throw new Error("database must not be called for invalid master data");
  };

  try {
    await withServer(async (baseUrl) => {
      const requests = [
        {
          path: "/api/brands",
          body: { name: "B".repeat(101) },
        },
        {
          path: "/api/floors",
          body: { name: "F".repeat(51), building_id: 1 },
        },
      ];

      for (const request of requests) {
        const response = await fetch(`${baseUrl}${request.path}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${createAdminToken()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request.body),
        });
        const body = await response.json();

        assert.equal(response.status, 400, request.path);
        assert.equal(body.error, "Validation failed", request.path);
      }

      assert.equal(calls.length, 0);
    });
  } finally {
    db.query = originalQuery;
  }
});

test("asset import skips a model that exceeds the device column limit", async () => {
  const originalQuery = db.query;
  const writeCalls = [];

  db.query = async (sql, params) => {
    if (/SELECT id, name FROM brand/.test(sql)) {
      return [[{ id: 1, name: "HP" }]];
    }
    if (/SELECT id, name FROM building/.test(sql)) {
      return [[{ id: 2, name: "อาคาร A" }]];
    }
    if (/SELECT serial_number FROM devices/.test(sql)) {
      return [[]];
    }
    if (/INSERT INTO devices/.test(sql)) {
      writeCalls.push({ sql, params });
      return [{ affectedRows: 1 }];
    }
    throw new Error(`Unexpected database call: ${sql}`);
  };

  try {
    await withServer(async (baseUrl) => {
      const workbook = createWorkbook([
        ["serial_number", "brand", "model", "building"],
        ["SUTH-PR-001", "HP", "M".repeat(101), "อาคาร A"],
      ]);
      const form = new FormData();
      form.append(
        "file",
        new Blob([workbook], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "devices.xlsx"
      );

      const response = await fetch(`${baseUrl}/api/devices/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${createAdminToken()}` },
        body: form,
      });
      const body = await response.json();

      assert.equal(response.status, 200);
      assert.equal(body.inserted, 0);
      assert.equal(writeCalls.length, 0);
      assert.match(body.skipped[0].reason, /รุ่น.*100/);
    });
  } finally {
    db.query = originalQuery;
  }
});

test("JSON parser failures use the shared validation response", async () => {
  await withServer(async (baseUrl) => {
    const requests = [
      { body: '{"username":', expectedCode: "invalid_json" },
      {
        body: JSON.stringify({
          username: "admin",
          password: "x".repeat(110 * 1024),
        }),
        expectedCode: "request_too_large",
      },
    ];

    for (const request of requests) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: request.body,
      });
      const body = await response.json();

      assert.equal(response.status, 400, request.expectedCode);
      assert.equal(body.error, "Validation failed", request.expectedCode);
      assert.equal(body.details[0].code, request.expectedCode);
    }
  });
});

test("import without a file reports one actionable file error", async () => {
  await withServer(async (baseUrl) => {
    const form = new FormData();
    const response = await fetch(`${baseUrl}/api/devices/import`, {
      method: "POST",
      headers: { Authorization: `Bearer ${createAdminToken()}` },
      body: form,
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error, "Validation failed");
    assert.deepEqual(body.details, [{
      field: "file",
      message: "กรุณาอัปโหลดไฟล์ Excel หรือ CSV",
      code: "required",
    }]);
  });
});

test("an unreadable workbook is rejected before database access", async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    throw new Error("database must not be called for an unreadable workbook");
  };

  try {
    await withServer(async (baseUrl) => {
      const form = new FormData();
      form.append(
        "file",
        new Blob([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0])], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        "broken.xlsx"
      );

      const response = await fetch(`${baseUrl}/api/devices/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${createAdminToken()}` },
        body: form,
      });
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error, "Validation failed");
      assert.equal(body.details[0].field, "file");
      assert.equal(body.details[0].code, "invalid_workbook");
      assert.equal(calls.length, 0);
    });
  } finally {
    db.query = originalQuery;
  }
});

test("an oversized bulk request is rejected before opening a database connection", async () => {
  const originalGetConnection = db.getConnection;
  let connectionRequested = false;
  db.getConnection = async () => {
    connectionRequested = true;
    throw new Error("database connection must not be requested");
  };

  try {
    await withServer(async (baseUrl) => {
      const items = Array.from({ length: 1001 }, (_, index) => ({
        device_id: index + 1,
        pages: 0,
      }));
      const response = await fetch(`${baseUrl}/api/print-transactions/bulk`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${createAdminToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ month: "2026-09", items }),
      });
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error, "Validation failed");
      assert.ok(body.details.some((detail) => detail.field === "items"));
      assert.equal(connectionRequested, false);
    });
  } finally {
    db.getConnection = originalGetConnection;
  }
});

test("a negative page count is rejected before database access", async () => {
  const originalQuery = db.query;
  const calls = [];
  db.query = async (sql, params) => {
    calls.push({ sql, params });
    throw new Error("database must not be called for a negative page count");
  };

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/print-transactions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${createAdminToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_id: 1,
          month: "2026-09",
          pages: -1,
        }),
      });
      const body = await response.json();

      assert.equal(response.status, 400);
      assert.equal(body.error, "Validation failed");
      assert.ok(body.details.some((detail) => detail.field === "pages"));
      assert.equal(calls.length, 0);
    });
  } finally {
    db.query = originalQuery;
  }
});

test("database failures return a generic 500 without internal details", async () => {
  const originalQuery = db.query;
  db.query = async () => {
    throw new Error("sensitive SQL detail");
  };

  try {
    await withServer(async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/contracts`, {
        headers: { Authorization: `Bearer ${createAdminToken()}` },
      });
      const body = await response.json();

      assert.equal(response.status, 500);
      assert.deepEqual(body, {
        error: "Internal Server Error",
        message: "เกิดข้อผิดพลาดภายในระบบ",
      });
      assert.doesNotMatch(JSON.stringify(body), /sensitive SQL detail/);
    });
  } finally {
    db.query = originalQuery;
  }
});
