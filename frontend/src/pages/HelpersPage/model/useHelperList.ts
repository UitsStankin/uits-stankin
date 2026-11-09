import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { helpersListQuery } from '@entities/helper';
import { HELPERS_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, pageHref, parsePage } from '@shared/lib';

/**
 * Список УВП: какая страница открыта и что на ней. Разметка об этом
 * ничего не знает.
 *
 * Состояния те же шесть, что у ленты новостей и списка ППС, и считаются
 * так же — подробный разбор каждого лежит в
 * `widgets/NewsFeed/model/useNewsList.ts` и не повторяется здесь. Модель
 * своя по той же причине, что у ППС: адрес и ключ кэша у списков разные,
 * а общего осталось бы ровно на пересчёт номера страницы, который и так
 * вынесен в `shared/lib/pageParam.ts`.
 *
 * **Номер страницы живёт в адресе, а не в `useState`.** Список пересылают
 * ссылкой и возвращаются в него кнопкой «назад»; состояние в памяти
 * компонента всё это теряет.
 */
export function useHelperList() {
  const [searchParams] = useSearchParams();
  const page = parsePage(searchParams.get(PAGE_PARAM));

  // В адресе счёт с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(helpersListQuery({ page: page - 1 }));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    helpers: data?.content ?? [],
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

    hrefForPage: (target: number) => pageHref(HELPERS_ROUTE, target),
  };
}
