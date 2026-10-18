import { HOME_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink } from '@shared/ui/StatusAction';

/**
 * ВРЕМЕННАЯ заглушка вместо ещё не перенесённой страницы.
 *
 * Удаляется вместе с последним роутом, который её использует,
 * по мере переноса страниц со старого Angular-портала.
 */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <StatusBlock
        title={title}
        description="Пока загляните на главную: там есть расписание, новости и преподаватели."
        action={<ActionLink to={HOME_ROUTE}>На главную</ActionLink>}
      />
    </div>
  );
}
