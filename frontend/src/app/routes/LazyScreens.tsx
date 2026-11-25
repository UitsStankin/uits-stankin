import { lazy } from 'react';

export const AdminSectionScreen = lazy(() => import('./AdminScreens'));
export const AdminHomePage = lazy(async () => ({ default: (await import('./AdminScreens')).AdminHomePage }));
export const TeacherFormPage = lazy(async () => ({ default: (await import('./AdminScreens')).TeacherFormPage }));
export const PostgraduateFormPage = lazy(async () => ({ default: (await import('./AdminScreens')).PostgraduateFormPage }));
export const EditablePageFormPage = lazy(async () => ({ default: (await import('./AdminScreens')).EditablePageFormPage }));

export const PublicationEditorPage = lazy(async () => ({
  default: (await import('@pages/PublicationsPage/Management')).PublicationEditorPage,
}));
export const PublicationTagsPage = lazy(async () => ({
  default: (await import('@pages/PublicationsPage/Management')).PublicationTagsPage,
}));
export const PublicationScholarPage = lazy(async () => ({
  default: (await import('@pages/PublicationsPage/Management')).PublicationScholarPage,
}));
