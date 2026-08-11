# Domain Docs

Before exploring or changing the system, read the domain documentation relevant
to the work:

- `CONTEXT.md` at the repository root.
- `CONTEXT-MAP.md` at the repository root if it exists.
- Relevant ADRs under `docs/adr/`.

If these files do not exist, proceed silently. Do not create empty placeholders.
The `domain-modeling` workflow creates them lazily when terminology or a durable
decision is resolved.

## Layout

This repository uses a single-context layout:

```text
/
|-- CONTEXT.md
|-- docs/
|   `-- adr/
|-- backend/
|-- frontend/
`-- database/
```

## Vocabulary

Use terms exactly as defined in `CONTEXT.md`. If a required concept is missing
or a term is ambiguous, return it to `domain-modeling` instead of inventing an
unrecorded synonym.

## ADR conflicts

If proposed work contradicts an existing ADR, identify the conflict explicitly.
Do not replace the earlier decision silently.
