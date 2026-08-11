Review this pull request only; do not modify files, commit, push, merge, or
change GitHub state directly.

Read the root AGENTS.md and any more specific AGENTS.md files. Compare the pull
request diff with its originating GitHub Issue and review both axes:

1. Standards: correctness, regressions, security, validation, tests, and
   repository rules.
2. Specification: acceptance criteria, scope, compatibility, and documented
   risks.

Pay particular attention to changes involving schema/migrations,
authentication, authorization, security, credentials, destructive operations,
deployment, production, and GitHub workflow permissions. Those changes require
the `human-approved` label and explicit human authorization recorded on the
Issue or pull request.

Your first line must be exactly one of:

VERDICT: PASS
VERDICT: CHANGES_REQUESTED

Use PASS only when there are no blocking findings. After the verdict, list
findings from highest to lowest severity with file and line references. If
there are no findings, state what you verified and any residual test gap.
