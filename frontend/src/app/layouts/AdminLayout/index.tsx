import { Outlet } from 'react-router';

import { useAdminSections } from './model/useAdminSections';
import { AdminSectionNav } from './ui/AdminSectionNav';

/**
 * Каркас раздела админки: меню разделов и место под экран раздела.
 *
 * Живёт **внутри** общего лейаута портала, а не рядом с ним, — как
 * личный кабинет. Причина та же: шапка с меню профиля и выходом нужна
 * и здесь, а второй лейаут означал бы вторую шапку, которую придётся
 * чинить дважды. Заодно у модератора остаётся дорога обратно на портал
 * без кнопки «назад».
 *
 * Меню публичного портала при этом остаётся на месте: админка — раздел
 * того же сайта, а не другое приложение, и прятать навигацию портала,
 * пока правишь его содержимое, незачем.
 */
export default function AdminLayout() {
  const sections = useAdminSections();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-gutter lg:flex-row">
      <AdminSectionNav sections={sections} />

      {/* `min-w-0` — не украшение: без него широкая таблица растягивает
          колонку flex по своему содержимому и уносит в горизонтальную
          прокрутку страницу целиком вместо себя. */}
      <div className="min-w-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
