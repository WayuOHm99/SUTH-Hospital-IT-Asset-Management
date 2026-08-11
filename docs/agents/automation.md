# Claude to scheduled Codex review

GitHub is the synchronization boundary. Claude implements one Issue and opens
a pull request; GitHub runs deterministic gates; a local Codex scheduled task
reviews eligible pull requests. A human remains the only merge authority.

## State machine

1. An Issue becomes available with `ready-for-agent`.
2. Claude claims one Issue, creates a dedicated branch, implements only that
   scope, runs the required checks, commits, pushes, and opens a non-draft PR
   containing `Closes #<issue>` and the `agent-claude` label.
3. GitHub runs CI and the sensitive-change gate. A lightweight workflow removes
   stale Codex result labels whenever the pull request head changes.
4. The Codex scheduled task reviews at most one eligible PR per run and
   maintains one PR comment and one of these labels:
   - `codex-pass`
   - `codex-changes-requested`
5. Claude addresses `codex-changes-requested` on the same branch and pushes.
   The update clears the old result; the next scheduled run reviews the new
   head SHA.
6. When CI is green and `codex-pass` is present, Claude applies
   `ready-for-human` and stops. Only a human may merge.

## Human approval boundary

Before editing, Claude must inspect the Issue for schema/migrations,
authentication, authorization, security, secrets, destructive operations,
deployment, or production work. If any may be involved, Claude must not edit.
It applies `ready-for-human`, explains the decision needed on the Issue, and
waits for a human to add `human-approved`.

The GitHub gate independently scans changed paths and patches. It applies
`human-approval-required`, converts an unapproved sensitive pull request to
draft, and fails when `human-approved` is absent. Agents may never add, remove,
or work around `human-approved`; only the gate may remove a stale marker. Any
new commit removes the label, and the gate also records the exact head SHA when
a human adds it. Approval passes only when both the label and its recorded SHA
match the current head, so event-order races cannot carry an old decision onto
a new revision. A human must add `human-approved` and then mark the PR ready
again.

## Claude terminal instruction

Paste this once into the Claude terminal after it has read `CLAUDE.md`:

```text
Act as the implementation worker for this repository. Follow AGENTS.md,
CLAUDE.md, and docs/agents/automation.md. Work one ready-for-agent Issue at a
time on a dedicated branch. Before editing, stop for human approval on any
schema/migration, auth, security, secret, destructive, deployment, or
production scope. For approved ordinary work: implement, test, inspect the
diff, commit, push, and open a non-draft PR with Closes #<issue>. Never merge.
Monitor that PR for CI and the codex-changes-requested/codex-pass labels;
address requested changes on the same branch. When CI is green and codex-pass
is present, apply ready-for-human and stop.
```

This instruction is the explicit authorization for that Claude session to
commit, push, and open PRs within the stated boundary. It does not authorize
merging or sensitive work.

## One-time setup

- Create the labels listed below if they do not exist:
  - `agent-claude`
  - `codex-pass`
  - `codex-changes-requested`
  - `human-approval-required`
  - `human-approved`
- When the repository plan supports branch protection or rulesets, protect
  `main` and require these checks after the workflows have run once:
  - `Backend tests`
  - `Frontend tests and build`
  - `Automation policy tests`
  - `Sensitive change approval`
- When supported, require at least one human approval. Always keep automatic
  merge disabled.

This private GitHub Free repository cannot currently enable branch protection
or rulesets. As a free-tier fail-closed fallback, the gate converts an
unapproved sensitive pull request to draft; GitHub does not allow draft pull
requests to merge ([GitHub Docs](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/changing-the-stage-of-a-pull-request)).
The workflow also handles `ready_for_review`, so an unapproved sensitive PR is
returned to draft. This does not replace branch protection: there is workflow
latency, and maintainers must still verify the latest `human-approved`, CI, and
Codex result before merging.

Create a dedicated fine-grained GitHub token for the Scheduled reviewer with
access only to this repository and these repository permissions:

- Actions: read
- Contents: read
- Issues: write
- Pull requests: write

Give it no Administration or Contents write permission, never commit it, and
provide it to the Scheduled task only as `GH_TOKEN`. The Scheduled reviewer
must stop rather than fall back to a broader stored `gh` credential.

In the ChatGPT desktop app, create a Scheduled task for this repository. Use
the contents of `.github/codex/prompts/scheduled-review.md` as its prompt, run
it in an isolated worktree every 30 minutes while the team is working, and
test the first run before relying on it. The computer must remain on and the
desktop app must remain running for local scheduled work.

See the official OpenAI Scheduled tasks documentation:
https://learn.chatgpt.com/docs/automations/

This path does not use `openai/codex-action` or an OpenAI API key. The scheduled
review label is advisory: it is not a GitHub required check and never replaces
human approval.

## Recovery

- If the scheduled task is unavailable or fails operationally, run the same
  prompt manually in Codex; do not treat the absence of a review as a pass.
- If Claude and Codex repeat the same blocker three times, apply
  `ready-for-human` and stop the loop.
- If two agents claim the same Issue, keep the earliest linked PR and close the
  duplicate without merging it.
