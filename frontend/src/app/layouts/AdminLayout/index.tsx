import { Outlet } from 'react-router';

import { useAdminSections } from './model/useAdminSections';
import { AdminSectionNav } from './ui/AdminSectionNav';

/**
 * Каркас раздела админки: меню разделов и место под экран раздела.
 *
 * Живёт **внутри** общего лейаута портала, а не рядом с ним, — как
 * личный кабинет. Причина та же: шапка с меню профиля и выходом нужна
 * и здесь, а второй лейаут означал бы вторую шапку, которую придётся
 * чинить дважды. Шапка при этом рабочая, узкая (`Header` с `admin`),
 * а дорога обратно на портал — ссылка «На сайт» в ней.
 */
export default function AdminLayout() {
  const sections = useAdminSections();

  return (
    <div className="u-adm">
      <AdminSectionNav sections={sections} />

      {/* `min-w-0` — не украшение: без него широкая таблица растягивает
          колонку по своему содержимому и уносит в горизонтальную
          прокрутку страницу целиком вместо себя. */}
      <div className="u-adm-main">
        <div className="u-adm-page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
