# [Project name]

_Replace the heading above with the project's name, and this line with one sentence describing what this app does for users._

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run migrate:mongodb -- --apply` — copy app data from PostgreSQL to MongoDB; it does not delete PostgreSQL data
- Required runtime env: `MONGODB_URI` — MongoDB connection string, supplied through Replit Secrets
- `DATABASE_URL` is needed only by the one-time migration script and for the retained PostgreSQL rollback copy

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: MongoDB for API runtime; PostgreSQL + Drizzle retained for migration and rollback
- The current `MONGODB_URI` does not specify a database path, so the MongoDB driver selects its default `test` database
- Validation: Zod (`zod/v4`); Drizzle is used only by the PostgreSQL migration script
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (ESM bundle)

## Architecture decisions

- MongoDB is the active API database. PostgreSQL is preserved as an untouched rollback source; do not drop its data without the user's later approval.
- Clerk authentication remains unchanged by the database migration.

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
