# SAMWEL CAMPUS OS — Architecture Audit & Upgrade Baseline

Audit date: 2026-11-28
Repository: NexusEngineer-sam/smartAPP
Branch: main
Production service: smartapp-d4va.onrender.com
Status: baseline inspection; no production architecture replacement performed.

## 1. Current platform snapshot

- Next.js 16 App Router, React 19, TypeScript strict mode.
- PostgreSQL through Prisma 6.
- Custom cookie-based sessions using a SHA-256 token hash and 32-byte random token.
- Render web service with automatic deployment from main.
- Feature areas include authentication/onboarding, social feed, campus events, notifications/push, study planner, finance, videos, global communities, student matching and private messenger.
- Current codebase is a modular monolith. This is appropriate at the current maturity; premature microservices would add operational complexity.

## 2. Verified strengths

- Strict TypeScript mode is enabled.
- API routes generally authenticate the user before accessing personal data.
- Zod validation is used in several write endpoints.
- Session cookie is HttpOnly, Secure in production, SameSite=Lax and path scoped.
- Session tokens are random and only their SHA-256 hashes are stored.
- Several important relational constraints and indexes already exist.
- Next.js response headers include nosniff, frame denial, referrer policy and HSTS.
- Latest Render deployment observed during audit reached LIVE.

## 3. Priority findings

### P0 — Deployment and schema lifecycle

The current package build script executes multiple SQL schema files against the production database before Prisma client generation and Next.js build.

Risk: a build is coupled to database availability and performs schema mutations during build. A rollback of application code does not automatically roll back schema changes. Concurrent or repeated deploys can also make schema ownership difficult to reason about.

Target: versioned, explicit, backward-compatible migrations run as a controlled release step. Application build should compile and generate the Prisma client, not mutate production data.

### P1 — API abuse protection

The inspected social, community, matching and messenger endpoints do not show a shared rate-limiting layer.

Target: centralized per-user and per-IP limits, payload-size limits, abuse signals, and stricter limits for search, posting, login and message creation.

### P1 — Messaging scalability and correctness

The first Messenger implementation refreshes conversations/messages by polling. This is functional as a first release but is not true real-time delivery. The current schema also has no database-level unique key guaranteeing one direct conversation per unordered pair of users.

Target: durable message writes, idempotency keys, cursor pagination, unread counters, notification delivery, and later a managed realtime transport. Add a safe uniqueness strategy for direct conversations before high-volume use.

### P1 — Background work

The reminder endpoint processes recipients sequentially and uses fixed query caps. It combines schedule selection, notification creation and push delivery in one request.

Target: a queue-backed worker, bounded batches, retry/backoff, dead-letter handling, idempotent jobs and delivery telemetry. Keep the existing endpoint as a temporary scheduler trigger until worker infrastructure is ready.

### P1 — Observability and operational readiness

No automated test command is defined in package scripts. The inspected service logs contain historical Prisma errors and aborted requests on 2026-11-27; the current audit did not establish their root cause or prove that they remain active.

Target: unit/integration/e2e checks, structured request IDs, sanitized error reporting, health/readiness checks, database latency metrics, queue metrics and deploy smoke tests.

### P2 — Data access and performance

The dashboard refreshes several data sources periodically. Some feeds and discovery routes use fixed limits rather than cursor pagination. Student matching fetches a bounded candidate set and computes scores in application memory.

Target: cursor pagination, query plans and index review, selective projections, caching for public/slow-changing data, and measured recommendation indexing. Do not add caching to private data until invalidation and privacy rules are explicit.

### P2 — Security hardening

Current headers are a useful baseline, but the inspected Next.js configuration does not define a Content Security Policy. No shared CSRF/origin policy or centralized API rate limit was found in the files inspected. These require a full route review before being described as system-wide gaps.

Target: CSP in report-only mode first, origin/CSRF protections for cookie-authenticated mutations, input/output validation conventions, secret rotation guidance, audit coverage and security tests.

### P2 — Privacy and consent

Student matching profiles are created when a student submits the profile form. The inspected matching endpoint returns opted-in profile attributes to other matching users. A full privacy review is still needed for visibility controls, blocking/reporting, deletion/export and retention.

Target: explicit discoverability controls, block/report workflows, field-level visibility, data export/deletion and retention policy.

## 4. Target architecture (incremental)

Keep a modular monolith first, with clear internal boundaries:

- Identity & Access: sessions, roles, authorization, device/session management.
- Campus Social: posts, comments, reactions, moderation.
- Messaging: conversations, participants, messages, receipts and delivery.
- Academic Workspace: timetable, study planner, reminders.
- Global Network: communities, profiles, matching.
- Campus Services: events, student life, finance and media.
- Intelligence: recommendations, search ranking and notifications.
- Platform Core: database access, queues, cache, object storage, audit and observability.

External infrastructure roles:
- PostgreSQL as the durable source of truth.
- Redis-compatible managed cache/queue only when workload and budget justify it.
- Object storage/CDN for media; never use the application server filesystem as durable media storage.
- Background worker for notifications and other asynchronous tasks.
- Realtime transport for messaging after delivery semantics and cost are measured.

## 5. Safe migration sequence

1. Establish baseline tests, database backup/restore procedure and deploy smoke test.
2. Separate schema migrations from the application build; introduce migration history and backward-compatible expand/contract releases.
3. Add centralized security middleware/utilities: rate limits, origin checks, request IDs and consistent validation.
4. Add cursor pagination and indexes based on measured query plans.
5. Move reminders and notification delivery into durable background jobs.
6. Upgrade Messenger with idempotency, unread/read state, pagination and realtime delivery.
7. Add caching and scale-out only after measuring database and application bottlenecks.
8. Add intelligence services and premium UI polish on top of stable APIs.

## 6. Safety rules for the upgrade

- No destructive database migration without verified backup and explicit rollback plan.
- No secrets in source control or client bundles.
- No claim of millions of concurrent users without load testing and capacity evidence.
- Deploy backward-compatible changes in small batches.
- Verify build, deploy, health checks and critical user flows after every release.
- Preserve existing user accounts and data.

## 7. Audit limits

This is a source/configuration inspection, not a penetration test, full schema/data audit, load test or independent security certification. Some findings require review of additional route files, Render configuration, database metrics and actual user journeys before final severity can be assigned.