---
name: pulpax-integrations-qa
description: Implement, review, or test Pulpax integrations and quality gates including TCMB currency, Ilac Rehberi medication sync, Parasut OAuth and invoice/payment sync, BullMQ queues, outbox events, reminders, SMS/email, ZAP security reports, npm audit, Playwright regression, load tests, observability, retries, dead-letter handling, and idempotency.
---

# Pulpax Integrations QA

## Workflow

1. Identify the integration: TCMB, Ilac Rehberi, Paraşüt, SMS/email, reminders, BullMQ worker, outbox poller, audit, load, or security.
2. Read `references/integration-qa.md` for endpoints, queues, failure modes, and test expectations.
3. Keep all external side effects idempotent and retryable.
4. Store OAuth/API secrets only in env/config and encrypted persistence where required.
5. Preserve tenant-scoped tokens and sync logs for Paraşüt.
6. Include dead-letter and admin visibility behavior for failed external calls.

## Quality Gates

- For dependency risk: `npm run test:security:audit`
- For ZAP workflow: see `SECURITY_TESTING.md` and `zap.yaml`
- For load: `npm run test:performance`
- For frontend regression: `npm --prefix frontend-clinic run test:regression:docker`
- For backend unit suites: `npm --prefix backend-saas test` and `npm --prefix backend-clinic test`

If Docker, OpenSSL, Redis, PostgreSQL, or service ports are missing, report the blocked gate and the prerequisite.
