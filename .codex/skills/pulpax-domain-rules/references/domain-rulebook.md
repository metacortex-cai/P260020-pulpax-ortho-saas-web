# Pulpax Domain Rulebook

## Roles

- Superadmin/clinic manager: full clinic settings, finance, reports, critical cancellations, tariff changes.
- Doctor: own patients, calendar, treatment flow, own performance and commission reports.
- Assistant: appointment support and stock material consumption during treatment.
- Reception/secretary: patient intake, appointment traffic, payment/front desk flows.

## Clinical Rules

- FDI tooth notation is expected for dental chart work: adult `11-48`, primary `51-85`.
- A tooth can have multiple active treatments. UI must aggregate surfaces and show multi-treatment indicators.
- Duplicate treatment warning is Tooth + Procedure + Surface based.
- Completed treatment triggers downstream finance/stock/commission effects.

## Finance Rules

- Activated treatment plan becomes the source of patient debt.
- Payments are allocated FIFO to completed treatments.
- Advance payments remain unearned until the related treatment is completed.
- Commission requires completed treatment and collected payment.
- Partial collections produce proportional commission.
- Locked invoices are reversed, not deleted.

## Operations Rules

- Appointments check doctor, unit/chair, working hours, and approved leave.
- HR contracts are versioned; commission must use the contract version valid at the relevant time.
- Inventory follows FEFO and tracks batch/lot/expiration/critical stock.
- Lab work orders link to treatment items and can affect net-profit commission.
- Tariffs reference immutable central SUT/procedure catalog entries while clinics can define local pricing.

## Compliance Rules

- KVKK masking applies to national ID, patient identity, logs, and user-visible fields according to role.
- Audit logs and historical snapshots must preserve original actor, doctor, patient-visible labels, and amounts.
