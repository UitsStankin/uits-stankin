import { http, HttpResponse } from 'msw';

import type { Conference } from '@shared/types';

import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';

/**
 * Публичные ручки конференций, `*` вместо origin — по той же причине,
 * что у новостей: в тестах запрос уходит на origin jsdom, в браузере
 * при `VITE_API_BASE_URL=http://localhost:8080` — на порт бэкенда.
 */
const PUBLIC_CONFERENCES = '*/api/public/conferences';

/**
 * Одно объявление со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужен один заголовок, а не пятнадцать полей DTO.
 *
 * Умолчание — двухдневная конференция со временем, организатором
 * и контактами: заполненный вариант, на котором видно всю карточку.
 * Пустоту (`null` во всём, кроме `title`) тест выражает переопределением —
 * это его сценарий, а не общий случай.
 */
export function makeConference(overrides: Partial<Conference> = {}): Conference {
  return {
    id: 1,
    title: 'Информационные технологии в промышленности',
    description: 'Ежегодная научно-практическая конференция кафедры.',
    startDate: '2026-10-14',
    endDate: '2026-10-16',
    time: '10:00',
    organizer: 'кафедра УИТС, МГТУ «СТАНКИН»',
    contactEmail: 'conf@stankin.ru',
    contactPhone: '+7 (499) 972-95-84',
    content: '<p>Приглашаем к участию.</p>',
    previewImage: null,
    previewImageUrl: null,
    previewImageDescription: null,
    createdAt: '2026-08-27T12:00:00.000000+03:00',
    display: true,
    ...overrides,
  };
}

/**
 * Двадцать три объявления — на одно больше, чем помещается на страницу:
 * при размере 20 получается ровно две страницы, то есть пагинатор рисуется,
 * вторая страница неполная, а `?page=3` попадает за пределы данных.
 * Все три случая нужны тестам списка — по счёту, проверенному на ленте
 * новостей (`news.ts`).
 *
 * Каждое третье объявление — однодневное (`endDate: null`): оба
 * представления дат идут вперемешку, как в базе, и карточка, рисующая
 * диапазон у однодневной, выдала бы себя на первой же странице.
 */
export const conferencesFixture: readonly Conference[] = Array.from(
  { length: 23 },
  (_, index) =>
    makeConference({
      id: index + 1,
      title: `Конференция ${index + 1}`,
      // Новые сверху, как отдаёт контракт: день на объявление, вниз по списку.
      createdAt: `2026-08-${String(28 - index).padStart(2, '0')}T12:00:00.000000+03:00`,
      startDate: `2026-10-${String(index + 1).padStart(2, '0')}`,
      endDate: index % 3 === 0 ? null : `2026-10-${String(index + 3).padStart(2, '0')}`,
    }),
);

/**
 * Хендлеры чтения конференций. Список берётся аргументом, чтобы тест пустого
 * раздела был одной строкой `server.use(...conferenceHandlers([]))`,
 * а не копией хендлера с другим телом.
 */
export function conferenceHandlers(items: readonly Conference[] = conferencesFixture) {
  return [
    http.get(PUBLIC_CONFERENCES, ({ request }) => {
      return HttpResponse.json(pageFromUrl(items, new URL(request.url)));
    }),

    http.get(`${PUBLIC_CONFERENCES}/:id`, ({ params }) => {
      const conference = items.find((item) => String(item.id) === params.id);

      // Скрытое и несуществующее объявления неразличимы — оба `404`.
      return conference
        ? HttpResponse.json(conference)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Объявление не найдено',
            instance: `/api/public/conferences/${String(params.id)}`,
          });
    }),
  ];
}
