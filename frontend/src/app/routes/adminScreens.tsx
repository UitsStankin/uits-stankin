import { lazy } from 'react';

export const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
export const AdminHomePage = lazy(() => import('@pages/admin/AdminHomePage'));
export const PlannedSectionPage = lazy(() => import('@pages/admin/PlannedSectionPage'));
export const AdminNewsPage = lazy(() => import('@pages/admin/NewsPage'));
export const UnknownSectionPage = lazy(() => import('@pages/admin/UnknownSectionPage'));
export const SubjectsPage = lazy(() => import('@pages/admin/SubjectsPage'));
export const AdminTeachersPage = lazy(() => import('@pages/admin/TeachersPage'));
export const TeacherFormPage = lazy(() => import('@pages/admin/TeacherFormPage'));
export const AdminHelpersPage = lazy(() => import('@pages/admin/HelpersPage'));
