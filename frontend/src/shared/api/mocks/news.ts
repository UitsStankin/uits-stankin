import { http, HttpResponse } from 'msw';

import type { News, NewsRequest, PostType } from '@shared/types';

import { pageFromUrl, pageResponse, numberParam, DEFAULT_PAGE_SIZE } from './page';
import { problemResponse } from './problemResponse';

/**
 * Ручки новостей, `*` вместо origin.
 *
 * Звёздочка нужна обоим применениям сразу: в тестах запрос уходит на origin
 * jsdom (`baseURL` пустой), а в браузере при `VITE_API_BASE_URL=http://localhost:8080`
 * — на порт бэкенда. Путь, записанный относительным, MSW разрешает от адреса
 * страницы и во втором случае не сработал бы.
 */
const PUBLIC_NEWS = '*/api/public/news';
const NEWS = '*/api/news';
const NEWS_ITEM = '*/api/news/:id';

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
 * Тридцать записей: двадцать восемь опубликованных и два скрытых черновика.
 *
 * Числа выбраны не случайно. Опубликованных двадцать восемь — двадцать три
 * новости вперемешку с пятью объявлениями. Двадцать три — на одну больше,
 * чем помещается на страницу: при размере 20 получается ровно две страницы,
 * то есть пагинатор рисуется, вторая страница неполная, а `?page=3` попадает
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
 *
 * Два черновика (`display: false`) добавлены с F-43: до админки скрытых
 * записей в моке не было вовсе, а это половина того, ради чего у списка
 * `GET /api/news` есть отдельная ручка. Публичной части они не мешают —
 * оттуда их отсекает тот же фильтр, что и на бэкенде, — зато в браузере
 * раздел админки сразу показывает обе колонки состояния. Даты у них свежее
 * остальных: черновик — это то, что пишут прямо сейчас, и в порядке
 * по умолчанию (новые сверху) он обязан быть виден на первой странице.
 */
export const newsFixture: readonly News[] = buildFixture();

function buildFixture(): readonly News[] {
  let news = 0;
  let announcements = 0;

  const published = Array.from({ length: 28 }, (_, index) => {
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

  return [
    ...published,
    makeNews({
      id: 29,
      title: 'Черновик новости',
      postType: 'news',
      display: false,
      createdAt: '2026-08-29T10:15:30.123456+03:00',
    }),
    makeNews({
      id: 30,
      title: 'Черновик объявления',
      postType: 'announcements',
      display: false,
      createdAt: '2026-08-30T10:15:30.123456+03:00',
    }),
  ];
}

/**
 * Новости целиком: публичное чтение, модераторский список и правка.
 *
 * **Мок с состоянием и один на обе половины контракта.** Созданная в админке
 * запись появляется в ленте, скрытая — исчезает из неё, удалённая пропадает
 * отовсюду. Двумя наборами хендлеров с двумя копиями списка это не проверить
 * и, что важнее, в браузере под `VITE_ENABLE_MOCKS` портал перестал бы быть
 * одной системой: модератор правил бы одни данные, а посетитель смотрел
 * на другие.
 *
 * Список берётся аргументом, чтобы тест пустой ленты был одной строкой
 * `server.use(...newsHandlers([]))`, а не копией хендлера с другим телом.
 *
 * Что мок повторяет из контракта, а что нет:
 *
 * - **фильтр `display`** — да, и это половина смысла отдельной админской
 *   ручки: `GET /api/public/news` отдаёт только опубликованные, а скрытая
 *   запись по прямой ссылке даёт `404`, неотличимый от несуществующей;
 * - **фильтр `?postType=`** — да, вместе с `400` на значение вне словаря;
 * - **порядок** — да, у обоих списков: новые сверху по умолчанию
 *   и `?sort=createdAt,asc` в админке, которая умеет менять его кликом
 *   по заголовку. Сортировки по другим полям нет: их не просит ни одна
 *   страница, а мок, отвечающий на то, чего не бывает, сторожил бы
 *   несуществующий код;
 * - **проверка ключа обложки и `429` на загрузке** — нет: то и другое
 *   заводится точечно в тесте, потому что зависит от состояния хранилища,
 *   которого у мока новостей нет.
 */
export function newsHandlers(items: readonly News[] = newsFixture) {
  let current = [...items];
  let nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return [
    http.get(PUBLIC_NEWS, ({ request }) => {
      const url = new URL(request.url);
      const refusal = refusePostType(url, '/api/public/news');
      if (refusal) return refusal;

      // Скрытые отсекаются **до** нарезки на страницы — по той же причине,
      // по которой до неё же отсекается тип: счётчики считаются по выборке,
      // и отбор после среза обещал бы страницы, которых нет.
      const visible = current.filter((item) => item.display);

      // Порядок — умолчание контракта, новые сверху. Пока список был
      // неизменяемой фикстурой, сортировать было нечего: она уже лежала
      // в нужном порядке. С появлением создания это перестало быть правдой —
      // новая запись дописывается в конец, — и лента показывала свежую
      // новость на последней странице (поймано в браузере).
      return HttpResponse.json(pageFromUrl(sortByCreatedAt(filterByType(visible, url), null), url));
    }),

    http.get(`${PUBLIC_NEWS}/:id`, ({ params }) => {
      const news = current.find((item) => String(item.id) === params.id);

      // Скрытая и несуществующая запись неразличимы — обе `404`.
      return news?.display
        ? HttpResponse.json(news)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Новость не найдена',
            instance: `/api/public/news/${String(params.id)}`,
          });
    }),

    http.get(NEWS, ({ request }) => {
      const url = new URL(request.url);
      const refusal = refusePostType(url, '/api/news');
      if (refusal) return refusal;

      const sorted = sortByCreatedAt(filterByType(current, url), url.searchParams.get('sort'));

      return HttpResponse.json(
        pageResponse(
          sorted,
          numberParam(url, 'page', 0),
          numberParam(url, 'size', DEFAULT_PAGE_SIZE, 1),
        ),
      );
    }),

    http.post(NEWS, async ({ request }) => {
      const body = (await request.json()) as NewsRequest;

      // `id`, дату и автора проставляет сервер: автора — по токену, дату —
      // при записи. Форма их не шлёт и слать не может.
      const created = makeNews({
        ...fromRequest(body),
        id: nextId++,
        createdAt: new Date().toISOString(),
        authorName: 'Иван Иванов',
      });

      current = [...current, created];

      return HttpResponse.json(created, {
        status: 201,
        headers: { Location: `/api/news/${String(created.id)}` },
      });
    }),

    http.put(NEWS_ITEM, async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as NewsRequest;

      const existing = current.find((item) => item.id === id);
      if (!existing) return notFound(`/api/news/${String(id)}`);

      // Полная замена: всё, кроме `id`, даты и автора, приходит из тела.
      // Поле, не пришедшее в запросе, обнуляется — на этом стоит правило
      // «форма отправляет все поля, включая незатронутые».
      const updated = { ...existing, ...fromRequest(body) };
      current = current.map((item) => (item.id === id ? updated : item));

      return HttpResponse.json(updated);
    }),

    http.delete(NEWS_ITEM, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((item) => item.id === id)) return notFound(`/api/news/${String(id)}`);

      current = current.filter((item) => item.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Тело запроса — в поля ответа. Адреса обложки собирает сервер и только
 * сервер: клиент отправляет ключ, а правило, по которому из ключа
 * получается адрес, принадлежит бэкенду (docs/API.md, «Обложка новости»).
 */
function fromRequest(body: NewsRequest): Partial<News> {
  return {
    title: body.title,
    shortDescription: body.shortDescription,
    postType: body.postType,
    previewImage: body.previewImage,
    previewImageUrl: body.previewImage === null ? null : `/media/${body.previewImage}`,
    previewImageDescription: body.previewImageDescription,
    content: body.content,
    display: body.display,
  };
}

function filterByType(items: readonly News[], url: URL): readonly News[] {
  const postType = url.searchParams.get('postType');

  return isPostType(postType) ? items.filter((item) => item.postType === postType) : items;
}

/**
 * Порядок по дате: новые сверху, если параметра нет, — как `@PageableDefault`
 * у контракта. Другие поля сюда не приходят: единственная сортируемая
 * колонка админского списка — дата (`useNewsAdmin`), а публичные ленты
 * порядка не выбирают вовсе и зовут эту функцию с `null`.
 */
function sortByCreatedAt(items: readonly News[], sort: string | null): readonly News[] {
  const asc = sort === 'createdAt,asc';

  return [...items].sort((a, b) => (asc ? 1 : -1) * a.createdAt.localeCompare(b.createdAt));
}

/**
 * Значение `postType` вне словаря — `400`, а не пустая страница: опечатка
 * `?postType=announcement` иначе читалась бы как «объявлений пока нет»,
 * и причину искали бы в контенте (docs/API.md, «Новости: фильтр по типу
 * записи»). Мок, отвечающий здесь пустотой, скрыл бы ровно ту ошибку,
 * ради которой контракт выбрал ошибку.
 */
function refusePostType(url: URL, instance: string) {
  const postType = url.searchParams.get('postType');

  if (postType === null || postType === '' || isPostType(postType)) return null;

  return problemResponse(400, {
    title: 'Bad Request',
    detail: `Недопустимое значение postType: ${postType}`,
    instance,
  });
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

function notFound(instance: string) {
  return problemResponse(404, { title: 'Not Found', detail: 'Новость не найдена', instance });
}
