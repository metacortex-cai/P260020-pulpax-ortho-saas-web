---
name: pulpax-frontend-parity
description: Build or review Pulpax frontend work in Next.js, TypeScript, Tailwind, clinic UI, SaaS admin UI, clinical workflows, dental chart, treatment planning, patient forms, dashboards, command palette, calendar, and parity across frontend-clinic and frontend-saas. Use for UI, UX, component, form, state, API client, and Playwright regression work.
---

# Pulpax Frontend Parity

## Workflow

1. Determine whether the change belongs only to `frontend-clinic`, only to `frontend-saas`, or both.
2. For patient, treatment, dental chart, appointment, dashboard, reporting, or shared workflow changes, inspect both frontends before editing.
3. Keep clinical screens dense, scannable, and operational. Avoid marketing-style sections inside the product UI.
4. Preserve existing Next.js, Tailwind, component, store, and API-client conventions.
5. For forms, use the established validation style and keep backend DTO constraints in sync.
6. For dental chart and treatment logic, verify multi-treatment display, surface aggregation, duplicate warning behavior, and tooltip/list behavior.

Read `references/frontend-parity.md` for shared UI expectations and verification targets.

## UI Guardrails

- Use stable dimensions for charts, grids, tiles, toolbars, and icon buttons.
- Do not let text overlap or reflow controls unexpectedly on mobile or desktop.
- Prefer icon buttons with tooltips for clear tool actions.
- Keep SaaS admin views business-focused: MRR, clinics, licenses, SMS quota, support, security status, and integration health.
- Keep clinic views workflow-focused: patient, appointment, finance, HR, inventory, lab, reports, and clinical dashboards.

## Verification

- Run the narrowest available frontend checks first.
- For regression-sensitive clinic UI: `npm --prefix frontend-clinic run test:regression:docker`
- For local visual work, start the relevant dev server and inspect with the in-app browser when possible.
