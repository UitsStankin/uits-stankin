import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { newsListQuery } from '@entities/news';
import { NEWS_ROUTE, newsItemRoute } from '@shared/config/routes';

/** Имя query-параметра со страницей. Знают двое: разбор ниже и сборка адреса. */
const PAGE_PARAM = 'page';

/**
 * Вся логика ленты новостей: какая страница открыта, что на ней и куда ведут
 * ссылки. Разметка об этом ничего не знает.
 *
 * **Номер страницы живёт в адресе, а не в `useState`.** Ленту пересылают
 * ссылкой, открывают в новой вкладке и возвращаются в неё кнопкой «назад» —
 * состояние в памяти компонента всё это теряет, а `?page=3` переживает
 * и перезагрузку, и историю браузера.
 *
 * **В адресе счёт с единицы, в запросе — с нуля.** Пользователю показывается
 * человеческая нумерация (`?page=0` выглядит поломкой), контракту нужна
 * спринговая. Пересчёт сделан ровно в одном месте — здесь; это то самое
 * место, где список молча съезжает на одну страницу, если развести его
 * по разным файлам (`shared/types/api.types.ts`).
 */
export function useNewsList() {
  const [searchParams] = useSearchParams();
  const page = parsePage(searchParams.get(PAGE_PARAM));

  const query = useQuery(newsListQuery({ page: page - 1 }));

  // Прокрутки здесь нет намеренно, хотя пагинатор стоит внизу и без сброса
  // читатель остался бы у подвала: сбросом занимается <ScrollRestoration>
  // на лейауте — для него переход на `?page=2` обычная новая запись
  // в истории, а такие он открывает сверху.
  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    items: data?.content ?? [],
    page,
    totalPages,

    /** Первая загрузка: показывать скелет. Перелистывание сюда не попадает. */
    isLoading: query.isLoading,
    /**
     * Запрос **приостановлен**, и показать пока нечего.
     *
     * Пауза — третье состояние Query помимо загрузки и ошибки, и молчать
     * о нём нельзя: `status` остаётся `pending`, а `fetchStatus` уходит
     * в `paused`, то есть не выставлены ни `isLoading`, ни `isError`.
     * Без этой ветки страница показывала бы один заголовок и пустоту под ним
     * — так лента и выглядела с погашенным бэкендом, пока ветки не было.
     *
     * На паузу повтор ставят две причины: браузер сообщил, что сети нет
     * (`networkMode: 'online'`), либо вкладка ушла в фон — retryer ждёт
     * и возвращения сети, и возвращения фокуса. Вторая причина пользователю
     * не видна по определению: на неё некому смотреть. Поэтому текст
     * говорит о связи.
     *
     * Кнопка «Повторить» рядом стоит, но чуда не делает: пока причина паузы
     * не ушла, `refetch` встаёт на ту же паузу. Она для случая, когда связь
     * уже вернулась, а Query об этом ещё не сообщили.
     */
    isOffline: query.isPaused && data === undefined,
    /**
     * На экране прошлая страница, пока едет следующая. Список на это время
     * притушивается — иначе перелистывание выглядит так, будто клик не сработал.
     */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** Новостей нет вовсе — не то же самое, что «нет на этой странице». */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /**
     * Страница за пределами данных. Контракт отвечает на это `200` с пустым
     * `content`, а не ошибкой, — то есть отличить такой случай от пустой
     * ленты можно только по `totalPages`, и решение принимается здесь.
     */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage,
    hrefForItem: newsItemRoute,
  };
}

/**
 * Номер страницы из адреса. Всё, что не похоже на номер, — первая страница.
 *
 * `?page=abc`, `?page=-1`, `?page=2.5` приходят от людей, правящих адрес
 * руками, и от чужих ссылок. Отвечать на это ошибкой незачем: показать
 * первую страницу — ровно то, чего от ленты ждут.
 */
function parsePage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1;
}

function hrefForPage(page: number): string {
  // Первая страница — без параметра: `?page=1` в адресе ничего не добавляет,
  // зато раздваивает канонический адрес ленты на два разных.
  return page <= 1 ? NEWS_ROUTE : `${NEWS_ROUTE}?${PAGE_PARAM}=${page}`;
}
