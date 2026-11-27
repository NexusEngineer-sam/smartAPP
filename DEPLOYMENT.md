# Production deployment — Render + Supabase

SAMWEL CAMPUS OS is a Next.js server application. It is **not** a static site: App Router API endpoints, Prisma and database-backed authentication require a Node.js web service.

## 1. Create or connect the Render Web Service

1. Open https://dashboard.render.com/ and select the existing `smartAPP` Web Service, or create a new **Web Service** from `NexusEngineer-sam/smartAPP`.
2. Select branch `main` and runtime **Node**.
3. Set:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Health Check Path:** `/api/health`
4. Keep the service as a persistent Node.js web service. Do not deploy this app as a static site.

## 2. Set environment variables in Render

Open the Web Service → **Environment** and add these values. The names are case-sensitive.

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Supabase **Session Pooler** URI (port 5432), copied from Supabase Connect |
| `DIRECT_URL` | Supabase Session Pooler URI (port 5432), or a direct URI supported by your Render network |
| `CRON_SECRET` | A long, random secret used to protect the reminder endpoint |
| `ADMIN_NAME` | Your chosen administrator display name |
| `ADMIN_EMAIL` | Your administrator login email |
| `ADMIN_PASSWORD` | A unique strong password, at least 12 characters |

Use the actual URI copied from your Supabase project. Do not copy the example placeholders. If the database password contains reserved URL characters such as `@`, `#`, `?`, `/` or spaces, URL-encode those characters in the URI. Never commit or share the real values.

**Important:** GitHub Actions Secrets and Render Environment Variables are separate. Adding a secret in GitHub does not automatically add it to Render.

## 3. Prepare the Supabase schema and administrator

After Render has the correct database variables:

1. Open the Render service's **Shell** (or use a trusted local terminal with the same environment variables).
2. Run `npx prisma db push` once to create/update the initial schema in the selected Supabase database.
3. Run `npm run db:seed` once to create the initial administrator from `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. Restart or redeploy the Web Service if required.

The repository currently has a Prisma schema but no checked-in migration history. For this initial setup, `db push` is used to create the schema. Before future production schema changes, introduce and review Prisma migrations; do not blindly run `db push` as an automatic deployment command.

## 4. Verify the live application

After deployment, open:

- `https://YOUR-SERVICE.onrender.com/api/health` — should return HTTP 200 with `ok: true` and `database: "connected"`.
- `https://YOUR-SERVICE.onrender.com/login` — should display the sign-in page.

Then test with a test student account:
- registration;
- sign in and sign out;
- authenticated dashboard;
- expense creation and user data isolation;
- admin sign-in and admin-only pages.

Do not enter real student records until the database, access controls, backups and operational monitoring have been verified.

## 5. GitHub Actions

GitHub Actions validates the TypeScript project and production build. The separate quality workflow can also test a database connection when its GitHub Secrets are configured. A successful CI build alone does **not** prove that Render is live or that the production Supabase database is connected.

## 6. Timetable reminders

The protected reminder endpoint is `POST /api/jobs/reminders` and requires `Authorization: Bearer <CRON_SECRET>`. To run reminders automatically, configure a Render Cron Job or another scheduler to send the authenticated POST request on the desired schedule. The current implementation queues in-app notifications; it does not send SMS or trigger phone alarms.

## Security notes

- Never expose `DATABASE_URL`, `DIRECT_URL`, `CRON_SECRET` or `ADMIN_PASSWORD` in source code, screenshots, public issues or chat.
- Keep `.env` out of Git; it is intended for local development only.
- Use a strong unique administrator password and change it if it has been shared.
- Keep Supabase backups enabled and review database access before production use.
