import { Link, useRouteError } from 'react-router';

import { HOME_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';

/**
 * Что показать вместо страницы, если её рендер упал.
 *
 * Появилось не из осторожности, а по факту: пока `authorName` в типах был
 * `string`, запись автора без имени и фамилии роняла `authorLabel` на
 * `.trim()`, и вместе с одной карточкой с экрана исчезал весь портал —
 * шапка, меню, подвал. Роутер данных в этом случае рисует собственный
 * экран со стеком вызовов: разработчику полезно, посетителю кафедры — нет.
 *
 * Граница стоит на страницах новостей. На остальных роутах её пока нет,
 * и это осознанный остаток, а не недосмотр: ставится она одной строкой
 * `errorElement`, но каждая страница должна сама решить, что показать
 * вместо себя. Пока страниц две, повторять нечего.
 *
 * Текст ошибки показывается только в разработке. На проде из него посетитель
 * ничего не узнает, а утечь может лишнее — имена полей, куски ответа.
 */
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
        action={
          <Link
            to={HOME_ROUTE}
            className="rounded bg-primary px-4 py-2 text-base font-bold text-white transition-colors hover:bg-primary/90"
          >
            На главную
          </Link>
        }
      />
    </div>
  );
}
