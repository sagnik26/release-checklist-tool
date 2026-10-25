# ReleaseCheck

A single-user checklist for software releases. Each release has a name, a due date, optional notes, and seven fixed steps. Status is derived from the steps and is never stored.

## Requirements

- Node.js 20 or later
- Yarn 4
- PostgreSQL, hosted on Supabase

## Setup

Install from the repository root. Yarn owns the lockfile.

```bash
yarn install
```

Copy the environment examples and fill in real values. Do not commit `server/.env` or `web/.env.local`.

```bash
cp server/.env.example server/.env
cp web/.env.example web/.env.local
```

| Variable | Used by | Purpose |
|---|---|---|
| `DATABASE_URL` | server, migrations | Supabase session pooler string for the dev database |
| `TEST_DATABASE_URL` | server tests | Supabase session pooler string for a separate test project |
| `PORT` | server | API port, default `4000` |
| `CORS_ORIGIN` | server | Allowed frontend origin, for example `http://localhost:3000` |
| `GRAPHIQL_ENABLED` | server | `true` locally, `false` in production |
| `NEXT_PUBLIC_GRAPHQL_URL` | web | Full URL of the GraphQL endpoint, for example `http://localhost:4000/graphql` |

`TEST_DATABASE_URL` must not be the dev database. Integration tests truncate `release`.

Apply the schema:

```bash
yarn workspace server migrate:up
```

Roll back the last migration:

```bash
yarn workspace server migrate:down
```

## Run

```bash
yarn start
```

That starts the API and the Next.js app together. The API listens on `http://localhost:4000/graphql`. The app listens on `http://localhost:3000`.

Docker, with Colima already running:

```bash
yarn dev:up
yarn dev:down
```

The API container reads `server/.env`. The site is the static export, served on `http://localhost:3000`, and it calls `http://localhost:4000/graphql`. Both containers join the `releasecheck` network. `server/.env` is mounted into the API, and named volumes hold the API temp directory and the nginx cache. Apply migrations before the first start with `yarn workspace server migrate:up`.

Other commands, from the repository root:

```bash
yarn test
yarn build
yarn workspace server test:unit
yarn workspace server seed
```

`yarn workspace server seed` inserts three sample releases into the dev database.

## GraphQL

Queries, mutations, and subscriptions share one endpoint: `POST /graphql`.

GraphQL Yoga 5.24.6 selects server-sent events when the request sends `Accept: text/event-stream`. A subscription body is a normal GraphQL POST. The response `Content-Type` is `text/event-stream`. The server writes a comment ping (`:\n\n`) as soon as the stream opens, then again every 12 seconds. When `NODE_ENV` is `test`, that interval is 300 milliseconds. The interval is fixed in this Yoga version.

The integration tests open that stream with `yoga.fetch` and receive `releaseChanged` events after a committed mutation. A mutation that fails validation does not publish an event.

GraphiQL is available at `http://localhost:4000/graphql` when `GRAPHIQL_ENABLED=true`. Set that variable to `false` in production.

## Tests

`yarn test` runs unit tests and integration tests. Integration tests need `TEST_DATABASE_URL` and the migrations applied to that database. They reset with `TRUNCATE release CASCADE` before each test.

## Deploy

The API is a native Node service. Build it with `yarn workspace server build` and start it with `yarn workspace server start`. Host it on Render without Docker. Set the server environment variables there, with `GRAPHIQL_ENABLED=false`.

The web app is a static Next.js export. Set the Vercel root directory to `web`. `NEXT_PUBLIC_GRAPHQL_URL` must be the public API URL ending in `/graphql`, and it is baked in at build time. Set `CORS_ORIGIN` on the API to the Vercel origin.

The database stays on Supabase. Point `DATABASE_URL` at the session pooler and run `yarn workspace server migrate:up` against it once.
