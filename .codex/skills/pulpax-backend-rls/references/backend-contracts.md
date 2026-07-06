# Backend Contracts

## File Targets

- Backend app modules: `backend-*/src/modules/*`
- Shared/common backend helpers: `backend-*/src/common`
- Prisma root schema: `backend-*/prisma/schema.prisma`
- Tenant client schema: `backend-*/src/prisma/tenant-client/schema.prisma`
- RLS helpers/scripts: search for `apply-rls`, `RLS`, `tenant`, `current_tenant`, `clinicId`.

## Tenant Contract

- Every tenant record must include clinic/tenant ownership.
- Controllers must not trust client-provided tenant IDs without auth context verification.
- Services must scope reads and writes by tenant.
- RLS must be applied after schema/table changes.
- Cross-tenant admin operations belong to SaaS/master boundaries and need explicit authorization.

## Backend Business Contract

- Finance and protocol records use reversal and immutable history.
- Appointment creation needs conflict checks and idempotency.
- Treatment completion can trigger protocol, inventory movement, commission, reminders, finance, and Paraşüt effects.
- Queue-producing mutations should write outbox events inside the same transaction.
- Logs must include request/tenant/user context when available and must redact secrets/PII.
