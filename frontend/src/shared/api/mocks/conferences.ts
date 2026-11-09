import { http, HttpResponse } from 'msw';

import type { Conference, ConferenceRequest } from '@shared/types';

import { pageFromUrl, sortByCreatedAt } from './page';
import { problemResponse } from './problemResponse';

/**
 * Ручки конференций, `*` вместо origin — по той же причине, что у новостей:
 * в тестах запрос уходит на origin jsdom, в браузере
 * при `VITE_API_BASE_URL=http://localhost:8080` — на порт бэкенда.
 */
const PUBLIC_CONFERENCES = '*/api/public/conferences';
const CONFERENCES = '*/api/conferences';
const CONFERENCE_ITEM = '*/api/conferences/:id';

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
 * Двадцать пять объявлений: двадцать три опубликованных и два скрытых
 * черновика.
 *
 * Опубликованных двадцать три — на одно больше, чем помещается на страницу:
 * при размере 20 получается ровно две страницы, то есть пагинатор рисуется,
 * вторая страница неполная, а `?page=3` попадает за пределы данных.
 * Все три случая нужны тестам списка — по счёту, проверенному на ленте
 * новостей (`news.ts`).
 *
 * Каждое третье опубликованное — однодневное (`endDate: null`): оба
 * представления дат идут вперемешку, как в базе, и карточка, рисующая
 * диапазон у однодневной, выдала бы себя на первой же странице.
 *
 * Два черновика (`display: false`) появились с F-45 — по той же причине,
 * что у новостей с F-43: скрытых объявлений в моке не было вовсе, а это
 * половина того, ради чего у списка `GET /api/conferences` есть отдельная
 * ручка. Публичной части они не мешают — оттуда их отсекает тот же фильтр,
 * что и на бэкенде. Даты у них свежее остальных: черновик пишут прямо
 * сейчас, и в порядке по умолчанию ему место на первой странице админки.
 * У второго нет ни дат, ни времени — заготовка, которую завели раньше,
 * чем назначили день, и которая показывает колонку дат пустой.
 */
export const conferencesFixture: readonly Conference[] = [
  ...Array.from({ length: 23 }, (_, index) =>
    makeConference({
      id: index + 1,
      title: `Конференция ${index + 1}`,
      // Новые сверху, как отдаёт контракт: день на объявление, вниз по списку.
      createdAt: `2026-08-${String(28 - index).padStart(2, '0')}T12:00:00.000000+03:00`,
      startDate: `2026-10-${String(index + 1).padStart(2, '0')}`,
      endDate: index % 3 === 0 ? null : `2026-10-${String(index + 3).padStart(2, '0')}`,
    }),
  ),
  makeConference({
    id: 24,
    title: 'Черновик конференции',
    display: false,
    createdAt: '2026-08-29T12:00:00.000000+03:00',
  }),
  makeConference({
    id: 25,
    title: 'Черновик семинара',
    display: false,
    createdAt: '2026-08-30T12:00:00.000000+03:00',
    startDate: null,
    endDate: null,
    time: null,
  }),
];

/**
 * Конференции целиком: публичное чтение, модераторский список и правка.
 *
 * **Мок с состоянием и один на обе половины контракта** — как у новостей
 * (`news.ts`), и по той же причине: созданное в админке объявление
 * появляется в публичном списке, скрытое исчезает из него, удалённое
 * пропадает отовсюду. Двумя наборами с двумя копиями списка портал на моках
 * перестал бы быть одной системой.
 *
 * Список берётся аргументом, чтобы тест пустого раздела был одной строкой
 * `server.use(...conferenceHandlers([]))`, а не копией хендлера с другим телом.
 *
 * **Тесту, который что-то создаёт, правит или удаляет, нужен свой набор**
 * — `server.use(...conferenceHandlers())` в `beforeEach`: общий набор
 * (`handlers.ts`) собирается один раз на процесс, `resetHandlers` его
 * состояние не откатывает, и заведённое объявление досталось бы соседнему
 * файлу.
 *
 * Что мок повторяет из контракта, а что нет:
 *
 * - **фильтр `display`** у публичных ручек — да: скрытое объявление
 *   в списке не видно, а по прямой ссылке оно даёт `404`, неотличимый
 *   от несуществующего;
 * - **порядок** — да, у обоих списков: новые сверху по умолчанию
 *   и `?sort=createdAt,asc` в админке;
 * - **нормализация при сохранении** — да: `endDate`, равный `startDate`,
 *   сохраняется как `null`, секунды времени отбрасываются, пустое содержание
 *   становится `null`. Без этого строка таблицы после сохранения показывала
 *   бы не то, что лежит в базе, и форма, открытая второй раз, — тоже;
 * - **проверки полей** (связка дат, адрес почты, длины) и **проверка ключа
 *   обложки** — нет: первые повторяет схема формы, а отказ сервера тест
 *   заводит точечно — так же устроен мок новостей.
 */
export function conferenceHandlers(items: readonly Conference[] = conferencesFixture) {
  let current = [...items];
  let nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return [
    http.get(PUBLIC_CONFERENCES, ({ request }) => {
      // Скрытые отсекаются **до** нарезки на страницы: счётчики считаются
      // по выборке, и отбор после среза обещал бы страницы, которых нет.
      const visible = current.filter((item) => item.display);

      return HttpResponse.json(pageFromUrl(sortByCreatedAt(visible, null), new URL(request.url)));
    }),

    http.get(`${PUBLIC_CONFERENCES}/:id`, ({ params }) => {
      const conference = current.find((item) => String(item.id) === params.id);

      // Скрытое и несуществующее объявления неразличимы — оба `404`.
      return conference?.display
        ? HttpResponse.json(conference)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Объявление не найдено',
            instance: `/api/public/conferences/${String(params.id)}`,
          });
    }),

    http.get(CONFERENCES, ({ request }) => {
      const url = new URL(request.url);

      return HttpResponse.json(pageFromUrl(sortByCreatedAt(current, url.searchParams.get('sort')), url));
    }),

    http.post(CONFERENCES, async ({ request }) => {
      const body = (await request.json()) as ConferenceRequest;

      // `id` и дату создания проставляет сервер: форма их не шлёт и слать
      // не может.
      const created: Conference = {
        ...fromRequest(body),
        id: nextId++,
        createdAt: new Date().toISOString(),
      };

      current = [...current, created];

      return HttpResponse.json(created, {
        status: 201,
        headers: { Location: `/api/conferences/${String(created.id)}` },
      });
    }),

    http.put(CONFERENCE_ITEM, async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as ConferenceRequest;

      const existing = current.find((item) => item.id === id);
      if (!existing) return notFound(id);

      // Полная замена: всё, кроме `id` и даты создания, приходит из тела.
      // Поле, не пришедшее в запросе, обнуляется — на этом стоит правило
      // «форма отправляет все поля, включая незатронутые».
      const updated: Conference = { ...fromRequest(body), id, createdAt: existing.createdAt };
      current = current.map((item) => (item.id === id ? updated : item));

      return HttpResponse.json(updated);
    }),

    http.delete(CONFERENCE_ITEM, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((item) => item.id === id)) return notFound(id);

      current = current.filter((item) => item.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Тело запроса — в поля ответа, с нормализациями, которые делает сервер
 * (docs/API.md, «Конференции»). Адрес обложки собирает сервер и только
 * сервер: клиент отправляет ключ, а правило, по которому из ключа
 * получается адрес, принадлежит бэкенду.
 */
function fromRequest(body: ConferenceRequest): Omit<Conference, 'id' | 'createdAt'> {
  return {
    title: body.title,
    description: body.description,
    startDate: body.startDate,
    // У однодневной конференции одно представление — `endDate: null`.
    endDate: body.endDate === body.startDate ? null : body.endDate,
    // В ответе время всегда с точностью до минуты.
    time: body.time === null ? null : body.time.slice(0, 5),
    organizer: body.organizer,
    contactEmail: body.contactEmail,
    contactPhone: body.contactPhone,
    // Содержимое, вычищенное до пустоты, сохраняется как `null`.
    content: body.content === '' ? null : body.content,
    previewImage: body.previewImage,
    previewImageUrl: body.previewImage === null ? null : `/media/${body.previewImage}`,
    previewImageDescription: body.previewImageDescription,
    display: body.display,
  };
}

function notFound(id: number) {
  return problemResponse(404, {
    title: 'Not Found',
    detail: `Конференция id=${String(id)} не найдена`,
    instance: `/api/conferences/${String(id)}`,
  });
}
