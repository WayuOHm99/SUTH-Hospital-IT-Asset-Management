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

test("requires approval when a patch contains destructive SQL", () => {
  const findings = classifySensitiveChanges([{
    filename: "docs/example.sql",
    patch: "+ DROP TABLE users;",
  }]);

  assert.ok(findings.some((finding) =>
    finding.category === "destructive database operation"
  ));
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
