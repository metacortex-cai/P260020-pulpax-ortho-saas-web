# Security Testing

This repository includes a minimal security test workflow for dependency and package-level scanning.

## Root security check

Run this from the repo root:

```bash
npm run test:security
```

This executes `npm audit --audit-level=high` and will fail if high or critical vulnerabilities are detected.

## Recommended dynamic security scan

For OWASP Top 10 coverage, run a ZAP baseline scan against a running staging instance:

```bash
docker run --rm -v $(pwd):/zap/wrk -t owasp/zap2docker-stable \
  zap-baseline.py -t http://localhost:7001 -r zap-report.html
```

## Dependency scanning

Use Snyk if available:

```bash
npx snyk test
```

## Notes

- The root `test:security` script is a quick dependency audit.
- For full application security validation, add dynamic scans for the backend API and frontend application.
