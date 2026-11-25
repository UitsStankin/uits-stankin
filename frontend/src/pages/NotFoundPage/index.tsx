import { HOME_ROUTE } from '@shared/config/routes';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Страница не найдена</h1>
      <StatusBlock
        title="Такой страницы нет"
        description="Проверьте адрес. Возможно, ссылка устарела или в ней опечатка."
        action={<ActionLink to={HOME_ROUTE}>На главную</ActionLink>}
      />
    </div>
  );
}
