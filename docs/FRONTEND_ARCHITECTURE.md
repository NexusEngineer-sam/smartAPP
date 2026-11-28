# SAMWEL CAMPUS OS — Frontend Architecture

## Decision

Keep the existing Next.js 16 App Router, React 19 and TypeScript foundation. This is already a React application; replacing it with another framework would add risk without benefit.

The target is a Facebook-inspired product architecture, not a pixel-for-pixel copy of Facebook.

## Existing application capabilities to preserve

- App Router pages and route handlers
- Server-side authentication checks and HttpOnly session cookies
- Supabase PostgreSQL with Prisma
- Social feed, stories, likes, comments and media uploads
- Campus discovery, global campus network and messenger
- Events, timetable, study planner and notifications
- Push notification service worker and PWA manifest

## Frontend boundaries

Organize future work around these boundaries:

- `app/`: routes, layouts, loading/error boundaries and route handlers
- `components/ui/`: accessible, reusable primitives (buttons, dialogs, menus, avatars, inputs)
- `components/feed/`: feed composer, stories rail, post, reactions and comments
- `components/navigation/`: desktop navigation, mobile navigation and account menu
- `components/messaging/`: conversation list, thread and composer
- `features/`: domain-specific feature modules and their UI
- `lib/api/`: typed browser API clients and request/response schemas
- `lib/server/`: server-only services, authentication and database access
- `lib/validation/`: shared Zod schemas where client/server reuse is safe

Do not move files in bulk. Migrate one feature at a time and keep existing imports/routes working.

## Rendering and data rules

1. Prefer React Server Components for read-only, server-rendered route content.
2. Use Client Components only for interactions, browser APIs, media capture, push permission and live UI.
3. Keep authorization and role checks on the server; never rely on hidden UI for security.
4. Use typed route handlers and Zod validation at API boundaries.
5. Avoid polling every five seconds for every feed/conversation at scale. First add pagination, cursor-based loading, request deduplication and visibility-aware refresh; introduce a managed realtime transport only after load testing.
6. Keep media uploads signed by the server and validate file type/size on both sides.
7. Add accessible keyboard focus, reduced-motion support and responsive layouts to shared primitives.

## Styling direction

Use a small token-based design system with CSS variables and CSS Modules or the existing global stylesheet during transition. Establish typography, spacing, surfaces, borders, focus rings, motion and breakpoints centrally. Keep the dark, restrained, high-contrast campus visual direction; avoid turning every content item into a card. The feed should be a continuous content stream with clear separators and lightweight controls.

## GraphQL / Relay

Do not add Relay or GraphQL as a cosmetic dependency. The current application exposes Next.js route handlers and has no verified GraphQL schema/server. Re-evaluate Relay only if a measured data-fetching problem and a real GraphQL service justify it. Until then, use typed REST route handlers and server-side data access.

## Migration sequence

1. Baseline: inventory routes, components, APIs, schema and current deployment.
2. Shared UI: introduce accessible primitives and design tokens without changing behavior.
3. Navigation/feed: improve responsive navigation and continuous feed experience.
4. Data: add cursor pagination, request cancellation/deduplication and loading/error/empty states.
5. Realtime: evaluate WebSocket/SSE delivery for feed, chat and notifications.
6. Quality: type-check, production build, accessibility checks, mobile testing and load tests.
7. Release: ship behind a reviewed branch/PR and verify production health before merging.

## Non-negotiable safeguards

- No database reset or destructive schema push as part of frontend migration.
- No changes to authentication/session semantics without a separate security review.
- No removal of existing features.
- No claim of production readiness until build, API, mobile and deployment checks pass.
