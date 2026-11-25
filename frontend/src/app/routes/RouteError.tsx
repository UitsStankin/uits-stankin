import { useRouteError } from 'react-router';

import { HOME_ROUTE } from '@shared/config/routes';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

/* Подробности ошибки доступны в интерфейсе только в режиме разработки. */
export default function RouteError() {
  const error = useRouteError();

  // В консоль — всегда: без этого сбой на проде не оставляет следов вовсе,
  // а Sentry в проекте нет.
  console.error('Ошибка рендера страницы:', error);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <StatusBlock
        tone="danger"
        title="Страница не открылась"
        description={
          import.meta.env.DEV && error instanceof Error
            ? error.message
            : 'Что-то пошло не так. Попробуйте обновить страницу или вернуться на главную.'
        }
        action={<ActionLink to={HOME_ROUTE}>На главную</ActionLink>}
      />
    </div>
  );
}
