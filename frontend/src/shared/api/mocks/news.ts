import { http, HttpResponse } from 'msw';

import type { News, PostType } from '@shared/types';

import { pageFromUrl } from './page';
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
 * Двадцать восемь записей: двадцать три новости вперемешку с пятью
 * объявлениями.
 *
 * Числа выбраны не случайно. Двадцать три — на одну больше, чем помещается
 * на страницу: при размере 20 получается ровно две страницы, то есть
 * пагинатор рисуется, вторая страница неполная, а `?page=3` попадает
 * за пределы данных. Все три случая нужны тестам ленты, и все три сломались бы
 * на списке из трёх записей. Двадцать три — это счёт **после фильтра**
 * по `postType`, потому что именно так лента новостей и ходит с F-20.
 *
 * Пять объявлений — чтобы витрине главной было что отрезать: она просит
 * четыре (`size=4`), и на списке из четырёх запрос «дай первые четыре»
 * прошёл бы одинаково при любой ошибке в размере страницы.
 *
 * Нумерация в заголовках сквозная **внутри своего типа**: «Новость 1..23»
 * и «Объявление 1..5». Так тест видит и порядок, и границу страницы,
 * не заглядывая в `id`, — а перепутанный фильтр выдал бы себя сразу,
 * заголовком не того слова.
 */
export const newsFixture: readonly News[] = buildFixture();

function buildFixture(): readonly News[] {
  let news = 0;
  let announcements = 0;

  return Array.from({ length: 28 }, (_, index) => {
    // Каждая пятая — объявление: типы вперемешку, как в базе, а не двумя
    // блоками. Список, отсортированный по типу, скрыл бы ошибку «фильтр
    // не ушёл в запрос» — первая страница и так состояла бы из новостей.
    const isAnnouncement = index % 5 === 4;
    const number = isAnnouncement ? ++announcements : ++news;

    return makeNews({
      id: index + 1,
      title: isAnnouncement ? `Объявление ${number}` : `Новость ${number}`,
      postType: isAnnouncement ? 'announcements' : 'news',
      // Новые сверху, как отдаёт контракт: день на запись, вниз по списку.
      createdAt: `2026-08-${String(28 - index).padStart(2, '0')}T10:15:30.123456+03:00`,
    });
  });
}

/**
 * Хендлеры чтения новостей. Список берётся аргументом, чтобы тест пустой
 * ленты был одной строкой `server.use(...newsHandlers([]))`, а не копией
 * хендлера с другим телом.
 */
export function newsHandlers(items: readonly News[] = newsFixture) {
  return [
    http.get(PUBLIC_NEWS, ({ request }) => {
      const url = new URL(request.url);
      const postType = url.searchParams.get('postType');

      // Значение вне словаря — `400`, а не пустая страница: опечатка
      // `?postType=announcement` иначе читалась бы как «объявлений пока нет»,
      // и причину искали бы в контенте (docs/API.md, «Новости: фильтр
      // по типу записи»). Мок, отвечающий здесь пустотой, скрыл бы ровно
      // ту ошибку, ради которой контракт выбрал ошибку.
      if (postType !== null && postType !== '' && !isPostType(postType)) {
        return problemResponse(400, {
          title: 'Bad Request',
          detail: `Недопустимое значение postType: ${postType}`,
          instance: '/api/public/news',
        });
      }

      // Отбор **до** нарезки на страницы: счётчики считаются по выборке
      // с учётом фильтра, иначе мок обещал бы страницы, которых нет,
      // — то же самое, чем плоха фильтрация на клиенте.
      const filtered = isPostType(postType)
        ? items.filter((item) => item.postType === postType)
        : items;

      return HttpResponse.json(pageFromUrl(filtered, url));
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
 * Значение `postType` из адреса — из словаря контракта или нет.
 *
 * Отсутствие параметра и пустая строка сюда попадают как «нет»: обе означают
 * «все типы», то есть отбирать по ним нечего.
 */
function isPostType(raw: string | null): raw is PostType {
  return raw === 'news' || raw === 'announcements';
}
