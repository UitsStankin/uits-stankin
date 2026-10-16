import { ADMIN_ROUTE } from '@shared/config/routes';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

/**
 * Адрес внутри админки, которого нет.
 *
 * Заглушка портала («Страница ещё не перенесена») сюда не годится
 * и до F-40 попадала: снаружи она честна — публичных страниц старого
 * сайта и вправду перенесено меньше половины, — а внутри `/admin`
 * врёт. Разделов ровно девять, все они перечислены в
 * `shared/config/adminNavigation.ts`, и ненаписанный экран говорит
 * о себе сам (`PlannedSectionPage`). Значит, всё остальное — не «ещё
 * не сделано», а опечатка в адресе или ссылка, оставшаяся от старого
 * названия раздела.
 */
export default function UnknownSectionPage() {
  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Раздел не найден</h1>

      <StatusBlock
        title="Такого раздела нет"
        description="Проверьте адрес: возможно, ссылка устарела или в ней опечатка."
        action={<ActionLink to={ADMIN_ROUTE}>Ко всем разделам</ActionLink>}
      />
    </div>
  );
}
