# SAMWEL CAMPUS OS

**Enterprise-grade Smart University Operating System**  
Founder: **Samwel Jastin Mduli**  
Vision: *Engineering Digital Solutions. Building the Future of Campus Life.*

SAMWEL CAMPUS OS is a modular university platform being developed for UDOM first, with a path to support multiple institutions.

## Technology

- Next.js 16 App Router, React 19 and TypeScript
- Supabase-hosted PostgreSQL with Prisma ORM 6
- Database-backed sessions, HttpOnly cookies and hashed session tokens
- Zod request validation and bcrypt password hashing
- Custom responsive design system and PWA foundation

## Supabase setup (first database connection)

1. Create a project at [Supabase](https://supabase.com/dashboard). Choose a strong database password and save it in a password manager.
2. Wait until the database is ready. Open the project and select **Connect**.
3. Choose **Session pooler** and copy its URI (port **5432**). Do not type the host manually: copy the exact host and username shown by Supabase.
4. In your local project, copy `.env.example` to `.env`. Put the Session pooler URI into `DATABASE_URL`.
5. For `DIRECT_URL`, use the Session pooler URI (port 5432) as well. This is compatible with IPv4-only environments. If your deployment supports IPv6, you can instead use the direct database URI copied from Supabase.
6. Replace the placeholders in both connection strings with the real project reference, host, username and database password. If the password contains reserved URL characters (such as `@`, `#`, `?`, `/` or spaces), URL-encode those characters.
7. Set a unique `CRON_SECRET`, plus `ADMIN_NAME`, `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (at least 12 characters).
8. Run the commands below from the repository root.

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run lint
npm run dev
```

Open `http://localhost:3000`. Sign in using the administrator email and password you configured. Public registration creates student accounts only. Never put real credentials in GitHub, screenshots, chat messages or source code. Keep `.env` local; it is ignored by Git.

### Connection mode for deployment

- A persistent Node.js server or IPv4-only network: use Supabase **Session pooler** (port 5432) for the runtime connection.
- A serverless deployment: use Supabase **Transaction pooler** (port 6543) for `DATABASE_URL` and append `?pgbouncer=true`; keep `DIRECT_URL` on Session pooler (port 5432) or a supported direct connection for Prisma CLI operations.
- The Prisma schema uses `directUrl` so CLI schema operations can use `DIRECT_URL`, while Prisma Client uses `DATABASE_URL`.

After the first schema push, use reviewed Prisma migrations for ongoing production schema changes. Do not use `db push` as a substitute for a controlled production migration process.

## Current foundation

- Student registration, sign-in and secure logout
- Student expense tracking
- Published campus announcement feed
- Admin account directory, role management and account activation/suspension
- Admin announcement creation, publishing, unpublishing and deletion
- Admin timetable scheduling with explicit student assignment and cancellation
- Admin audit trail
- Authenticated student timetable view
- Protected timetable reminder job that queues in-app notifications
- Automated GitHub Actions quality checks

## Environment variables

See `.env.example` for the required names. The real `.env` file must never be committed. Configure the same values in your deployment host's secret manager.

## Notifications

The reminder job is available at `POST /api/jobs/reminders` and requires `Authorization: Bearer <CRON_SECRET>`. Configure a scheduler to call it regularly. It currently queues in-app notifications only. SMS delivery requires a separate SMS provider, credentials and delivery worker; phone alarms require device notification integration and permissions.

## Security and operational readiness

- Passwords are stored as bcrypt hashes.
- Session tokens are random, hashed in the database and sent in HttpOnly cookies.
- Public sign-up cannot create privileged roles.
- Admin APIs enforce server-side role checks.
- User data is scoped to the authenticated account.
- Keep credentials private, enable backups, review access policies and monitor database health before using real student records.

**Status:** Active development. Database credentials must be configured and a successful build/runtime test completed before deployment.
