import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { teachersListQuery } from '@entities/teacher';
import { TEACHERS_ROUTE, teacherRoute } from '@shared/config/routes';
import { PAGE_PARAM, pageHref, parsePage } from '@shared/lib';

/**
 * Список ППС: какая страница открыта, что на ней и куда ведут карточки.
 * Разметка об этом ничего не знает.
 *
 * Состояния те же шесть, что у ленты новостей, и считаются так же —
 * подробный разбор каждого лежит в `widgets/NewsFeed/model/useNewsList.ts`
 * и не повторяется здесь. Модель своя, а не общий хук с лентой: у новостей
 * в запрос уходит раздел (`postType`), а адрес и ключ кэша у списков
 * разные — общего осталось бы ровно на пересчёт номера страницы, который
 * и так вынесен в `shared/lib/pageParam.ts`.
 *
 * **Номер страницы живёт в адресе, а не в `useState`.** Список пересылают
 * ссылкой и возвращаются в него кнопкой «назад»; состояние в памяти
 * компонента всё это теряет.
 */
export function useTeacherList() {
  const [searchParams] = useSearchParams();
  const page = parsePage(searchParams.get(PAGE_PARAM));

  // В адресе счёт с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(teachersListQuery({ page: page - 1 }));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    teachers: data?.content ?? [],
    page,
    totalPages,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: сетка притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Карточек нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) => pageHref(TEACHERS_ROUTE, target),
    hrefForTeacher: teacherRoute,
  };
}
