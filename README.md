# SAMWEL CAMPUS OS

**Enterprise-grade Smart University Operating System**  
Founder: **Samwel Jastin Mduli**  
Vision: *Engineering Digital Solutions. Building the Future of Campus Life.*

SAMWEL CAMPUS OS is being developed as a secure, modular university platform that can serve UDOM first and expand to other institutions.

## Technology

- Next.js 16 App Router, React 19 and TypeScript
- PostgreSQL with Prisma ORM
- Secure database-backed sessions (HttpOnly cookies, hashed session tokens)
- Zod request validation and bcrypt password hashing
- Custom responsive design system and PWA manifest
- Lucide icons

## Current working foundation

- Student registration and sign-in
- Secure logout and session validation
- Personal expense creation and listing (persisted in PostgreSQL)
- Published campus announcement feed
- Admin-only account directory
- Admin activation/suspension of accounts with audit records
- Admin announcement publishing, draft creation and deletion
- Admin timetable scheduling with explicit student assignment and cancellation
- Admin audit trail for governance actions
- Timetable reminder notification job endpoint (protected by CRON_SECRET)
- Responsive student workspace and admin control center

## Local setup

1. Install Node.js 20.9+ and PostgreSQL.
2. Copy `.env.example` to `.env` and configure `DATABASE_URL`, `CRON_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.
3. Install packages: `npm install`.
4. Generate Prisma Client: `npm run db:generate`.
5. Apply the schema: `npm run db:push`.
6. Create the first administrator: `npm run db:seed`.
7. Start development: `npm run dev`.

Open http://localhost:3000. Public registration creates STUDENT accounts only. Create the first ADMIN through the seed command; never promote a user by editing a browser request.

## Automated quality checks\n\nGitHub Actions runs dependency installation, Prisma client generation, TypeScript checking and a production Next.js build for pushes and pull requests to `main`.\n\n## Environment and deployment

Deploy on a Node.js-compatible host with managed PostgreSQL. Set all environment variables in the hosting provider's secret manager. Use HTTPS in production. Configure a scheduler to POST to `/api/jobs/reminders` with the header `Authorization: Bearer <CRON_SECRET>` at a suitable interval. The current job queues in-app reminders; SMS delivery requires an approved provider integration and credentials and is not enabled by default.

## Security notes

- Passwords are stored as bcrypt hashes, never plaintext.
- Session tokens are random, stored hashed in the database and sent only in HttpOnly cookies.
- Public sign-up cannot create privileged roles.
- Admin APIs enforce server-side role checks.
- User data is scoped to the authenticated account.
- Validate all untrusted request data and keep secrets out of source control.

## Product roadmap

1. Foundation and identity (current)
2. Admin governance, academic structure, courses and departments (announcement and timetable administration foundation now added)
3. Student timetable, planner, lecturer and class representative workspaces
4. Push notifications, SMS provider integration and device alarms
5. AI study assistant, analytics, multi-campus tenancy and production observability

**Status:** Active development. Configure the database and run the setup steps before deployment. Do not use this development foundation for real student records until production security review, backups, privacy policy and operational monitoring are complete.
