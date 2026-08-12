# Implement delivery workflow

Read and follow this workflow when the user invokes `/implement #<issue>`.
That invocation authorizes delivery of the named Issue end to end within its
recorded scope.

## Delivery loop

1. Confirm that the Issue is agent-ready, the current branch is its only
   dedicated branch, and it has or will have exactly one pull request. The
   Issue must explicitly name any schema/migration, authentication,
   authorization, security, deployment, or production scope.
2. Implement only the acceptance criteria. Use TDD where practical, run the
   relevant tests and builds, inspect the diff, and complete code review.
3. Commit and push the work, then open or update the Issue's pull request.
   Monitor review results and every required CI check. Diagnose, fix, and repeat
   the applicable step whenever a test, build, review, or CI check fails.
4. Merge only after the acceptance criteria are met, blocking review findings
   are resolved, and all repository-required checks and approval gates pass.
5. For a deployable change, follow the exact production procedure referenced by
   the Issue. Confirm its access, credential, backup, and rollback prerequisites;
   deploy; then run its production smoke tests. Diagnose, fix, and repeat when
   deployment or smoke testing fails. Human acceptance follows only after these
   production checks pass.

Delivery is complete only when every applicable criterion in steps 1-5 passes.
A production step is not applicable to a non-deployable documentation or
planning Issue.

## Migrations

`/implement` authorizes a required backward-compatible migration when the Issue
names it. Verify both a fresh installation and the ordered migration path,
including Thai fiscal-year boundaries where relevant. Document backup and
rollback considerations in the pull request before merge.

## Fresh approval gates

Get fresh human approval before performing any of these actions:

- an irreversible or destructive migration;
- a production data rewrite or deletion;
- any secret operation, including creation, provisioning, access, disclosure,
  replacement, rotation, or deletion;
- bypassing repository protections;
- a production operation for which the Issue references no exact procedure;
- an authentication, authorization, or security change outside the Issue; or
- any other expansion beyond the Issue scope.

## Blockers

Stop the loop only when progress requires a human decision, missing authority,
unavailable access or credentials, an external-state change the agent cannot
perform, a missing production procedure or rollback prerequisite, or work
outside the Issue scope. Record the evidence, completed checks, and exact human
action needed on the Issue or pull request. A failing check by itself is work
to diagnose, not a blocker.
