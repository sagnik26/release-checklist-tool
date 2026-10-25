# ReleaseCheck

A checklist for tracking a software release. Each release has a name, a due date, optional notes, and seven fixed steps. Status is calculated from those steps and is never stored.

**Last reviewed:** 25 October 2026

## Overview

ReleaseCheck is a single-user tool. The Next.js app in `web` talks to the GraphQL API in `server`. The API stores releases in Supabase Postgres. There is no login. Name and due date cannot be edited after a release is created. The seven steps are fixed: merged pull requests, changelog, tests, GitHub release, demo deploy, demo testing, and production deploy.

The list is sorted by due date, then name. Status is Planned when no step is done, Ongoing when at least one is done, and Done when all seven are done. A past due date is allowed. An empty list tells you to add a release.

**Create.** New release asks for a name and a date. Notes are optional. Every step starts unchecked, and you can check steps before the first save. Save creates the release and returns to the list. A blank or over-long name, an impossible date, or notes over 2,000 characters stay on the form with an error. Blank notes are stored as empty.

**Update.** On an existing release, checkbox and notes edits stay on that form until Save. Save writes only the steps and notes that differ from the version loaded in that tab. Leaving without Save discards the draft. The tab that saved does not show a banner for its own change.

**Delete.** Delete removes the release and its steps, then returns to the list. Opening a release that was already deleted shows that it no longer exists, with a link back to the list. Deleting the same release again does not recreate it.

**Multiple tabs.** A toggle or note that has not been saved stays on the tab that made it. After a successful save, every other open tab refetches. A step or notes change shows a dismissible banner, for example Checkbox "All tests are passing" was checked in another tab. Several changes collapse into "3 changes from another tab". Creating or deleting a release refreshes the list without a banner. If another tab is mid-edit, it keeps that draft and still shows the banner. A later save from that draft sends only what it changed, and the same step is last save wins. A tab that reconnects refetches the open release.

### Dependencies

- **Upstream:** Supabase Postgres, through the session pooler connection string.
- **Downstream:** the browser. The app is a static Next.js export.

## Local development setup

### Prerequisites

- Node.js 20 or later (`.nvmrc` is `20`)
- Yarn 4.9.2, the version in the root `packageManager` field. Enable it with Corepack: `corepack enable`
- A Supabase project for development, and a second Supabase project for tests
- Docker, if you want the container stack. `yarn dev:up` calls the `docker-compose` binary

Install once from the repository root. Do not run `npm install` inside `web` or `server`.

```bash
yarn install
```

A global Yarn 1.x install fails the `packageManager` check. Use `corepack yarn` for the commands below if `yarn` is still 1.x.

### Environment variables

Copy the examples and fill in real values. Do not commit `server/.env` or `web/.env.local`.

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

| Variable | Used by | Purpose | Where to get it |
|---|---|---|---|
| `DATABASE_URL` | server, migrations | Dev database. Use the Supabase session pooler string from `.env.example` | Supabase, Project Settings, Database |
| `TEST_DATABASE_URL` | server tests | A different Supabase project. Tests run `TRUNCATE release CASCADE` | A second Supabase project |
| `PORT` | server | API port. Default `4000` | `server/.env` |
| `CORS_ORIGIN` | server | Allowed frontend origin, `http://localhost:3000` locally | `server/.env` |
| `GRAPHIQL_ENABLED` | server | `true` locally, `false` in production | `server/.env` |
| `NEXT_PUBLIC_GRAPHQL_URL` | web | Full GraphQL URL, `http://localhost:4000/graphql` locally. Baked in at build time | `web/.env.local` |

`TEST_DATABASE_URL` must not point at the dev database.

Apply the schema before the first start:

```bash
yarn workspace server migrate:up
```

Roll back the last migration:

```bash
yarn workspace server migrate:down
```

### Running locally

```bash
yarn start
```

The API listens on http://localhost:4000/graphql. The app listens on http://localhost:3000.

Open the app, choose **New release**, and save a name and date. The new form is at `/release`. An existing release is at `/release?id=<uuid>`.

On an existing release, checkbox and notes edits stay on that form until **Save**. Other open tabs do not change until the save succeeds. Each of them then shows a banner, for example: Checkbox "All tests are passing" was checked in another tab. Leaving the form without saving discards the draft.

GraphiQL is at http://localhost:4000/graphql when `GRAPHIQL_ENABLED=true`. Queries, mutations, and subscriptions all use `POST /graphql`. Subscriptions are server-sent events on that same URL.

Docker, with the daemon already running:

```bash
yarn dev:up
yarn dev:down
```

`yarn dev:up` builds and stays attached to the logs. After both containers are healthy it prints:

```text
Frontend  http://localhost:3000
Backend   http://localhost:4000/graphql
```

The site container publishes port 3000. The API container reads `server/.env`. Run `yarn workspace server migrate:up` on the host before the first Docker start. The database is not a container. Ctrl+C stops the stack. `yarn dev:down` stops it and leaves the named volumes in place.

### Running tests

```bash
yarn test
yarn workspace server test:unit
```

`yarn test` runs the server unit tests and the integration tests. Integration tests need `TEST_DATABASE_URL` and the migrations applied there. They truncate `release` before each test file.

Build both workspaces:

```bash
yarn build
```

## Architecture

`web` and `server` are Yarn workspaces. They share nothing except the GraphQL API. The browser uses urql. The API is GraphQL Yoga on `node:http`, with raw SQL through one `pg` pool. There is no ORM.

```text
browser (web) -- GraphQL --> server -- SQL --> Supabase
```

Status is computed in the server from the seven step rows. The client renders what the server returns.

### Key files

| Path | Purpose |
|---|---|
| `docs/design-doc.md` | Schema, operations, validation, and tests |
| `docs/DESIGN_SYSTEM.md` | Colours, type, spacing, and components |
| `server/src/graphql/schema.graphql` | The GraphQL schema |
| `server/src/releases/` | Release resolver, service, and SQL |
| `server/migrations/` | SQL migrations |
| `web/src/components/ReleaseForm.tsx` | Create and edit form |
| `web/src/components/Table.tsx` | Release list |
| `docker-compose.yaml` | API, static site, and the startup banner |

## Deployment

The API is a native Node service on Render, without Docker. Build with `yarn workspace server build` and start with `yarn workspace server start`. Set the server environment variables there, with `GRAPHIQL_ENABLED=false`.

The web app is a static Next.js export. On Vercel, set the root directory to `web`. `NEXT_PUBLIC_GRAPHQL_URL` must be the public API URL ending in `/graphql`. Set `CORS_ORIGIN` on the API to that Vercel origin.

Vercel’s default `yarn` is 1.22, which ignores these workspaces and does not install `next`. `.yarnrc.yml` points `yarnPath` at the committed Yarn 4.9.2 binary in `.yarn/releases`, so that install hands off to Yarn 4. Keep that file in git.

The database stays on Supabase. Point `DATABASE_URL` at the session pooler and run `yarn workspace server migrate:up` against it once.

Production URLs are not recorded in this repo.

## Runbooks

### Seed sample releases

Build the server first. Seed reads `server/dist/seed.js` and inserts three sample releases into the dev database.

```bash
yarn workspace server build
yarn workspace server seed
```

### Work on one workspace

```bash
yarn workspace server dev
yarn workspace web dev
```

The API reloads when its TypeScript changes. The Next.js dev server is the second command.

## Troubleshooting

### `yarn` reports a packageManager mismatch

**Symptom:** Yarn 1.22 refuses to run because `packageManager` is `yarn@4.9.2`.  
**Cause:** Yarn 1 did not follow `yarnPath` to the committed Yarn 4 binary.  
**Fix:** Confirm `.yarn/releases/yarn-4.9.2.cjs` exists and `.yarnrc.yml` points `yarnPath` at it. `corepack enable` also selects Yarn 4.

### `docker compose up --build` says `unknown flag: --build`

**Symptom:** Docker prints its own usage text.  
**Cause:** This machine's Docker CLI has no Compose plugin. The project script calls `docker-compose`.  
**Fix:** `yarn dev:up`.

### The API container cannot resolve the Supabase host

**Symptom:** Server logs show `getaddrinfo ENOTFOUND` for `db.<project>.supabase.co`.  
**Cause:** That host is IPv6-only. The Docker VM has no IPv6 route.  
**Fix:** Use the session pooler host from `server/.env.example` (`aws-0-<region>.pooler.supabase.com`, user `postgres.<project-ref>`).

### Tests deleted the dev releases

**Symptom:** The dev database is empty after `yarn test`.  
**Cause:** `TEST_DATABASE_URL` points at the same database as `DATABASE_URL`.  
**Fix:** Point `TEST_DATABASE_URL` at a separate Supabase project.

## Contributing

Read `AGENTS.md` before changing code. `docs/design-doc.md` is the source of truth for the schema, operations, and tests. `docs/DESIGN_SYSTEM.md` is the source of truth for UI. Update the matching doc before changing that behavior. `web` and `server` do not import each other.

## License

[MIT](LICENSE)

## Related docs

- [Design doc](docs/design-doc.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Agent instructions](AGENTS.md)
