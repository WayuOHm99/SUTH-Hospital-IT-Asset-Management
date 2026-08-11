# Claude to Codex automation

GitHub is the synchronization boundary. Claude implements one Issue and opens
a pull request; CI and Codex review that pull request; a human remains the only
merge authority.

## State machine

1. An Issue becomes available with `ready-for-agent`.
2. Claude claims one Issue, creates a dedicated branch, implements only that
   scope, runs the required checks, commits, pushes, and opens a non-draft PR
   containing `Closes #<issue>` and the `agent-claude` label.
3. GitHub runs CI, the sensitive-change gate, and Codex review.
4. Codex maintains one PR comment and one of these labels:
   - `codex-pass`
   - `codex-changes-requested`
5. Claude addresses `codex-changes-requested` on the same branch and pushes.
   The update automatically triggers a fresh review.
6. When CI is green and `codex-pass` is present, Claude applies
   `ready-for-human` and stops. Only a human may merge.

## Human approval boundary

Before editing, Claude must inspect the Issue for schema/migrations,
authentication, authorization, security, secrets, destructive operations,
deployment, or production work. If any may be involved, Claude must not edit.
It applies `ready-for-human`, explains the decision needed on the Issue, and
waits for a human to add `human-approved`.

The GitHub gate independently scans changed paths and patches. It applies
`human-approval-required` and fails when `human-approved` is absent. Agents may
never add, remove, or work around `human-approved`. Any new commit removes the
previous `human-approved` marker, so the human decision always applies to the
latest revision.

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

## One-time GitHub setup

- Repository secret `OPENAI_API_KEY` must exist.
- Create the labels listed below if they do not exist:
  - `agent-claude`
  - `codex-pass`
  - `codex-changes-requested`
  - `human-approval-required`
  - `human-approved`
- Protect `main` and require these checks after the workflows have run once:
  - `Backend tests`
  - `Frontend tests and build`
  - `Automation policy tests`
  - `Sensitive change approval`
- Require at least one human approval and keep automatic merge disabled.

## Recovery

- If Codex review fails operationally, inspect the `Codex PR review` workflow;
  do not treat the absence of a review as a pass.
- If Claude and Codex repeat the same blocker three times, apply
  `ready-for-human` and stop the loop.
- If two agents claim the same Issue, keep the earliest linked PR and close the
  duplicate without merging it.
