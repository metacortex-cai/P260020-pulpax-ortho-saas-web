'use client';

import { ReactNode } from 'react';

// NOTE: SaasMetronicLayout is intentionally NOT applied here.
//
// Every page under (saas)/ wraps itself individually in <SaasMetronicLayout>
// because each page passes its own per-page props (title, breadcrumbs,
// headerAction). Moving the wrapper here would require a shared context
// (e.g. a SaasLayoutContext) so child pages can inject those props from
// below — a non-trivial refactor touching all 7+ pages.
//
// TODO: introduce a SaasLayoutContext and centralise the wrapper here
// once that context exists, then remove the individual SaasMetronicLayout
// usages from each child page.
export default function SaasLayout({ children }: { children: ReactNode }) {
  return children;
}
