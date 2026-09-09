import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { postgraduatesListQuery } from '@entities/postgraduate';
import { POSTGRADUATE_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, SEARCH_PARAM, pageHref, parsePage, parseSearch } from '@shared/lib';

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
  const search = parseSearch(searchParams.get(SEARCH_PARAM));

  // В адресе счёт с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  //
  // Пустой запрос уходит как `undefined`, а не как пустая строка: axios
  // не кладёт незаданное в адрес, а `hashKey` роняет незаданное из ключа —
  // то есть «поиска нет» и «поиск пустой» остаются одним состоянием
  // с одним запросом, а не двумя.
  const query = useQuery(
    postgraduatesListQuery({ page: page - 1, q: search || undefined }),
  );

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;
  const answered = query.isSuccess && data !== undefined;

  return {
    postgraduates: data?.content ?? [],
    page,
    totalPages,

    /** Поисковый запрос из адреса; пустая строка — поиска нет. */
    search,
    /**
     * Сколько записей нашлось — с учётом запроса, а не всего в разделе.
     * Показывается только при поиске: над полным списком число дублирует
     * то, что и так видно пагинатором.
     *
     * Ноль сюда входит намеренно. Надпись живёт в `role="status"`, то есть
     * это единственное, что диктор скажет о результате набора; исчезни она
     * при пустой выдаче — читающий с экрана услышал бы «найдено четверо»,
     * дописал бы букву и не услышал ничего. Объяснение «ничего не найдено»
     * стоит ниже блоком, но блок не объявляется сам.
     */
    foundCount: answered && search !== '' ? data.totalElements : null,

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

    /**
     * Записей нет вовсе — не то же самое ни с «нет на этой странице»,
     * ни с «ничего не нашлось». Три пустоты выглядят одинаково, а значат
     * разное, и предлагают разное: подождать, вернуться на первую
     * страницу, изменить запрос.
     */
    isEmpty: answered && data.totalElements === 0 && search === '',
    /** Запрос набран, а записей под него нет. */
    isNotFound: answered && data.totalElements === 0 && search !== '',
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    /**
     * Адрес страницы списка. Запрос переживает перелистывание — иначе
     * «страница 2» показывала бы вторую страницу полного списка, и человек
     * терял бы поиск, не нажав ничего похожего на «сбросить».
     */
    hrefForPage: (target: number) =>
      pageHref(POSTGRADUATE_ROUTE, target, { [SEARCH_PARAM]: search || null }),

    /** Адрес полного списка: выход из «ничего не найдено» и сброс поиска. */
    hrefForAll: pageHref(POSTGRADUATE_ROUTE, 1),
  };
}
