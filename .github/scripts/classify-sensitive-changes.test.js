const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifySensitiveChanges,
  evaluateApproval,
} = require("./classify-sensitive-changes");

test("requires approval for schema, auth, workflow, and production paths", () => {
  const findings = classifySensitiveChanges([
    { filename: "database/migrations/042_meter.sql" },
    { filename: "backend/src/routes/auth.js" },
    { filename: ".github/workflows/ci.yml" },
    { filename: "infra/production/main.tf" },
  ]);

  assert.deepEqual(
    new Set(findings.map((finding) => finding.category)),
    new Set([
      "database schema or migration",
      "authentication or authorization",
      "security policy or automation guard",
      "deployment or production",
    ])
  );
});

test("requires approval for auth UI and admin files without patch text", () => {
  const findings = classifySensitiveChanges([
    { filename: "frontend/src/views/Login.vue" },
    { filename: "frontend/src/layouts/AuthLayout.vue" },
    { filename: "backend/src/routes/admin.js" },
  ]);

  assert.deepEqual(
    findings.map((finding) => finding.filename),
    [
      "frontend/src/views/Login.vue",
      "frontend/src/layouts/AuthLayout.vue",
      "backend/src/routes/admin.js",
    ]
  );
  assert.ok(findings.every((finding) =>
    finding.category === "authentication or authorization"
  ));
});

test("requires approval for common authorization names and behavior", () => {
  const findings = classifySensitiveChanges([
    { filename: "backend/src/services/authenticationService.js", patch: "+ module.exports = service;" },
    { filename: "backend/src/routes/devices.js", patch: "+ router.delete('/:id', adminMiddleware);" },
    { filename: "backend/src/policies/rbac.js", patch: "+ const acl = new Map();" },
  ]);

  assert.deepEqual(
    new Set(findings.map((finding) => finding.filename)),
    new Set([
      "backend/src/services/authenticationService.js",
      "backend/src/routes/devices.js",
      "backend/src/policies/rbac.js",
    ])
  );
});

test("requires approval for security middleware and application hardening", () => {
  const findings = classifySensitiveChanges([
    {
      filename: "backend/src/middleware/rateLimiter.js",
      patch: "+ const max = 0;",
    },
    {
      filename: "backend/src/app.js",
      patch: "- app.use(helmet());\n- app.use(cors(corsOptions));\n- app.use(rateLimit(options));",
    },
    {
      filename: "backend/src/config/http.js",
      patch: " const corsOptions = {\n-  origin: allowedOrigins,\n+  origin: '*',",
    },
  ]);

  assert.deepEqual(
    new Set(findings.map((finding) => finding.filename)),
    new Set([
      "backend/src/middleware/rateLimiter.js",
      "backend/src/app.js",
      "backend/src/config/http.js",
    ])
  );
  assert.ok(findings.every((finding) =>
    finding.category === "authentication or security behavior" ||
    finding.category === "authentication or authorization"
  ));
});

test("requires approval for secret-bearing content in ordinary files", () => {
  const findings = classifySensitiveChanges([
    { filename: "backend/src/config/service.js", patch: "+ const apiKey = config.value;" },
    { filename: "backend/src/config/provider.js", patch: "+ const clientSecret = settings.value;" },
    { filename: "backend/src/config/crypto.js", patch: "+ const privateKey = process.env.VALUE;" },
  ]);

  assert.equal(findings.length, 3);
  assert.ok(findings.every((finding) =>
    finding.category === "credential or secret behavior"
  ));
});

test("requires approval when a sensitive file is renamed", () => {
  const findings = classifySensitiveChanges([{
    filename: "frontend/src/views/Welcome.vue",
    previous_filename: "frontend/src/views/Login.vue",
    patch: "+ const title = 'Welcome';",
  }]);

  assert.ok(findings.some((finding) =>
    finding.category === "authentication or authorization"
  ));
});

test("requires approval when a patch contains destructive SQL", () => {
  const findings = classifySensitiveChanges([{
    filename: "docs/example.sql",
    patch: "+ DROP TABLE users;",
  }]);

  assert.ok(findings.some((finding) =>
    finding.category === "destructive database operation"
  ));
});

test("requires approval for destructive alter and delete statements", () => {
  const findings = classifySensitiveChanges([
    {
      filename: "docs/change-a.sql",
      patch: "+ ALTER TABLE devices DROP COLUMN serial_number;",
    },
    {
      filename: "docs/change-b.sql",
      patch: "+ DELETE FROM users WHERE id = 42;",
    },
  ]);

  assert.deepEqual(
    findings.map((finding) => finding.filename),
    ["docs/change-a.sql", "docs/change-b.sql"]
  );
  assert.ok(findings.every((finding) =>
    finding.category === "destructive database operation"
  ));
});

test("requires approval for destructive filesystem and shell operations", () => {
  const findings = classifySensitiveChanges([
    {
      filename: "backend/src/controllers/uploads.js",
      patch: "+ fs.rmSync(uploadPath, { recursive: true });",
    },
    {
      filename: "backend/src/controllers/cleanup.js",
      patch: "+ childProcess.execSync('rm -rf uploads');",
    },
    {
      filename: "scripts/cleanup.ps1",
      patch: "+ Remove-Item -Recurse -Force $targetPath",
    },
  ]);

  assert.equal(findings.length, 3);
  assert.ok(findings.every((finding) =>
    finding.category === "destructive filesystem or process operation"
  ));
});

test("requires approval when a source patch cannot be inspected", () => {
  const findings = classifySensitiveChanges([
    { filename: "docs/large-change.sql" },
  ]);

  assert.deepEqual(findings, [{
    filename: "docs/large-change.sql",
    category: "source change without inspectable patch",
    source: "patch",
  }]);
});

test("allows ordinary application and documentation changes", () => {
  const findings = classifySensitiveChanges([
    { filename: "frontend/src/views/Report.vue", patch: "+ const page = 1;" },
    { filename: "docs/fixes/report-filter.md", patch: "+ Explain the month filter." },
  ]);

  assert.deepEqual(findings, []);
});

test("blocks sensitive or manually gated changes until a human approves", () => {
  const finding = [{ filename: "database/schema.sql", category: "schema" }];

  assert.equal(evaluateApproval(finding, []).passes, false);
  assert.equal(
    evaluateApproval([], ["human-approval-required"]).passes,
    false
  );
  assert.equal(
    evaluateApproval(finding, ["human-approved"]).passes,
    true
  );
});
