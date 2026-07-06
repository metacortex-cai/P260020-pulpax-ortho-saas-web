---
name: pulpax-backend-rls
description: Implement or review Pulpax backend changes in NestJS, Prisma, PostgreSQL RLS, tenant isolation, auth, KVKK masking, encrypted patient data, idempotent mutations, queues, backend modules, and schema migrations. Use for backend-clinic, backend-saas, Prisma schema, RLS policy, service, controller, guard, worker, or repository work.
---

# Pulpax Backend RLS

## Workflow

1. Identify the service boundary: `backend-clinic` for tenant clinical operations, `backend-saas` for SaaS/master admin operations.
2. Inspect `package.json`, `src/modules/*`, `prisma/schema.prisma`, and `src/prisma/tenant-client/schema.prisma` before editing.
3. For tenant data, verify the path from auth/JWT to tenant context, Prisma query constraints, and RLS policy application.
4. For mutations, preserve idempotency keys on finance, appointment, invoice, payment, treatment completion, integration sync, and queue-producing actions.
5. For PII/KVKK fields, keep encryption, masking, and audit log redaction intact. Never log raw national IDs, tokens, passwords, credit card data, or OAuth secrets.
6. After schema changes, check both SaaS and Clinic schemas for duplication or divergence.

Read `references/backend-contracts.md` for backend invariants and common file targets.

## Critical Patterns

- Soft delete instead of physical delete for patient, finance, protocol, HR, inventory, and lab data.
- Reversal entries instead of destructive edits for locked financial/protocol records.
- Outbox + BullMQ for externally visible side effects such as SMS, reminders, commission, Paraşut, TCMB, medication sync, notifications, and audit.
- Snapshot historical names and contract versions where later edits must not rewrite history.
- Use DTO validation and typed services; avoid ad hoc raw SQL unless the RLS/policy task requires it and parameters are bound.

## Verification

- Backend SaaS: `npm --prefix backend-saas test`
- Backend Clinic: `npm --prefix backend-clinic test`
- Security audit: `npm run test:security:audit`
- For RLS changes, add or run tenant isolation tests that prove Tenant A cannot read/write Tenant B data.
