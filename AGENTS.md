# Repository Guidelines

Hospital IT asset-management app: Express/MySQL API, Vue/Vite client, SQL scripts, and handoff/import docs.

## Project Structure

- `backend/src/` — CommonJS Express API: app/server entry points, HTTP adapters in `routes/`, request logic in `controllers/` or focused `modules/`, auth checks in `middleware/`, database configuration in `config/`, and shared calculations in `utils/`.
- `frontend/` — Vue 3 SPA: screens in `src/views/`, reusable UI grouped by responsibility in `src/components/`, state in `src/stores/`, HTTP access in `src/services/api.js`, navigation in `src/router/`, and static files in `public/`.
- `database/` — fresh-install `schema.sql`, ordered files in `migrations/`, and development data in `seeds/`.
- `docs/` — architecture, handoff, fix notes, and reviewed sample import files.

## Build, Test, and Development Commands

Run each app from its own directory:

```sh
cd backend
npm install
npm run dev       # API with nodemon at http://localhost:3000
```

In another shell:

```sh
cd frontend
npm install
npm run dev       # Vite client at http://localhost:5173
npm run build     # Production bundle
npm run preview   # Serve the built bundle locally
```

Copy `.env.example` to `backend/.env`. From the repository root, run `mysql -u root -p your_database < database/schema.sql`, apply `database/migrations/` in numeric order for existing databases, and use `database/seeds/seed_dummy_data.sql` only for development data.

## Coding Style & Naming Conventions

Use two-space indentation. Backend uses CommonJS and semicolons; frontend uses ES modules, Vue `<script setup>`, and Tailwind classes. Name Vue components in PascalCase (`MonthPicker.vue`) and JavaScript variables/functions in camelCase. No formatter or linter is configured; match adjacent files.

## Testing Guidelines

Backend tests use Node's built-in test runner through `npm test`; no coverage threshold is configured. Pull requests run backend tests and the frontend production build through `.github/workflows/ci.yml`. Smoke-test `GET /` plus affected authenticated API flows with the backend and seeded database. For database changes, test a fresh schema and migration path, including Thai fiscal-year boundaries. New tests should sit near the target module and use `*.test.js` or `*.spec.js`.

## Commit & Pull Request Guidelines

Recent commits include `fix: add fiscal year ranges to seed data` and generic “update latest changes”. Prefer imperative Conventional Commit subjects (`feat:`, `fix:`, `docs:`, `db:`). PRs should explain behavior/schema changes, list commands, migration order, originating GitHub Issue, and relevant UI screenshots.

## Security & Configuration

Never commit `.env`, credentials, tokens, or production data. Keep MySQL credentials and `JWT_SECRET` in environment variables, use a strong local secret, and review CSV/XLSX imports before loading. Treat migrations as ordered, reviewed changes.

## Team Workflow

- Two developers; AI-assisted workflow.
- Start every development task from a GitHub Issue with exactly one dedicated
  branch and one pull request; never edit or commit on `main`.
- Before editing, check the branch and `git status`; on `main`, stop and notify the user.
- Read relevant context, analyze the task, and propose a plan before editing.
- Stay within the Issue scope; do not fix unrelated code.
- Before committing, inspect `git diff` and run relevant tests/checks; report anything untested.
- When the user invokes `/implement #<issue>`, follow the authorized end-to-end
  delivery loop and approval boundaries in `docs/agents/implement-delivery.md`.
- Summarize changed files, test results, and remaining risks.
- For review requests, review only; edit files only when explicitly asked.

## Agent skills

### Issue tracker

Track issues and specs in this repository's GitHub Issues. See
`docs/agents/issue-tracker.md`.

### Triage labels

Use the standard `needs-triage`, `needs-info`, `ready-for-agent`,
`ready-for-human`, and `wontfix` labels. See
`docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout with a root `CONTEXT.md` and repository-level ADRs.
See `docs/agents/domain.md`.
