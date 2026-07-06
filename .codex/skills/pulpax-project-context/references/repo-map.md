# Pulpax Repo Map

## Services

- `backend-saas`: NestJS SaaS/master admin API. Current port in project state: `6010`.
- `backend-clinic`: NestJS clinic API. Current port in project state: `7010`.
- `frontend-saas`: Next.js SaaS master admin app. Port `6001`.
- `frontend-clinic`: Next.js clinic app. Port `7001`.
- `docker-compose.yml`: PostgreSQL 15 and Redis 7.
- `certs/`: local HTTPS certificates expected as `localhost.key` and `localhost.crt`.

## Important Docs

- `PROJECT_STATE.md`: latest handover and module completion state.
- `GEMINI.md`: active conventions and recommended agents.
- `docs/Pulpax_Master_BRD.md`: business rules and stakeholders.
- `docs/Pulpax_API_Specification.md`: REST API contract.
- `docs/Pulpax_Low_Level_Design.md`: domain entities, DTOs, algorithms.
- `dev_documents/New_Saas_Pulpax_Project_Documents/*`: module-specific Turkish functional docs.

## Root Scripts

- `npm run install:all`
- `npm run setup:https`
- `npm run dev`
- `npm run dev:saas`
- `npm run dev:clinic`
- `npm run test:functional`
- `npm run test:regression`
- `npm run test:performance`
- `npm run test:security`
