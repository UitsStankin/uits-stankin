import { Navigate } from 'react-router';

import type { AdminSection } from '@shared/config/adminNavigation';
import { PUBLICATION_MANAGE_ROUTE } from '@shared/config/routes';
import AdminHomePage from '@pages/admin/AdminHomePage';
import AdminNewsPage from '@pages/admin/NewsPage';
import SubjectsPage from '@pages/admin/SubjectsPage';
import AdminTeachersPage from '@pages/admin/TeachersPage';
import TeacherFormPage from '@pages/admin/TeacherFormPage';
import AdminHelpersPage from '@pages/admin/HelpersPage';
import AdminConferencesPage from '@pages/admin/ConferencesPage';
import AdminAchievementsPage from '@pages/admin/AchievementsPage';
import AdminEditablePagesPage from '@pages/admin/EditablePagesPage';
import EditablePageFormPage from '@pages/admin/EditablePageFormPage';
import UsersPage from '@pages/admin/UsersPage';
import AdminPostgraduatesPage from '@pages/admin/PostgraduatesPage';
import PostgraduateFormPage from '@pages/admin/PostgraduateFormPage';
import { GradesheetsPage } from './GradesheetRoutes';

const sections = {
  news: <AdminNewsPage />,
  conferences: <AdminConferencesPage />,
  achievements: <AdminAchievementsPage />,
  publications: <Navigate to={PUBLICATION_MANAGE_ROUTE} replace />,
  teachers: <AdminTeachersPage />,
  helpers: <AdminHelpersPage />,
  postgraduates: <AdminPostgraduatesPage />,
  gradesheets: <GradesheetsPage />,
  subjects: <SubjectsPage />,
  pages: <AdminEditablePagesPage />,
  users: <UsersPage />,
} satisfies Record<AdminSection['key'], React.ReactNode>;

export { AdminHomePage, EditablePageFormPage, PostgraduateFormPage, TeacherFormPage };

export default function AdminSectionScreen({ sectionKey }: { sectionKey: AdminSection['key'] }) {
  return sections[sectionKey];
}
