import type { AdminSection } from '@shared/config/adminNavigation';
import { ADMIN_ROUTE } from '@shared/config/routes';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

/**
 * Раздел админки, экран которого ещё не написан.
 *
 * Одна страница на все восемь: они отличаются названием и номером тикета,
 * а показывать им пока нечего. Заглушка портала (`pages/Placeholder`)
 * сюда не годится — та говорит «страница ещё не перенесена» про публичный
 * раздел старого сайта, а здесь речь о работе, которая запланирована
 * и названа по номеру.
 */
export default function PlannedSectionPage({ section }: { section: AdminSection }) {
  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">{section.title}</h1>

      <StatusBlock
        title="Раздел ещё не сделан"
        description={`Экран управления появится с тикетом ${section.plannedIn ?? 'блока 4'}. Пока данные правятся через API.`}
        action={<ActionLink to={ADMIN_ROUTE}>Ко всем разделам</ActionLink>}
      />
    </div>
  );
}
