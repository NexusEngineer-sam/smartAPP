# SAMWEL CAMPUS OS — Global Distributed Architecture

Status: design baseline only. This document does not provision infrastructure or change production data.
Branch: global-architecture-foundation
Date: 2026-11-28

## Architecture decision

Adopt a globally distributed-ready design while retaining the existing application as a modular monolith and a single authoritative PostgreSQL source of truth in the initial release. Do not split into microservices or multi-master databases prematurely.

## Current verified deployment baseline

- Render workspace: My Workspace.
- `samwel-data-center`: Frankfurt, free web service.
- `smartAPP-databaseconnect`: Oregon, free web service.
- `smartAPP`: Oregon, free web service.
- All three currently report one instance and deploy from the same GitHub repository's `main` branch.
- The application README identifies Supabase-hosted PostgreSQL accessed through Prisma.
- The Render service inventory does not establish that the three services form a multi-region database cluster. Their actual runtime responsibilities and database connectivity must be verified before routing or scaling changes.

## Target logical topology

```text
Students worldwide
       |
   DNS / HTTPS
       |
 CDN + WAF (static assets and cache-safe public media only)
       |
 Global entry / routing layer
       |
 Primary application region (initially existing production region)
       |
 Modular application domains
   | Identity & Access
   | Campus Social / Communities
   | Messenger
   | Academic Workspace
   | Notifications / Intelligence
       |
 PostgreSQL — single source of truth initially
       |
 Durable object storage for images, videos and files
       |
 Queue + background workers for notifications and media jobs

Future regional application cells
       |
 controlled APIs / read replicas / regional media edge
       |
 disaster-recovery region and tested restore process
```

## Non-negotiable data rules

1. PostgreSQL remains the authoritative source of truth until replication consistency, failover, and conflict handling are designed and tested.
2. Do not create independent writable copies of student identity, sessions, messages, payments, or academic records in each region.
3. CDN caching is limited to public, cache-safe assets. Never publicly cache private profiles, authenticated API responses, messages, tokens, or student records.
4. Store uploaded media in durable object storage, not on ephemeral application instance filesystems.
5. Encrypt transport; protect secrets in host secret managers; never commit credentials.
6. Define campus-level tenancy and explicit visibility/consent rules before cross-campus discovery is enabled.
7. Backups are not considered reliable until restore tests are completed.

## Phased delivery

### Phase 0 — Verify and protect
- Confirm which Render service is the production web application and which service is the admin control plane.
- Verify environment-variable names and database host/provider without exposing secret values.
- Verify Supabase project region, backup/PITR options, connection pooler and current schema migration state.
- Capture a backup and test restore in a non-production environment.
- Add health/readiness checks and deployment smoke tests.

### Phase 1 — Stabilize the core
- Remove production schema mutation from the application build command.
- Use reviewed, versioned Prisma migrations in an explicit release step.
- Add shared request IDs, structured sanitized logs, origin/CSRF checks and per-user/IP rate limits.
- Add cursor pagination and database index review based on measured query plans.
- Separate notification/reminder processing into durable idempotent background jobs.

### Phase 2 — Media and delivery
- Select durable object storage and CDN based on cost, region, privacy, and egress.
- Use signed upload/download URLs for private media.
- Cache only public media and static assets with explicit cache-control and invalidation.
- Measure upload, playback, cache-hit and origin-egress performance from multiple countries.

### Phase 3 — Global application cells
- Deploy additional stateless application instances/regions only when measured latency or availability requires them.
- Keep writes routed to the authoritative database initially.
- Add read replicas only for suitable read workloads and document replication lag.
- Define routing, failover, health checks, and rollback behavior before production activation.

### Phase 4 — Advanced distribution
- Consider partitioning/sharding only after measured database bottlenecks and a tenant/data ownership design.
- Consider regional data residency only after legal, privacy, and operational requirements are mapped per country.
- Prove failover, restore, and cross-region consistency with controlled tests before claiming multi-region resilience.

## Exit criteria before each production phase

- Existing login, registration, posts, comments, likes, messages and notifications pass regression tests.
- Backup and restore are verified.
- Migrations are backward-compatible and have a rollback/forward-fix plan.
- Load tests report throughput, p95/p99 latency, error rate, and database saturation.
- Monitoring and alerts are active.
- Cost impact is reviewed and approved before paid resources are created.

## Explicitly out of scope for the initial phase

- No automatic multi-master writes.
- No claim of 50 million concurrent users without load-test evidence.
- No paid regional resources provisioned without explicit cost approval.
- No destructive database changes or production traffic switch as part of this design document.
