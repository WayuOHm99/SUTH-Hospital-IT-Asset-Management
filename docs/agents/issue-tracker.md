# Issue tracker: GitHub

Issues and specs for this repository live in GitHub Issues at
`WayuOHm99/SUTH-Hospital-IT-Asset-Management`. Use the `gh` CLI for all
operations and pass `-R WayuOHm99/SUTH-Hospital-IT-Asset-Management` for
write operations so GitHub never infers the read-only `upstream` repository.

## Conventions

- Create an issue: `gh issue create -R WayuOHm99/SUTH-Hospital-IT-Asset-Management --title "..." --body "..."`.
- Read an issue: `gh issue view <number> -R WayuOHm99/SUTH-Hospital-IT-Asset-Management --comments`.
- List issues: `gh issue list -R WayuOHm99/SUTH-Hospital-IT-Asset-Management --state open`.
- Comment on an issue: `gh issue comment <number> -R WayuOHm99/SUTH-Hospital-IT-Asset-Management --body "..."`.
- Apply or remove labels: use `gh issue edit <number> -R WayuOHm99/SUTH-Hospital-IT-Asset-Management --add-label "..."` or `--remove-label "..."`.
- Close an issue: `gh issue close <number> -R WayuOHm99/SUTH-Hospital-IT-Asset-Management --comment "..."`.

Never create, edit, label, comment on, or close issues in the `upstream`
repository at `saritrungj/suth-helpdesk-assets`.

## Pull requests as a triage surface

**PRs as a request surface: no.** External pull requests are not added to the
triage queue unless this flag is changed explicitly.

## Skill conventions

- When a skill says to publish to the issue tracker, create a GitHub Issue in the repository above.
- When a skill says to fetch a ticket, use `gh issue view <number> --comments` against the repository above.
- Prefer GitHub sub-issues and native blocking dependencies when splitting work.
- If native dependencies are unavailable, add `Blocked by: #<number>` at the top of the blocked issue body.
