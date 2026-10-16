import { http, HttpResponse } from 'msw';

import type { Helper, HelperRequest } from '@shared/types';

import { DEFAULT_PAGE_SIZE, numberParam, pageResponse } from './page';
import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const PUBLIC_HELPERS = '*/api/public/helpers';
const HELPERS = '*/api/helpers';

/**
 * Карточка УВП со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужна одна фамилия, а не весь DTO. Умолчания — пример
 * из docs/API.md («УВП»).
 */
export function makeHelper(overrides: Partial<Helper> = {}): Helper {
  return {
    id: 1,
    lastName: 'Кузнецова',
    firstName: 'Анна',
    patronymic: 'Сергеевна',
    position: 'инженер кафедры',
    avatar: null,
    avatarUrl: null,
    ...overrides,
  };
}

/**
 * ФИО по алфавиту фамилий. У одной сотрудницы отчества нет вовсе:
 * контракт разрешает `null`, и склейка ФИО обязана не дописывать « null»
 * к имени.
 */
const NAMES: readonly (readonly [string, string, string | null])[] = [
  ['Агафонов', 'Виктор', 'Николаевич'],
  ['Боброва', 'Людмила', 'Ивановна'],
  ['Ветрова', 'Наталья', 'Павловна'],
  ['Глухов', 'Андрей', 'Семёнович'],
  ['Дементьева', 'Ксения', 'Артёмовна'],
  ['Ерёмин', 'Олег', 'Владимирович'],
  ['Жарова', 'Тамара', null],
  ['Зуев', 'Аркадий', 'Петрович'],
  ['Иванова', 'Мария', 'Сергеевна'],
  ['Калинин', 'Егор', 'Данилович'],
  ['Ларина', 'Юлия', 'Викторовна'],
  ['Мельников', 'Семён', 'Ильич'],
  ['Носова', 'Алина', 'Глебовна'],
  ['Осипов', 'Тимур', 'Маратович'],
  ['Панова', 'Евгения', 'Робертовна'],
  ['Рыбаков', 'Глеб', 'Аркадьевич'],
  ['Савельева', 'Нина', 'Фёдоровна'],
  ['Титов', 'Лев', 'Борисович'],
  ['Ушакова', 'Оксана', 'Дмитриевна'],
  ['Фомин', 'Руслан', 'Айратович'],
  ['Цветкова', 'Лидия', 'Степановна'],
  ['Шубин', 'Матвей', 'Игоревич'],
  ['Юдина', 'Валерия', 'Константиновна'],
];

/** Должности из жизни УВП: словаря у поля нет, это свободный текст. */
const POSITIONS = ['инженер кафедры', 'ведущий инженер', 'лаборант', 'методист'];

/**
 * Двадцать три карточки УВП — на одну больше, чем помещается на страницу.
 * При размере 20 это ровно две страницы: пагинатор рисуется, вторая
 * страница неполная, а `?page=3` попадает за пределы данных. Числа
 * и причины те же, что у фикстур новостей и ППС.
 *
 * Порядок — **по фамилии**, как отдаёт контракт по умолчанию: фикстура,
 * перемешанная как попало, врала бы про сортировку.
 *
 * Данные правдоподобные — тем же набором пользуется браузер под
 * `VITE_ENABLE_MOCKS`. Крайние случаи заведены нарочно: без отчества,
 * с фотографией и без.
 */
export const helpersFixture: readonly Helper[] = buildHelpers();

function buildHelpers(): readonly Helper[] {
  return NAMES.map(([lastName, firstName, patronymic], index) =>
    makeHelper({
      id: index + 1,
      lastName,
      firstName,
      patronymic,
      position: POSITIONS[index % POSITIONS.length],
      // Фото есть у первого — в списке проверяется, что адрес идёт
      // в `src`, а не подменяется заглушкой. Ключ и адрес — из примера
      // docs/API.md.
      avatarUrl: index === 0 ? '/media/avatars/2026/08/c7d1.jpg' : null,
      avatar: index === 0 ? 'avatars/2026/08/c7d1.jpg' : null,
    }),
  );
}

/**
 * Карточки УВП целиком: публичное чтение и модераторский CRUD.
 *
 * Мок **с состоянием**, как у карточек ППС и новостей: заведённая карточка
 * появляется в списке, правка видна там же, удалённая исчезает. Один набор
 * на две роли — разведённые, чтение и правка стали бы двумя разными
 * выдумками.
 *
 * Проекции вроде `teacherListItem` здесь нет: карточка целиком помещается
 * в элементе списка, форма у ручки одна. По той же причине нет и хендлера
 * `GET /api/public/helpers/{id}`: контракт заводил эту ручку для формы
 * правки — «без неё карточку приходилось искать в списке постранично», —
 * но форме админки искать не приходится, вся карточка уже в строке
 * таблицы. Хендлер под ручку, на которую никто не ходит, сторожил бы
 * ненаписанный код.
 *
 * Сортировка `?sort=` — по двум полям карточки, на ней стоит проверка
 * смены порядка в разделе.
 */
export function helperHandlers(items: readonly Helper[] = helpersFixture) {
  let current = [...items];
  let nextId = current.reduce((max, helper) => Math.max(max, helper.id), 0) + 1;

  const notFound = (instance: string) =>
    problemResponse(404, { title: 'Not Found', detail: 'Сотрудник не найден', instance });

  return [
    http.get(PUBLIC_HELPERS, ({ request }) => {
      const url = new URL(request.url);
      const sorted = sortHelpers(current, url.searchParams.get('sort'));

      return HttpResponse.json(
        pageResponse(
          sorted,
          numberParam(url, 'page', 0),
          numberParam(url, 'size', DEFAULT_PAGE_SIZE, 1),
        ),
      );
    }),

    http.post(HELPERS, async ({ request }) => {
      const body = (await request.json()) as HelperRequest;
      const created = cardFromRequest(makeHelper({ id: nextId++ }), body);

      current = [...current, created];

      return HttpResponse.json(created, { status: 201 });
    }),

    http.put(`${HELPERS}/:id`, async ({ params, request }) => {
      const id = Number(params.id);
      const existing = current.find((helper) => helper.id === id);

      if (!existing) return notFound(`/api/helpers/${String(params.id)}`);

      const body = (await request.json()) as HelperRequest;
      const updated = cardFromRequest(existing, body);

      current = current.map((helper) => (helper.id === id ? updated : helper));

      return HttpResponse.json(updated);
    }),

    http.delete(`${HELPERS}/:id`, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((helper) => helper.id === id)) {
        return notFound(`/api/helpers/${String(params.id)}`);
      }

      current = current.filter((helper) => helper.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Карточка из тела запроса. Адрес фото собирает сервер по ключу — здесь
 * это делает мок, ровно как хранилище: префикс `/media`. Форма отправляет
 * ключ и получает обратно пару «ключ и адрес», а мок, возвращающий
 * присланное тело, отдал бы карточку без `avatarUrl` — и предпросмотр
 * в списке молча опустел бы после сохранения.
 */
function cardFromRequest(base: Helper, body: HelperRequest): Helper {
  return {
    ...base,
    ...body,
    avatarUrl: body.avatar === null ? null : `/media/${body.avatar}`,
  };
}

/**
 * Порядок — тот же, что у Spring: `lastName`, затем `firstName`, затем
 * `id` (`@PageableDefault`). Причины те же, что у карточек ППС: уникальный
 * последний ключ не даёт однофамильцам меняться местами между запросами,
 * а `localeCompare` не уносит «Ё» за «Я».
 */
function sortHelpers(items: readonly Helper[], sort: string | null): readonly Helper[] {
  const [field, direction] = (sort ?? '').split(',');
  const sign = direction === 'desc' ? -1 : 1;
  const primary = field === 'position' ? 'position' : 'lastName';

  return [...items].sort(
    (a, b) =>
      sign *
      (a[primary].localeCompare(b[primary], 'ru') ||
        a.lastName.localeCompare(b.lastName, 'ru') ||
        a.firstName.localeCompare(b.firstName, 'ru') ||
        a.id - b.id),
  );
}
