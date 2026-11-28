# SAMWEL CAMPUS OS — Advanced Security Hardening Plan

Date: 2026-11-28
Status: audited requirements and prioritized implementation plan; not a claim that all controls are deployed.

## Security objective

Protect student accounts, campus data, private messages, business logic, infrastructure and intellectual property against unauthorized access, abuse, data theft and service disruption. Use defense in depth and assume every client and every network request can be hostile.

## Verified code observations from the architecture branch

- The main app uses Next.js 16, TypeScript, Prisma 6 and PostgreSQL.
- The Prisma schema has User, Session, IdentityToken and PasswordResetToken models. Session and one-time token values are represented as tokenHash fields.
- The dependency list includes bcryptjs and Zod.
- `next.config.ts` already disables the X-Powered-By header and sets X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy and HSTS.
- The current headers do not yet include a Content-Security-Policy.
- `package.json` exposes manual `prisma db push` and a broad legacy SQL apply script. These are not part of the current build script, but must never be casually run against production.
- Repository visibility was reported as PUBLIC in the GitHub audit. Making it Private is an urgent owner action; a private repo does not protect secrets already leaked or existing clones.

## Security layers

### A. Identity and access
- Require strong password hashing (prefer Argon2id where operationally supported; otherwise use bcrypt with a reviewed cost factor).
- Store only hashes of random, high-entropy session and reset tokens.
- Use secure, HttpOnly, SameSite cookies; Secure in production.
- Rotate session identifiers after login and privilege changes; revoke sessions on logout, password reset and account compromise.
- Short expiry for reset/verification tokens, one-time use, generic reset responses and rate limits.
- Enforce MFA for super-admin and privileged operators; offer MFA/passkeys to users.
- Use step-up authentication for sensitive actions such as changing email, exporting data, changing roles or deleting an account.
- Apply least privilege and deny-by-default role/permission checks.

### B. Tenant and object-level authorization
- Treat campus/university as a tenant boundary.
- Every protected database query must scope by the authenticated user's permitted campus/tenant and object ownership.
- Never trust client-supplied userId, campusId, role, ownerId, isAdmin, price or permission fields.
- Enforce authorization in server-side service functions, not only in UI or route middleware.
- Add regression tests for IDOR/BOLA: changing an ID must never reveal another user's private record.
- Global discovery must respect explicit visibility settings and campus policies.

### C. API and browser protection
- HTTPS only; HSTS with appropriate production domain policy.
- Introduce a strict Content-Security-Policy after inventorying Next.js scripts, image/media hosts, analytics and upload providers. Prefer nonce-based CSP; start with report-only and fix violations before enforcement.
- Add a restrictive Permissions-Policy, Referrer-Policy, frame protection, nosniff and carefully tested CORS allowlist.
- Use CSRF defenses for cookie-authenticated state-changing requests.
- Validate request bodies with Zod on the server; enforce maximum body sizes and strict content types.
- Rate-limit login, registration, password reset, search, posting, comments, reactions, messaging, uploads and admin actions. Use shared/distributed rate limiting, not per-instance memory.
- Add bot and credential-stuffing defenses; avoid account enumeration.
- Avoid detailed stack traces and internal service names in production responses.

### D. Data and cryptography
- Keep database URLs, Supabase service-role keys, JWT signing keys, OAuth secrets, push private keys and storage credentials exclusively in host secret stores.
- Use separate least-privilege runtime and migration database credentials.
- Never expose privileged database access to the browser or mobile app.
- Encrypt transport and provider-managed data at rest; consider application-level envelope encryption for particularly sensitive fields with managed key rotation.
- Define retention, deletion, export and data residency policies.
- Backups must be encrypted, access-controlled, monitored and restore-tested.
- Use signed, short-lived upload/download URLs and private buckets for non-public content.
- Public CDN caching only for content explicitly marked public. Never cache authenticated API responses, private profiles, messages, tokens or academic records.

### E. Upload and media safety
- Validate actual file signatures/MIME, size, dimensions and duration; do not trust file extensions.
- Generate random storage keys; never use user filenames as paths.
- Scan uploads for malware where feasible; quarantine until checks complete.
- Re-encode images and transcode videos in isolated background workers.
- Prevent SVG/HTML active content from being served inline from the app origin; use safe content disposition and isolated media domain.
- Limit decompression bombs, archive extraction, oversized media and resource exhaustion.

### F. Infrastructure and supply chain
- Make GitHub repository Private; enforce MFA, least privilege, branch protection, reviews and required CI checks.
- Enable secret scanning, push protection and dependency vulnerability alerts where available.
- Rotate any secret ever committed to Git; rewriting history does not replace rotation.
- Pin and review dependencies, run automated vulnerability scans, generate an SBOM and use lockfile-based reproducible installs.
- Separate development, staging and production environments and credentials.
- Restrict production deploy permissions; require reviewed releases and rollback plans.
- Keep admin/control-plane endpoints on a separate access boundary, protected by MFA and IP/device policy where practical.
- Do not expose database or internal service ports publicly.

### G. Detection, resilience and response
- Centralize structured logs with request IDs; redact secrets, tokens, passwords, message bodies and unnecessary personal data.
- Alert on repeated failures, unusual session creation, privilege escalation, mass exports, suspicious data access, high error rates and resource exhaustion.
- Maintain immutable or access-restricted audit trails for privileged actions.
- Add DDoS/WAF protections at the edge where supported.
- Define incident severity, containment, credential rotation, notification and recovery playbooks.
- Test backups, restores, service failover and disaster recovery regularly.

### H. Mobile and reverse-engineering resistance
- Treat all client code as public. Browser bundles and mobile binaries can be inspected.
- Keep all secrets, privileged authorization and proprietary decision logic server-side.
- Use Android R8/ProGuard and release-only builds; protect local credentials with Android Keystore/iOS Keychain.
- Consider integrity/tamper signals as risk inputs, never as the sole authorization gate.
- Certificate pinning is optional and must include safe key rotation and recovery; TLS validation remains mandatory.
- Obfuscation raises reverse-engineering cost but cannot guarantee that code is impossible to inspect.

## Prioritized rollout

P0 — Immediate
1. Change GitHub repository visibility to Private and verify signed-out access is denied.
2. Audit Git history and rotate all exposed credentials.
3. Verify production secrets are not included in NEXT_PUBLIC variables, browser bundles, source maps, logs or mobile builds.
4. Confirm production backup and restore before schema or infrastructure changes.
5. Confirm admin access uses MFA and least privilege.

P1 — Application core
1. Audit every API route and server action for authentication, authorization, tenant scope and ownership.
2. Add shared rate limiting, CSRF protections where relevant, input validation and upload constraints.
3. Add security regression tests for IDOR/BOLA, privilege escalation, account enumeration and session revocation.
4. Review session lifecycle, password reset and MFA flows.
5. Add safe security headers and CSP in report-only mode, then enforce after testing.

P2 — Data and infrastructure
1. Separate runtime DB role from migration role.
2. Establish object storage private/public boundaries and signed URL lifecycle.
3. Add malware scanning/media processing pipeline.
4. Centralize logs, alerts, audit events and incident response.
5. Add dependency scanning, SBOM and deployment approvals.

P3 — Global scale
1. Distributed rate limiting and edge WAF.
2. Regional app cells with centrally managed identity and explicit data boundaries.
3. Tested backup/restore and disaster recovery across regions.
4. Independent penetration test and remediation before high-scale launch.

## Release gate

Do not claim "unhackable" or "50 million users supported". Release only after measurable security tests and load tests pass. Track vulnerabilities, p95/p99 latency, error rate, database saturation, backup restore time and incident response time. Any production change must preserve registration, login, campus membership, posts, comments, likes, messaging, notifications and user data.
