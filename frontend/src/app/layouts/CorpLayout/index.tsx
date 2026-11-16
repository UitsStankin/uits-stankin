import { Outlet } from 'react-router';

import { useCorpSections } from './model/useCorpSections';
import { CorpSectionNav } from './ui/CorpSectionNav';

/**
 * Каркас личного кабинета `/corp`: вкладки разделов и место под раздел.
 *
 * Внутри общего лейаута, как и админка: шапка с меню профиля нужна и здесь.
 * Ширину задаёт сам раздел — профилю хватает узкой колонки, календарю
 * нужна вся строка, — поэтому вкладки стоят по центру и не привязаны
 * к краю ни одного из них.
 */
export default function CorpLayout() {
  const sections = useCorpSections();

  return (
    <div className="flex w-full flex-col gap-gutter">
      <CorpSectionNav sections={sections} />
      <Outlet />
    </div>
  );
}
