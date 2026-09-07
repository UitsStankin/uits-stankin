import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { postgraduatesListQuery } from '@entities/postgraduate';
import { POSTGRADUATE_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, pageHref, parsePage } from '@shared/lib';

/**
 * Список аспирантов: какая страница открыта и что на ней. Разметка
 * об этом ничего не знает.
 *
 * Состояния те же шесть, что у ленты новостей и списков ППС и УВП,
 * и считаются так же — подробный разбор каждого лежит в
 * `widgets/NewsFeed/model/useNewsList.ts` и не повторяется здесь.
 * Модель своя по той же причине, что у остальных списков: адрес и ключ
 * кэша у них разные, а общего осталось бы ровно на пересчёт номера
 * страницы, который и так вынесен в `shared/lib/pageParam.ts`.
 *
 * **Номер страницы живёт в адресе, а не в `useState`.** Список пересылают
 * ссылкой и возвращаются в него кнопкой «назад»; состояние в памяти
 * компонента всё это теряет.
 */
export function usePostgraduateList() {
  const [searchParams] = useSearchParams();
  const page = parsePage(searchParams.get(PAGE_PARAM));

  // В адресе счёт с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(postgraduatesListQuery({ page: page - 1 }));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    postgraduates: data?.content ?? [],
    page,
    totalPages,

    /**
     * Номер первой строки страницы — сквозной по всему списку, а не
     * от единицы на каждой: в оригинале пагинации не было вовсе,
     * и колонка «№» считала от начала списка. Двадцать первая запись
     * обязана остаться двадцать первой и на второй странице, иначе
     * номер перестаёт быть номером.
     *
     * Считается по **ответу**, а не по адресу: `size` в ответе — тот,
     * который применил сервер (запрошенный больше сотни он молча урезает),
     * а `page` при перелистывании ещё описывает ту страницу, которую
     * видно на экране, — `keepPreviousData` держит её до прихода
     * следующей. Арифметика по адресу разошлась бы со строками
     * в обоих случаях.
     */
    firstRowNumber: data ? data.page * data.size + 1 : 1,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: таблица притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Записей нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) => pageHref(POSTGRADUATE_ROUTE, target),
  };
}
