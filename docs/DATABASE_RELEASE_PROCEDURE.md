# Database release procedure

## Why this exists

The application build must compile the app only. It must not mutate the production database. The legacy SQL files are retained unchanged because they represent the currently deployed schema bootstrap and feature additions.

## Current safe change

- `yarn build` now runs only `prisma generate && next build`.
- `yarn db:legacy:apply` is an explicit, operator-triggered command that applies the existing idempotent SQL files in their established order.
- Do not run the legacy command casually against production: inspect the SQL and take a verified database backup first.
- Existing production data and tables are not dropped by this change.

## Important limitation

This is a transition step, not the final migration system. The repository does not yet have a complete, verified Prisma migration history. Do not run `prisma migrate deploy` until a baseline migration has been created and reconciled against the live database.

## Release checklist

1. Verify a current PostgreSQL backup and restore procedure.
2. For an existing environment, confirm all required tables and indexes exist before deploying code that uses them.
3. Build and deploy application code independently of schema changes.
4. For schema changes, create a reviewed, versioned SQL migration with forward and rollback notes.
5. Apply it as a separate controlled release operation.
6. Run smoke tests for authentication, feed, communities, Messenger, schedules and notifications.
7. Keep changes backward-compatible until all application instances run the new version.

## Next migration-system milestone

Inventory the live schema, compare it with `prisma/schema.prisma`, then create a baseline and tracked migrations. This requires a verified backup and schema comparison; it must not be guessed from the Prisma model alone.
