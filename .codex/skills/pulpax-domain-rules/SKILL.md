---
name: pulpax-domain-rules
description: Apply Pulpax dental clinic business rules for patients, treatment plans, odontogram, appointments, finance, FIFO payments, advance payments, commissions, HR shifts and leaves, inventory FEFO, lab costs, tariffs, protocols, USS, RBAC, and KVKK. Use before changing any workflow that can affect clinical, financial, legal, or operational correctness.
---

# Pulpax Domain Rules

## Use The Rulebook

Load `references/domain-rulebook.md` when a task touches clinical or financial behavior. It summarizes BRD, LLD, and handover rules that must stay true in implementation.

## Non-Negotiables

- Treatment plan activation creates patient debt / contract truth.
- Treatment commission requires both completed treatment and collected payment; partial payments calculate partial commission.
- Payments allocate FIFO against completed treatments; unearned money remains advance until treatment completion.
- Completed protocols, USS-transferred records, locked invoices, audit records, tooth history, and commission records are immutable.
- Incorrect financial actions are reversed, not deleted.
- Appointments must block doctor/seat/shift conflicts and prevent scheduling during approved leave.
- Inventory consumption follows FEFO and ties material usage to treatment completion where applicable.
- Lab costs linked to treatment items can reduce doctor commission when the contract model requires it.
- Patient identifiers and exported protocol data must be masked according to role.

## Change Checklist

Before editing:

- Find the affected docs under `dev_documents/New_Saas_Pulpax_Project_Documents/*` and `docs/*`.
- Trace the flow through backend module, frontend screen, API contract, and tests.
- Identify whether the change affects only Clinic, only SaaS, or both.

After editing:

- Add focused tests for the business rule, especially boundary cases such as partial payments, duplicate treatments, leave conflicts, expired stock, and reversal flows.
