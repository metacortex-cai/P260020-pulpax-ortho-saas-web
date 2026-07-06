# Frontend Parity

## Shared Areas

Check both `frontend-clinic` and `frontend-saas` for:

- Dental chart / odontogram components.
- Patient forms, tabs, lists, and detail pages.
- Treatment plan UI and duplicate treatment warnings.
- Calendar/randevu flows that display doctor and treatment context.
- Dashboards and reporting widgets that share metrics.

## Product UI Tone

- Dense but calm operational SaaS.
- Clear tables, filters, tabs, modals, and predictable navigation.
- No landing-page/marketing compositions inside logged-in app screens.
- Preserve glassmorphism only where already established; do not let it reduce readability.

## Regression Targets

- Login page renders and form fields work.
- Patient add/edit validation.
- Treatment plan add/edit, activation, status changes.
- Dental chart shows multiple treatments for the same tooth, merged surfaces, and overflow indicator.
- Calendar drag/drop or status changes keep treatment context intact.
