# Production deployment

SAMWEL CAMPUS OS is a Next.js server application. It is **not** a static GitHub Pages site: its App Router API endpoints, Prisma client and database-backed authentication require a Node.js runtime.

## Deploy with Vercel

1. Sign in to https://vercel.com/ using the GitHub account that owns this repository.
2. Select **Add New → Project**, import `NexusEngineer-sam/smartAPP`, and keep the framework preset as **Next.js**.
3. In **Environment Variables**, add the following for Production (and Preview if desired):
   - `DATABASE_URL`: Supabase Transaction Pooler URI (port 6543) with `?pgbouncer=true` for the serverless runtime.
   - `DIRECT_URL`: Supabase Session Pooler URI (port 5432), or a direct database URI supported by the deployment network.
   - `CRON_SECRET`: a long, random secret used by the reminder endpoint.
   - `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`: only if running the administrator seed command in a trusted one-off environment. Do not expose these as client-side variables.
4. Deploy. Vercel reads `vercel.json` and runs `npm run build`.
5. After deployment, open the site's `/api/health` endpoint. Then test registration, login, logout and the admin-only routes using test accounts before adding real student data.

## Database notes

- Keep both database URLs private. Never commit them to this repository or paste them into public issues.
- URL-encode reserved characters in the database password (for example `@`, `#`, `?` and `/`).
- Apply schema changes from a trusted environment with `npm run db:migrate:deploy` when reviewed migrations exist. Do not run `prisma db push` as an automatic production deployment step.
- The GitHub Actions quality workflow accepts either `DATABASE_URL` or the legacy secret name `CAMPUS_PS`; if only one connection string is supplied, it is also used as the fallback for Prisma's `DIRECT_URL`. For production hosting, configure the two URLs separately as described above.

## GitHub Pages

Do not use **Settings → Pages → Deploy from a branch** for this application. That path publishes static files and cannot run the Next.js API routes or Prisma-backed server. Keep the source code in GitHub and use a Node.js host for the running application.
