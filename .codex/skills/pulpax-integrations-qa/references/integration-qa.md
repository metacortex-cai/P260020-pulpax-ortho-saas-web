# Integration QA

## TCMB Currency

- Public XML: `https://www.tcmb.gov.tr/kurlar/today.xml`
- EVDS is optional for historical range queries.
- Expected behavior: retry on fetch errors, parse XML, update Redis and DB, mark stale on holidays/weekends, never expose external fetch directly to browser.

## Ilac Rehberi Medication

- Public site has no stable official API in the docs.
- Expected behavior: rate-limited scraping/import, parser change detection, fallback to existing DB data, admin alert on parse failure.

## Parasut

- OAuth2 tenant-scoped connection.
- Store access/refresh tokens encrypted.
- Sync contacts, products, invoices, and payments through idempotent outbox/queue flows.
- Record sync status and external IDs in tenant-scoped logs.
- Retry 5xx/timeout/429; surface 422 validation errors for manual correction.

## Queues And Outbox

- Queue families include appointment, prim, parasut, currency, medication, sms, license, audit, backup, and notification.
- Event and DB mutation must commit together.
- Workers must be idempotent and retryable.
- Dead-letter paths should be inspectable from admin or logs.

## Security And Regression

- Use `SECURITY_FIX_PLAN.md`, `SECURITY_TESTING.md`, `zap.yaml`, and `zap-report.html` for security follow-up.
- Security assertions include httpOnly secure cookies, no fallback JWT/encryption secrets, strict CORS, rate limits, masked logs, and tenant isolation.
