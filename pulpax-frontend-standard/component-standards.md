# Component Standards

## UI/UX Guidelines
- **Skeletons**: Use for initial loading states in tabs and tables.
- **Modals**: Use the shared `Modal` component from `src/components/ui/Modal.tsx`.
- **Buttons**: Follow Metronic classes (`btn-primary`, `btn-light-danger` etc.).
- **Consistency**: Keep layout and interactions identical between Clinic and SaaS frontends.

## Perceived Performance
Always provide visual feedback for async actions:
- `isSaving` state for buttons.
- `isLoading` state for data-heavy sections.
- Toast messages for success/failure.
