import { http, HttpResponse } from 'msw';

import type { News, NewsPage } from '@shared/types';

import { problemResponse } from './problemResponse';

/**
 * Публичные ручки новостей, `*` вместо origin.
 *
 * Звёздочка нужна обоим применениям сразу: в тестах запрос уходит на origin
 * jsdom (`baseURL` пустой), а в браузере при `VITE_API_BASE_URL=http://localhost:8080`
 * — на порт бэкенда. Путь, записанный относительным, MSW разрешает от адреса
 * страницы и во втором случае не сработал бы.
 */
const PUBLIC_NEWS = '*/api/public/news';

/** Размер страницы по умолчанию — из контракта, а не из головы. */
const DEFAULT_SIZE = 20;

/**
 * Одна запись со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужен один заголовок, а не двенадцать полей DTO.
 */
export function makeNews(overrides: Partial<News> = {}): News {
  return {
    id: 1,
    title: 'Заголовок новости',
    shortDescription: 'Короткий анонс.',
    postType: 'news',
    previewImage: null,
    previewImageUrl: null,
    previewImageDescription: null,
    content: '<p>Текст новости.</p>',
    createdAt: '2026-08-20T10:15:30.123456+03:00',
    display: true,
    authorName: 'Иван Иванов',
    ...overrides,
  };
}

/**
 * Двадцать три записи — на одну больше, чем помещается на страницу.
 *
 * Число выбрано не случайно: при размере страницы 20 получается ровно две
 * страницы, то есть пагинатор рисуется, вторая страница неполная,
 * а `?page=3` попадает за пределы данных. Все три случая нужны тестам
 * ленты, и все три ломались бы на списке из трёх записей.
 */
export const newsFixture: readonly News[] = Array.from({ length: 23 }, (_, index) =>
  makeNews({
    id: index + 1,
    title: `Новость ${index + 1}`,
    // Новые сверху, как отдаёт контракт: день на запись, вниз по списку.
    createdAt: `2026-08-${String(23 - index).padStart(2, '0')}T10:15:30.123456+03:00`,
    postType: index % 4 === 0 ? 'announcements' : 'news',
  }),
);

/**
 * Страница списка по правилам Spring: `content` — срез, счётчики считаются
 * по всей выборке, а не по срезу.
 *
 * Страница за пределами данных — это `200` с пустым `content`, а не `404`
 * (docs/API.md, «Пагинация списков»). Именно на этом различии стоит ветка
 * `isOutOfRange` в модели ленты, и мок, отвечающий здесь ошибкой, проверял бы
 * несуществующее поведение.
 */
export function newsPage(items: readonly News[], page = 0, size = DEFAULT_SIZE): NewsPage {
  return {
    content: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  };
}

/**
 * Хендлеры чтения новостей. Список берётся аргументом, чтобы тест пустой
 * ленты был одной строкой `server.use(...newsHandlers([]))`, а не копией
 * хендлера с другим телом.
 *
 * Фильтра по `postType` здесь намеренно нет, хотя у ручки он появился
 * в T-36: сегодня фронт его не шлёт. Заводить его вместе с F-20 —
 * тогда же, когда появится тест, который его проверяет.
 */
export function newsHandlers(items: readonly News[] = newsFixture) {
  return [
    http.get(PUBLIC_NEWS, ({ request }) => {
      const url = new URL(request.url);

      return HttpResponse.json(
        newsPage(items, numberParam(url, 'page', 0), numberParam(url, 'size', DEFAULT_SIZE, 1)),
      );
    }),

    http.get(`${PUBLIC_NEWS}/:id`, ({ params }) => {
      const news = items.find((item) => String(item.id) === params.id);

      // Скрытая и несуществующая запись неразличимы — обе `404`.
      return news
        ? HttpResponse.json(news)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Новость не найдена',
            instance: `/api/public/news/${String(params.id)}`,
          });
    }),
  ];
}

/**
 * Числовой query-параметр или умолчание контракта.
 *
 * Отсутствие параметра проверяется отдельной строкой, а не через `Number`:
 * `Number(null)` — это ноль, целое и неотрицательное, то есть проверка
 * пропустила бы его как заданный размер страницы. Ровно на этом мок
 * и отдавал пустой список при живых двадцати трёх записях.
 */
function numberParam(url: URL, name: string, fallback: number, min = 0): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;

  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}
