# Changelog

All notable changes to Pulpax will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.6] - 2026-07-06

### Added

- **Randevu Çakışma Onayı**: hekimin aynı saat diliminde başka aktif randevusu varsa artık sert engel yerine çakışan hasta bilgilerini gösteren bir onay modalı sunuluyor; kullanıcı onaylarsa (`force: true`) ikinci randevu oluşturulabiliyor (ünit/koltuk ve izin çakışmaları hâlâ sert engel).
- **Takvimde Yan Yana Gösterim**: aynı saat dilimine denk gelen randevular artık üst üste binmek yerine daraltılıp yan yana gösteriliyor (`CalendarGrid` overlap yerleşim algoritması).
- **Takvimi Yazdır**: tarih ve çoklu hekim seçimiyle günlük randevuları PDF/Excel olarak dışa aktarma (`PrintCalendarModal`, `exportDailyCalendar`).
- **Personel İşten Çıkış Devri**: atanmış randevu/hasta/tamamlanmamış tedavisi olan bir hekim işten çıkarılırken, bu kayıtları devralacak başka bir hekim seçimi zorunlu tutuluyor (`getTerminationImpact`, `deactivate` transfer akışı); doğrudan silme endpoint'i eklendi.
- **Personel Branş Seçimi**: doktor için Diş Hekimi, Cerrah, Ortodontist, Endodontist, Pedodontist, Periodontist, Protez Uzmanı, Restoratif seçeneklerinden oluşan Branş dropdown'u eklendi.
- **Profil Fotoğrafı**: hasta ve personel için fotoğraf yükleme/kaldırma desteği (multer config, `photo` endpoint'leri) ve detay sayfalarında 2 kat büyütülmüş, ortalanmış avatar alanı.

### Changed

- Hasta ve personel detay sayfaları aynı kutulu alan stiline (`InfoCard`) ve aynı daraltılabilir sol sekme menüsü yapısına kavuşturuldu.
- Personel Listesi tablosundan "Sicil" (UID) alanı kaldırıldı.
- Randevu mesai saati kontrolündeki Europe/Istanbul saat dilimi düzeltmesi için ek regresyon testleri eklendi.

## [1.1.5] - 2026-07-05

### Added

- **Users Module** (backend-clinic): new `users` module with create/update DTOs, controller, and service; `user.service.ts` added on frontend-clinic.
- **Employee Invite Flow**: `invite-employee.dto.ts` and supporting employees module changes.
- **Work Hours Tab**: new `WorkHoursTab.tsx` on the staff detail page, plus a reusable `Switch` UI component.
- New Prisma migrations `014`-`015` (employees table and employee FK relations).
- `Dockerfile.dev` added for backend-clinic and backend-saas; `docker-compose.yml` and existing Dockerfiles updated.
- ESLint/Prettier configuration added across all four services; CI workflow updated.

### Changed

- Employees module: repository layer removed in favor of direct service/Prisma usage; DTOs and controller updated.
- Auth, finance, inventory, lab, protocols, treatments, parasut, currency, email, and reminders modules updated (backend-clinic/backend-saas).
- Wide-ranging frontend updates across HR/staff, finance, inventory, lab, patients, appointments, and settings pages (frontend-clinic, frontend-saas).
- Generated Prisma tenant-client output is now gitignored instead of tracked.

## [1.1.4] - 2026-07-03

### Added

- **HR / Prim Module v2** (ADR-003): expanded employee profile (contact, education, official info), document upload (`multer-employee-document.config.ts`), and a prim (commission) reconciliation service (`prim-reconciliation.service.ts`).
- **Leave Management**: approval workflow (PENDING/APPROVED/REJECTED), entitlement balance tracking, full-day/description support for `EmployeeLeave`.
- **Appointments**: postpone action, notes, and work-hours validation (`check-work-hours.dto.ts`).
- **Lab Module**: new fields and an expanded movements page.
- **Calendar UI**: `MiniCalendar`, `LeaveModal`, `AppointmentPopover` components.
- New Prisma migrations `009`–`013` for the above (employee profile/contact/document, leave status/entitlement, lab extensions, prim engine v2, appointment postpone/work-hours, leave full-day/description).
- Added spec coverage for `employees.service`, `prim.service`, `lab.service`, `treatments.service`.

## [1.1.3] - 2026-07-03

### Security

- **Kritik**: Fixed a cross-tenant data isolation bypass — the client-supplied `X-Tenant-ID` request header could override the authenticated JWT's own `tenantId` claim, potentially allowing an authenticated user to access another clinic's physical database.
- **Kritik**: Fixed missing `clinicId` ownership checks (IDOR) on implant/diagnosis/prescription/note records and on appointment detail lookups.
- Removed hardcoded GitHub PAT tokens and `--force` push from `push-to-github.ps1`.
- Removed hardcoded `JWT_SECRET`/`ENCRYPTION_KEY` literals from `docker-compose.yml` / `docker-compose.app.yml`; both now read from `.env`.
- `.dockerignore` now excludes `.env`; production Docker image no longer bundles devDependencies.
- Removed `--accept-data-loss` from the tenant DB deploy command in `docker-compose.app.yml`.
- Added `UpdatePatientDto` / `UpdateAppointmentDto` with `class-validator` rules, replacing untyped `any` request bodies.

### Fixed

- Fixed a broken `tenant-leakage.spec.ts` isolation test (silently failing due to an `@nestjs/core`/`@nestjs/schedule` peer-dependency mismatch that also broke `npm ci` in CI).
- Wrapped appointment conflict-check + create/update in a single DB transaction to close a double-booking race condition.
- Batched N+1 write loops in payment allocation and treatment-item reallocation (`finance.service.ts`, `treatments.service.ts`) into `createMany` calls.
- Fixed 9 frontend TypeScript compile errors (`FinancialContractsTab.tsx`, `settings/clinic/page.tsx`, `tariffs/page.tsx`).
- Protocol CSV export no longer leaks unmasked TCKN when the user lacks view permission.
- Diagnosis tab bulk delete now requires confirmation, matching the Implants/Documents tabs.
- Fixed duplicate/inconsistent appointment status colors (`Onaylandı` vs `Tamamlandı`).

### Added

- Added `patients.service.spec.ts` and `appointments.service.spec.ts` covering cross-clinic IDOR denial and transactional conflict checks.
- Added `@@index([clinicId])` to `EmployeeLeave`, `EmployeeContract`, `PrimRecord`, `ParasutSyncLog`, and `@@index` to `MasterAuditLog`.
- Added a "Testleri Çalıştırma" section to `README.md`.

### Docs

- Corrected stale/inaccurate claims in `ai developer team/PULPAX_PROJECT_ASSESSMENT.md` and `TEAM_REPORT.md` (actual architecture is DB-per-tenant, not RLS; Sentry/Swagger/CI already exist).
- Fixed skill-file path references (`ai developer team/<role>.md`, `docs/ADR/`) across `team-leader.md`, `software-architect.md`, `backend-engineer.md`, `security-engineer.md`, `code-reviewer.md`, `qa-engineer.md`, `technical-writer.md`, `product-manager.md`, `frontend-engineer.md`.

## [1.1.2] - 2026-07-02

### Added

- **Payment/Refund/Statement Management**: New ödeme (payment), iade (refund), and ekstre (statement) management flows for patient finance.
- **Contract Payment Plan**: Sözleşme (contract) payment plan support.
- **Standard Delete Confirmation**: Consistent confirm-dialog pattern rolled out across destructive actions.
- Comprehensive `README.md` rewrite with architecture overview, setup guide, and version history.

### Fixed

- **Patient List Performance**: Patient list now uses server-side pagination/search/sort instead of fetching and re-filtering the full dataset client-side — resolves severe slowness with large patient counts (20,000+ records).
- **Diagnosis Tab Persistence**: Diagnosis tab selections are now persisted to the backend (new `ToothDiagnosis` model, endpoints, and frontend wiring) instead of being lost on navigation.
- Treatment plan locking and currency formatting corrections.

## [1.1.1] - 2026-06-30

### Fixed

- **Database Connection Issue**: Fixed `P1001` PrismaClientInitializationError (500 errors) caused by unreachable Docker tenant databases.
- Updated tenant `databaseUrl` connection strings from `localhost:5433` to `postgres:5432` to resolve internal Docker network resolution issues.
- Flushed Redis cache and rebuilt connection pools in `TenantPrismaService` to purge stale database URLs.
- Fixed `process.env.SEED_ADMIN_PASSWORD` typing in `backend-clinic/prisma/seed.ts` to resolve TypeScript compilation errors during database seeding.

## [1.1.0] - 2026-06-29

### Added

- **Standard Table Architecture**: All 30+ table pages now include a consistent search bar, filter dropdown, CSV export, sortable column headers (SortableHeader), and numbered pagination (« ‹ 1 2 3 › »)
- **Patient Tabs Standardization**: AppointmentsTab, ImplantsTab, PaymentsTab, PrescriptionsTab, LogTab, TreatmentsTab, and TreatmentPlansTab all brought to the standard table spec
- **Orthodontics ICON Score Tab**: New "Ortodonti" tab added to the patient detail page featuring the ICON (Index of Complexity, Outcome and Need) assessment form — 8 weighted sections (Aesthetic Component ×7, Upper Arch Crowding ×5, Upper Arch Spacing ×5, Crossbite ×5, Anterior Open Bite ×4, Anterior Deep Bite ×4, Buccal Relation Left ×3, Buccal Relation Right ×3) with real-time total calculation and colour-coded treatment-need evaluation
- **HR Module Enhancement**: Filter dropdown and CSV export added to `hr/staff` and `hr/leaves` pages
- **Finance Module Enhancement**: `finance/expenses`, `vaults-banks`, `candidates`, and `patient-current` pages standardized with search, filter, export, and numbered pagination
- **Inventory Module Enhancement**: `inventory/materials`, `fixtures`, `movements`, `suppliers`, and `status` pages standardized; `movements` page wired to the live StockMovement API (`InventoryService.getMovements`)
- **Lab Module Enhancement**: Export functionality added to `lab/labs`, `movements`, `procedures`, and `tariffs` pages
- **Settings Enhancement**: `settings/users` and `audit-logs` pages standardized
- **Support Module**: `support/tickets` page standardized
- **Additional Pages**: `tariffs`, `treatments` (TreatmentsView), `protocol`, `appointments/requests`, and `finance/FinancialTreatmentsTab` standardized

### Changed

- Pagination component across all table pages updated from "N/M" text format to numbered page buttons (« ‹ 1 2 3 › »)
- Per-page limit selector (10 / 25 / 50 / 100 rows) added to all table pages
- `inventory/movements` page migrated from static placeholder data to live API integration (`InventoryService.getMovements`)
- `inventory/suppliers` page converted from card-grid layout to table layout

## [1.0.0] - 2026-06-24

### Added

- Initial release: Multi-tenant dental clinic management system
- NestJS `backend-clinic` with PostgreSQL Row-Level Security (RLS) tenant isolation
- NestJS `backend-saas` for master-admin management
- Next.js `frontend-clinic`: patient, appointment, treatment, payment, HR, inventory, lab, and finance modules
- JWT authentication with HTTPS support
- Docker Compose orchestration for full-stack local and production deployment
- Prisma ORM with multi-tenant schema design
- AES-256-GCM encryption for sensitive patient data
- BullMQ async job processing for appointment reminders
- Protocol / USS integration module
- OWASP ZAP security scan baseline

[Unreleased]: https://github.com/metacortex-cai/pulpax-react-v.02/compare/v1.1.3...HEAD
[1.1.3]: https://github.com/metacortex-cai/pulpax-react-v.02/compare/v1.1.2...v1.1.3
[1.1.2]: https://github.com/metacortex-cai/pulpax-react-v.02/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/metacortex-cai/pulpax-react-v.02/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/metacortex-cai/pulpax-react-v.02/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/metacortex-cai/pulpax-react-v.02/releases/tag/v1.0.0
