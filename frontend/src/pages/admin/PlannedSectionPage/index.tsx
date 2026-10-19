import type { AdminSection } from '@shared/config/adminNavigation';
import { ADMIN_ROUTE } from '@shared/config/routes';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

/**
 * Раздел админки, экран которого ещё не написан.
 *
 * Одна страница на все такие разделы: они отличаются только названием.
 * Заглушка портала (`pages/Placeholder`) сюда не годится — та говорит
 * «страница ещё не перенесена» про публичный раздел старого сайта.
 */
export default function PlannedSectionPage({ section }: { section: AdminSection }) {
  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="u-page-title">{section.title}</h1>

      <StatusBlock
        title="Раздел скоро появится"
        description="Он ещё готовится. Пока править здесь нечего."
        action={<ActionLink to={ADMIN_ROUTE}>К началу</ActionLink>}
      />
    </div>
  );
}
