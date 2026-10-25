# AGENTS.md: instructions for the coding tool

Read `docs/design-doc.md` before making any change. It is the source of truth for the schema, endpoints, validation, transactions, and tests. For any UI work, also read `docs/DESIGN_SYSTEM.md`, which defines colours, typography, spacing, and components. If this file and either design doc disagree, stop and ask.

## 1. Stack

- Node.js 20 or later, TypeScript.
- Yarn 4 (Berry) workspaces with `nodeLinker: node-modules`. One root `yarn.lock`.
- Two workspaces: `web` (frontend) and `server` (backend). No shared workspace.
- GraphQL Yoga on `node:http`, with `graphql` as a peer dependency.
- `pg` with a single shared `Pool`. Raw SQL only. **No ORM.**
- `node-pg-migrate` for migrations, SQL files in `server/migrations/`.
- `zod` is not used. Validation is hand-written in `server/src/common/validators/validation.pipe.ts`.
- Tests: Vitest for unit and integration tests. Integration tests run against the Supabase test project.
- Frontend: Next.js static export (`output: 'export'`), urql, and `graphql-sse`. No server rendering.
- Hosting: API on Render as a native Node service (no Docker), frontend on Vercel with root directory `web`, database on Supabase.

## 2. Commands

Run from the repository root. Install once at the root, then use workspace commands.

```bash
# root
yarn install              # install all workspaces
yarn start                # start web and server together
yarn dev:up               # build and start the Docker stack
yarn dev:down             # stop the Docker stack
yarn test                 # run server tests
yarn build                # build web (static export) and server

# server
yarn workspace server migrate:up     # apply pending migrations
yarn workspace server migrate:down   # roll back the last migration
yarn workspace server dev            # start the API with reload
yarn workspace server test           # unit + integration tests
yarn workspace server test:unit      # unit tests only
yarn workspace server seed           # optional: insert mockup sample releases

# web
yarn workspace web dev               # start the Next.js dev server
yarn workspace web build             # static export into web/out
```

Do not run `npm install` inside a workspace. Yarn owns the lockfile.

## 3. Environment

Read from environment variables only. Never hardcode credentials.

| Variable | Used by | File | Notes |
|---|---|---|---|
| `DATABASE_URL` | server, migrations | `server/.env` | Supabase session pooler string |
| `TEST_DATABASE_URL` | integration tests | `server/.env` | Supabase test project. Never the dev database. |
| `PORT` | server | `server/.env` | Default `4000` |
| `CORS_ORIGIN` | server | `server/.env` | Allowed frontend origin |
| `GRAPHIQL_ENABLED` | server | `server/.env` | `true` locally, `false` in production |
| `NEXT_PUBLIC_GRAPHQL_URL` | web | `web/.env.local` | Full URL of `/graphql` |

Each workspace has its own `.env.example` with placeholder values. Never commit `.env` or `.env.local`.

## 4. File layout

```
releasecheck/
  package.json             root: private, workspaces ["web", "server"], shared scripts
  yarn.lock
  .yarnrc.yml              nodeLinker: node-modules, yarnPath to Yarn 4.9.2
  .nvmrc
  .gitignore
  AGENTS.md
  README.md
  docs/
    design-doc.md          backend and API design (source of truth)
    DESIGN_SYSTEM.md       UI design tokens and components
  web/
    package.json
    next.config.mjs        output: 'export'
    .env.example
    src/
      app/                 Next.js pages (list, release)
      components/          Table, ReleaseForm, StepCheckbox, ChangeBanner
      graphql/             queries, mutations, subscription documents
      lib/                 urql client, clientId, banner state
  server/
    package.json
    tsconfig.json
    .env.example
    migrations/            node-pg-migrate SQL files
    src/
      main.ts              HTTP server listen and shutdown
      app.module.ts        wires the database, pubsub, and releases module
      utils/
        expected-client-error.ts  keeps BAD_USER_INPUT and NOT_FOUND unmasked
        index.ts                   exports expectedClientError
      database/
        database.service.ts the single Pool and transactions
      common/
        exceptions/graphql.exception.ts  GraphQL errors with extensions.code
        validators/validation.pipe.ts    name, date, notes, UUID, clientId rules
      graphql/
        schema.graphql     the only schema definition
        yoga.ts            Yoga instance, schema, CORS
        pubsub.service.ts  in-process event channel
      releases/
        releases.module.ts    constructs the releases providers
        resolvers/releases.resolver.ts  thin: validate, call the service, map results
        services/releases.service.ts    business rules, publishes events after commit
        services/release-status.service.ts  pure status function
        repository/releases.repository.ts   SQL for releases and steps
        steps.constants.ts    STEP_DEFINITIONS
        dto/release.dto.ts
        entities/release.entity.ts
    tests/
      unit/                status, validation, steps drift test
      integration/         GraphQL operations against the test database
```

Docker runs both apps through the root `docker-compose.yaml`. `server/Dockerfile` builds the API. `web/Dockerfile` builds the static export and nginx serves it. The database stays on Supabase via `server/.env`.

## 5. Conventions

- **Layers:** resolvers call services. Services call repositories. Resolvers never run SQL. Repositories never import GraphQL types.
- **SQL:** parameterised queries only. Never build SQL with string concatenation.
- **Transactions:** one client per transaction. Use `BEGIN`, then `COMMIT` or `ROLLBACK` in a `finally`, releasing the client every time.
- **Events:** publish `ReleaseChange` only after `COMMIT` returns. Never inside a transaction.
- **Errors:** throw the helpers in `common/exceptions/graphql.exception.ts` with `extensions.code`. Log unexpected errors with detail and return a generic `INTERNAL_SERVER_ERROR`.
- **Step definitions:** `STEP_DEFINITIONS` in `releases/steps.constants.ts` is the only list the code uses. The database enum must match it. The drift test enforces this.
- **Status:** computed only by `ReleaseStatusService`. Never stored, never computed in SQL or in the client.
- **Mutations:** take explicit values (`completed: Boolean!`). Never implement a toggle.
- **Migrations:** never edit a migration that has been applied. Add a new one.
- **Workspaces:** `web` never imports from `server`, and `server` never imports from `web`. They communicate only through GraphQL.

## 6. Working rules

- Build one operation at a time, in this order: status function and its unit tests, `createRelease`, `releases` and `release`, `setStepCompleted`, `updateReleaseNotes`, `deleteRelease`, then the subscription.
- Run `yarn test` after every change. Do not move on while tests fail.
- Do not change the schema without updating `docs/design-doc.md` first, then the migration, then the code.
- Do not change colours, spacing, or component styles without updating `docs/DESIGN_SYSTEM.md` first.
- Do not add dependencies that are not listed in section 1 without asking. Add them to the workspace that uses them, not the root.
- Keep the frontend free of business logic. It sends intent and renders what the server returns.
- When a design question comes up that the design doc does not answer, stop and ask instead of guessing.
