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

test("approval invalidation is isolated from other pull request events", () => {
  const workflow = read(".github/workflows/human-approval-gate.yml");

  assert.match(
    workflow,
    /group: sensitive-approval-\$\{\{ github\.event\.pull_request\.number \}\}-\$\{\{ github\.event\.action \}\}/
  );
  assert.match(workflow, /human-approved-head:/);
  assert.match(workflow, /context\.payload\.pull_request\.head\.sha/);
  assert.match(workflow, /github\.rest\.pulls\.get/);
  assert.match(workflow, /comment\.user\?\.login === 'github-actions\[bot\]'/);
  assert.match(workflow, /approvedHead === currentHead/);
});

test("unapproved sensitive pull requests are kept as drafts", () => {
  const workflow = read(".github/workflows/human-approval-gate.yml");

  assert.match(workflow, /ready_for_review/);
  assert.match(workflow, /convertPullRequestToDraft/);
  assert.match(workflow, /Human approval is required before marking this PR ready/);
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

test("scheduled reviewer verifies the current revision before publishing", () => {
  const prompt = read(".github/codex/prompts/scheduled-review.md");

  assert.match(prompt, /Immediately before publishing, re-fetch/i);
  assert.match(prompt, /head SHA differs\s+from\s+the reviewed head SHA/i);
  assert.match(prompt, /do not\s+publish a comment or result label/i);
  assert.match(prompt, /re-check every eligibility condition/i);
});

test("scheduled reviewer requires a dedicated least-privilege GitHub token", () => {
  const prompt = read(".github/codex/prompts/scheduled-review.md");
  const guide = read("docs/agents/automation.md");

  assert.match(prompt, /dedicated fine-grained `GH_TOKEN`/);
  assert.match(prompt, /Do not fall back to the user's stored `gh` credential/);
  assert.match(guide, /Actions: read/);
  assert.match(guide, /Contents: read/);
  assert.match(guide, /Issues: write/);
  assert.match(guide, /Pull requests: write/);
  assert.match(guide, /no Administration or Contents write permission/);
});

test("setup guide documents the free-tier draft fallback", () => {
  const guide = read("docs/agents/automation.md");

  assert.match(guide, /private GitHub Free repository/i);
  assert.match(
    guide,
    /converts an\s+unapproved sensitive pull request to draft/i
  );
  assert.match(guide, /does not replace branch\s+protection/i);
});
