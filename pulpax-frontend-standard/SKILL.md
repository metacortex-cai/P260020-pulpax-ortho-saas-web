---
name: pulpax-frontend-standard
description: Technical standards and architectural patterns for Pulpax frontend applications (Clinic & SaaS). Use when refactoring components, implementing new features, or maintaining parity between frontends.
---

# Pulpax Frontend Standard

## Overview

This skill ensures that Pulpax frontend development follows consistent architectural patterns, prioritizing maintainability, performance, and multi-tenant security.

## Core Patterns

### 1. API Abstraction Layer
Separate API calls from UI components into dedicated service files.
- **Location**: `src/lib/services/`
- **Reference**: See [api-pattern.md](references/api-pattern.md) for implementation details.
- **Goal**: Centralize data fetching, error handling, and type safety.

### 2. Form Management (React Hook Form + Zod)
Use React Hook Form for state management and Zod for schema-based validation.
- **Reference**: See [form-pattern.md](references/form-pattern.md) for boilerplate and validation rules.
- **Goal**: Reduce boilerplate and ensure type-safe form inputs.

### 3. UI/UX Standards
Consistent use of Metronic theme components and accessibility patterns.
- **Skeleton Screens**: Use during data fetching to improve perceived performance.
- **Toast Notifications**: Standardized feedback using `toastStore`.
- **Reference**: See [component-standards.md](references/component-standards.md).

## Workflow Decision Tree

1. **New Feature?**
   - Define types in `src/types/`.
   - Create API service in `src/lib/services/`.
   - Build UI components using `src/components/ui/`.
2. **Refactoring?**
   - Move inline API calls to `src/lib/services/`.
   - Extract complex form logic to React Hook Form.
3. **Parity Check?**
   - Ensure changes are applied to both `frontend-clinic` and `frontend-saas`.
