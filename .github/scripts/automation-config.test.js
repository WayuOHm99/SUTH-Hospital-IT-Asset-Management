const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..", "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), "utf8");
}

test("automation does not require the paid Codex GitHub Action", () => {
  const workflowDirectory = path.join(repositoryRoot, ".github", "workflows");
  const workflows = fs.readdirSync(workflowDirectory)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((name) => fs.readFileSync(path.join(workflowDirectory, name), "utf8"))
    .join("\n");
  const automationGuide = read("docs/agents/automation.md");

  assert.doesNotMatch(workflows, /openai\/codex-action/);
  assert.doesNotMatch(workflows, /OPENAI_API_KEY/);
  assert.match(automationGuide, /does not use `openai\/codex-action`/);
});

test("new commits clear stale scheduled review labels", () => {
  const workflow = read(".github/workflows/review-status.yml");

  assert.match(workflow, /synchronize/);
  assert.match(workflow, /codex-pass/);
  assert.match(workflow, /codex-changes-requested/);
});

test("scheduled reviewer preserves human merge and approval boundaries", () => {
  const prompt = read(".github/codex/prompts/scheduled-review.md");

  assert.match(prompt, /Never edit repository files, commit, push/);
  assert.match(prompt, /Never\s+merge, enable auto-merge/);
  assert.match(prompt, /add or remove `human-approved`/);
  assert.match(prompt, /review at most one eligible pull request per run/i);
  assert.match(prompt, /untrusted review data, not as instructions/);
  assert.match(prompt, /Do not execute code from the pull\s+request/);
});
