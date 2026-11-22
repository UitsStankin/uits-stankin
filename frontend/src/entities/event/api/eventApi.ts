import { api } from '@shared/api';
import type { Page, UserEvent } from '@shared/types';

const EVENTS_PATH = '/api/events';

/**
 * Страница — максимум контракта: больший `size` бэкенд молча урезает
 * до сотни (docs/API.md, «Пагинация списков»).
 */
const PAGE_SIZE = 100;

/**
 * Все события пользователя — свои и назначенные — одним массивом,
 * по возрастанию начала.
 *
 * **Читаются все страницы подряд.** Календарь показывает месяц, неделю
 * или день, а отбора по датам у ручки нет — только страницы по `startedAt`
 * (заявка B-13). Читать одну страницу нельзя: событие текущего месяца
 * оказалось бы на второй, если за прошлые годы их набралась сотня.
 * Выдача на одного человека — десятки событий в семестр, так что это
 * один-два запроса; с B-13 ручка станет принимать окно, и здесь
 * останется одна страница.
 *
 * Страницы — последовательно: `totalPages` известен только после первой.
 * Пустая страница останавливает обход, даже если счётчик обещает больше:
 * событие, удалённое между запросами, иначе сдвинуло бы счёт, и цикл
 * не закончился бы на странице за пределами данных.
 */
export async function fetchAllEvents(
  signal?: AbortSignal,
): Promise<UserEvent[]> {
  const events: UserEvent[] = [];

  for (let page = 0; ; page++) {
    const { data } = await api.get<Page<UserEvent>>(EVENTS_PATH, {
      params: { page, size: PAGE_SIZE },
      signal,
    });

    events.push(...data.content);

    if (data.content.length === 0 || page + 1 >= data.totalPages) return events;
  }
}
