---
name: pulpax-project-context
description: Understand and work inside the Pulpax multi-tenant dental clinic SaaS repository. Use when Codex needs project onboarding, cross-service impact analysis, repo conventions, documentation navigation, workspace scripts, service ports, or coordination across backend-saas, backend-clinic, frontend-saas, and frontend-clinic.
---

# Pulpax Project Context

## Start Here

Read these files before non-trivial changes:

- `README.md` for repo layout and quick start.
- `PROJECT_STATE.md` for current implementation state and fixed ports.
- `GEMINI.md` for handover notes, recommended agents, and active conventions.
- `docs/Pulpax_Master_BRD.md` for business goals and constraints.
- `docs/Pulpax_API_Specification.md` for REST API contracts.
- `docs/Pulpax_High_Level_Design.md` and `docs/Pulpax_Low_Level_Design.md` for architecture and algorithms.

Use `references/repo-map.md` for a compact map of services, ports, and verification commands.

## Working Rules

- Treat Pulpax as four physically isolated apps: `backend-saas`, `backend-clinic`, `frontend-saas`, `frontend-clinic`.
- Preserve multi-tenant isolation. Any clinic-facing query or mutation must carry tenant context through API, service, Prisma, and PostgreSQL RLS layers.
- Keep SaaS admin and Clinic panel changes in parity when they touch shared clinical workflows, patients, treatment planning, dental chart, or reusable UI patterns.
- Favor existing module boundaries in `src/modules/*`; do not create cross-service coupling unless docs explicitly require it.
- Check current code before trusting older docs. Some architecture docs mention TypeORM/Vite, while the current repo uses NestJS + Prisma and Next.js.
- For security-sensitive changes, inspect `SECURITY_FIX_PLAN.md`, `SECURITY_TESTING.md`, `docs/SECURITY_SUMMARY.md`, and `zap-report.html` as needed.

## Verification

Choose focused commands:

- Root security: `npm run test:security`
- Backends: `npm --prefix backend-saas test`, `npm --prefix backend-clinic test`
- Frontend clinic E2E/regression: `npm --prefix frontend-clinic run test:e2e:docker` or `npm --prefix frontend-clinic run test:regression:docker`
- Dev cluster: `npm run dev`, or scope to `npm run dev:saas` / `npm run dev:clinic`

When dependencies or services are unavailable, report the exact blocked command and the missing prerequisite.
