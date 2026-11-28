# SAMWEL CAMPUS OS — Continuous Quality Gate

The GitHub Actions quality workflow runs on pushes and pull requests to `main`,
on a weekly schedule, and on manual request.

It validates the Prisma schema, generates the Prisma client, type-checks the
application, builds the production app, and audits production dependencies.
If database secrets are configured in GitHub, it also checks database connectivity.

## Engineering self-review loop

For every meaningful upgrade:
1. Inspect the affected user journey and related API/database paths.
2. Identify the highest-impact defect or missing capability.
3. Make the smallest safe change that fixes the root cause.
4. Run the quality gate and inspect the deployment result.
5. Re-check mobile layout, accessibility, security, and failure states.
6. Record anything blocked by missing third-party credentials instead of
   pretending the feature is operational.

The workflow is a continuous automated quality gate. It does not independently
generate and deploy AI-authored product features; that requires a separately
configured and authorized coding agent.
