import { lazy } from 'react';

export const GradesheetsPage = lazy(() => import('@pages/admin/GradesheetsPage'));
export const GradesheetPage = lazy(async () => ({
  default: (await import('@pages/admin/GradesheetsPage')).GradesheetPage,
}));
