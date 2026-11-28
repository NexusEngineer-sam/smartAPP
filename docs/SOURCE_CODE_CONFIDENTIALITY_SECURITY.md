# SAMWEL CAMPUS OS — Source Code Confidentiality & Application Security

Status: security requirements and implementation plan. This document itself does not change repository visibility, deploy code, or rotate credentials.

## Critical repository finding

At the time of this audit, GitHub reports `NexusEngineer-sam/smartAPP` visibility as `public`. Anyone may be able to browse and clone source files on the default branch. This directly conflicts with the requirement to keep proprietary source code private.

Immediate owner action: change repository visibility to Private in GitHub Settings > General > Danger Zone > Change repository visibility. Confirm the impact on collaborators, public links, GitHub Pages/actions, and integrations first. Verify the result by checking that GitHub reports visibility=private and that a signed-out browser cannot access the source. A private repo limits access but does not prevent authorized collaborators or leaked clones from disclosing code.

## Security objective

Keep proprietary server implementation, business rules, database access, credentials, signing keys, internal infrastructure details, and administrative functions unavailable to ordinary users. The public client must receive only the minimum code and data required to operate.

## Important limitation

Browser-delivered HTML, CSS, JavaScript, API routes, network requests, and Android/iOS client binaries can be inspected or reverse engineered. Minification, bundling, obfuscation, and native compilation increase effort but do not make client code impossible to inspect. Never put secrets or decisive authorization rules in client code.

## Required controls

### 1. Repository and developer access
- Make the source repository private.
- Enforce MFA/passkeys for owner and collaborators.
- Grant least-privilege collaborator access; remove unused access promptly.
- Protect the production branch with pull requests, required checks, and restricted direct pushes.
- Keep production and staging secrets out of Git, issue comments, logs, and build artifacts.
- Enable secret scanning and push protection where available.
- Review Git history for accidentally committed credentials. If any were exposed, revoke/rotate them; deleting a file in a later commit is not enough.

### 2. Server-side trust boundary
- Keep proprietary business logic, privileged database access, authorization decisions, signing keys, payment validation, moderation controls, and admin operations server-side.
- The client must never connect to PostgreSQL using privileged credentials.
- Use a restricted database role for runtime access; separate migration/admin credentials from application runtime credentials.
- Validate all inputs on the server and enforce ownership, campus membership, roles, and object-level authorization on every protected operation.
- Do not trust client-supplied role, campus ID, price, owner ID, or permission flags.
- Return minimal response fields; do not expose stack traces, internal hostnames, secret values, or debug endpoints.

### 3. API and edge security
- Enforce HTTPS.
- Apply rate limits and abuse controls to authentication, registration, search, posting, messaging, uploads, and password reset.
- Use secure session cookies (HttpOnly, Secure, appropriate SameSite), CSRF defenses where cookie authentication is used, and strict CORS allowlists.
- Validate origin and content type; limit request body and upload sizes.
- Use short-lived access tokens and rotate/revoke refresh sessions securely if token-based auth is used.
- Add bot protection and WAF rules where supported.
- Avoid relying on hidden endpoint URLs or API keys embedded in the app as security controls.

### 4. Database, files, and secrets
- Store credentials only in Render/Supabase secret or environment-variable facilities.
- Never expose service-role keys, database URLs, JWT signing secrets, OAuth client secrets, or storage admin keys to browser/mobile clients.
- Use signed, expiring upload/download URLs and private buckets for private student files.
- Keep public CDN caching restricted to explicitly public assets; never cache private API responses, messages, tokens, or personal records publicly.
- Encrypt backups and test restore procedures.

### 5. Mobile client hardening
- Ship release builds only; disable debug menus and verbose production logs.
- Use R8/ProGuard for Android where applicable and strip symbols from native release builds.
- Consider certificate/public-key pinning only with a safe rotation and recovery plan; pinning is not a substitute for TLS validation.
- Store local credentials in Android Keystore / iOS Keychain.
- Detect tampering/rooting only as a risk signal, not as the sole authorization mechanism.
- Keep all secrets and privileged logic off-device.

### 6. Monitoring and response
- Record security-relevant events without logging passwords, tokens, message contents, or sensitive personal data.
- Alert on repeated login failures, privilege changes, unusual API usage, suspicious exports, and secret access.
- Maintain a documented incident response and credential-rotation procedure.
- Run dependency and vulnerability scans; remediate critical/high findings before release.

## Rollout sequence

1. Urgently make the GitHub repository private and verify the change.
2. Audit repository history and rotate any exposed credentials; do not assume a visibility change invalidates existing clones or secrets.
3. Audit Render and Supabase environment variable names and exposure paths without printing secret values.
4. Confirm frontend bundle contains no privileged keys or proprietary server-only logic.
5. Review API authorization endpoint by endpoint, including campus tenant boundaries.
6. Add security headers, rate limiting, upload constraints, and safe logging.
7. Build hardened Android/iOS release artifacts and test reverse-engineering exposure.
8. Run security tests and regression tests before production deployment.

## Acceptance criteria

- GitHub repository visibility is Private and access is least-privilege.
- No active credentials exist in current source or accessible Git history; exposed credentials have been rotated.
- No privileged key appears in browser bundles, mobile binaries, source maps, or client network responses.
- Protected API endpoints enforce server-side authentication, authorization, ownership, and tenant boundaries.
- Private data cannot be fetched through public CDN URLs.
- Production errors and logs do not reveal secrets or internal stack traces.
- Security regression tests pass without breaking registration, login, posts, comments, messaging, notifications, and backup workflows.
