import { http, HttpResponse } from 'msw';

import type { Achievement, AchievementRequest } from '@shared/types';

import { pageFromUrl, sortByCreatedAt } from './page';
import { problemResponse } from './problemResponse';
import { teachersFixture } from './teachers';

/**
 * Ручки достижений, `*` вместо origin — по той же причине, что у новостей:
 * в тестах запрос уходит на origin jsdom, в браузере
 * при `VITE_API_BASE_URL=http://localhost:8080` — на порт бэкенда.
 */
const PUBLIC_ACHIEVEMENTS = '*/api/public/achievements';
const PUBLIC_TEACHER_ACHIEVEMENTS = '*/api/public/teachers/:teacherId/achievements';
const ACHIEVEMENTS = '*/api/achievements';
const ACHIEVEMENT_ITEM = '*/api/achievements/:id';

/**
 * Одно достижение со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужен один заголовок, а не десять полей DTO.
 *
 * Умолчание — достижение, привязанное к преподавателю: пара
 * `teacherId` / `teacherName` — единственное, что у этой сущности бывает
 * пустым, и заполненный вариант показывает карточку целиком. Кафедральное
 * достижение тест выражает переопределением — это его сценарий,
 * а не общий случай.
 */
export function makeAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 1,
    title: 'Победа в конкурсе «Инженер года»',
    description: 'Преподаватель кафедры стал лауреатом всероссийского конкурса.',
    content: '<p>Награда присуждена за работы в области автоматизации.</p>',
    previewImage: 'achievements/2026/08/b41e.jpg',
    previewImageUrl: '/media/achievements/2026/08/b41e.jpg',
    createdAt: '2026-08-27T12:00:00.000000+03:00',
    display: true,
    teacherId: 1,
    teacherName: 'Абрамов Никита Сергеевич',
    ...overrides,
  };
}

/**
 * Кому раздаются достижения по кругу. `null` — кафедральное достижение,
 * без привязки к преподавателю.
 *
 * Идентификаторы и ФИО — первых трёх карточек ППС из `teachers.ts`,
 * а не выдуманные: тем же набором моков пользуется браузер под
 * `VITE_ENABLE_MOCKS`, и «Преподаватель 2» под достижением на живой
 * с виду карточке выглядел бы поломкой. По этим же `id` ходит блок
 * достижений на карточке преподавателя.
 */
const OWNERS: readonly ({ id: number; name: string } | null)[] = [
  null,
  { id: 1, name: 'Абрамов Никита Сергеевич' },
  { id: 2, name: 'Андреева Ольга Викторовна' },
  null,
  { id: 3, name: 'Баранов Илья Матвеевич' },
  { id: 1, name: 'Абрамов Никита Сергеевич' },
];

/**
 * Двадцать пять достижений: двадцать три опубликованных и два скрытых
 * черновика.
 *
 * Опубликованных двадцать три — на одно больше, чем помещается на страницу:
 * при размере 20 получается ровно две страницы, то есть пагинатор рисуется,
 * вторая страница неполная, а `?page=3` попадает за пределы данных.
 * Все три случая нужны тестам списка — по счёту, проверенному на ленте
 * новостей (`news.ts`).
 *
 * Каждое третье опубликованное — кафедральное (`teacherId: null`):
 * привязанные и непривязанные идут вперемешку, как в базе, и карточка,
 * рисующая подпись преподавателя без проверки, выдала бы себя на первой
 * же странице.
 *
 * Два черновика (`display: false`) появились с F-45 — по той же причине,
 * что у новостей и конференций: без скрытых записей админской ручке нечего
 * показывать сверх публичной. Первый привязан к преподавателю — блок
 * на его карточке обязан черновик не видеть, — второй кафедральный. Даты
 * у обоих свежее остальных: в порядке по умолчанию черновик виден в админке
 * первым.
 */
export const achievementsFixture: readonly Achievement[] = [
  ...Array.from({ length: 23 }, (_, index) => {
    const owner = OWNERS[index % OWNERS.length];

    return makeAchievement({
      id: index + 1,
      title: `Достижение ${index + 1}`,
      description: `Краткое описание достижения ${index + 1}.`,
      // Новые сверху, как отдаёт контракт: день на запись, вниз по списку.
      createdAt: `2026-08-${String(28 - index).padStart(2, '0')}T12:00:00.000000+03:00`,
      teacherId: owner?.id ?? null,
      teacherName: owner?.name ?? null,
    });
  }),
  makeAchievement({
    id: 24,
    title: 'Черновик достижения',
    description: 'Ждёт подтверждения от организаторов конкурса.',
    display: false,
    createdAt: '2026-08-29T12:00:00.000000+03:00',
    teacherId: 2,
    teacherName: 'Андреева Ольга Викторовна',
  }),
  makeAchievement({
    id: 25,
    title: 'Черновик гранта',
    description: 'Заявка кафедры на грант.',
    display: false,
    createdAt: '2026-08-30T12:00:00.000000+03:00',
    teacherId: null,
    teacherName: null,
  }),
];

/**
 * Достижения целиком: публичное чтение (раздел, одно достижение, блок
 * на карточке ППС), модераторский список и правка.
 *
 * **Мок с состоянием и один на обе половины контракта** — как у новостей
 * и конференций: созданное в админке достижение появляется в разделе
 * и на карточке своего преподавателя, скрытое исчезает из обоих мест,
 * удалённое пропадает отовсюду.
 *
 * Список берётся аргументом, чтобы тест пустого раздела был одной строкой
 * `server.use(...achievementHandlers([]))`. **Тесту, который что-то
 * создаёт, правит или удаляет, нужен свой набор** — общий собирается
 * один раз на процесс, и заведённое досталось бы соседнему файлу.
 *
 * Что мок повторяет из контракта, а что нет:
 *
 * - **фильтр `display`** у всех трёх публичных ручек — да, включая блок
 *   на карточке ППС: там тоже только опубликованные;
 * - **неизвестный преподаватель в блоке карточки** даёт пустую страницу,
 *   а не `404`: ручка фильтрует достижения по ссылке, а не проверяет
 *   карточку (docs/API.md, «Достижения кафедры»);
 * - **порядок** — да: новые сверху по умолчанию и `?sort=createdAt,asc`
 *   в админке;
 * - **имя преподавателя** собирается при сохранении из ФИО карточки,
 *   как на сервере, а ссылка на несуществующую карточку — `400` одним
 *   `detail`, как у `TeacherService.getTeacherEntity`. Карточки берутся
 *   из фикстуры ППС, а не из изменяемого мока преподавателей, и это
 *   осознанный шов: карточка, заведённая в админке на моках, здесь
 *   неизвестна. Свести два мока значило бы завести между ними общее
 *   состояние ради случая, которого не проверяет ни один тест;
 * - **проверки полей и ключа обложки** — нет: первые повторяет схема
 *   формы, отказ сервера тест заводит точечно.
 */
export function achievementHandlers(items: readonly Achievement[] = achievementsFixture) {
  let current = [...items];
  let nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;

  return [
    http.get(PUBLIC_ACHIEVEMENTS, ({ request }) => {
      // Скрытые отсекаются **до** нарезки на страницы: счётчики считаются
      // по выборке, и отбор после среза обещал бы страницы, которых нет.
      const visible = current.filter((item) => item.display);

      return HttpResponse.json(pageFromUrl(sortByCreatedAt(visible, null), new URL(request.url)));
    }),

    http.get(`${PUBLIC_ACHIEVEMENTS}/:id`, ({ params }) => {
      const achievement = current.find((item) => String(item.id) === params.id);

      // Скрытое и несуществующее достижения неразличимы — оба `404`.
      return achievement?.display
        ? HttpResponse.json(achievement)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Достижение не найдено',
            instance: `/api/public/achievements/${String(params.id)}`,
          });
    }),

    http.get(PUBLIC_TEACHER_ACHIEVEMENTS, ({ request, params }) => {
      const teacherId = Number(params.teacherId);
      const mine = current.filter((item) => item.display && item.teacherId === teacherId);

      return HttpResponse.json(pageFromUrl(sortByCreatedAt(mine, null), new URL(request.url)));
    }),

    http.get(ACHIEVEMENTS, ({ request }) => {
      const url = new URL(request.url);

      return HttpResponse.json(pageFromUrl(sortByCreatedAt(current, url.searchParams.get('sort')), url));
    }),

    http.post(ACHIEVEMENTS, async ({ request }) => {
      const body = (await request.json()) as AchievementRequest;

      const teacherName = resolveTeacherName(body.teacherId);
      if (teacherName === undefined) return unknownTeacher(body.teacherId, '/api/achievements');

      // `id` и дату создания проставляет сервер.
      const created: Achievement = {
        ...fromRequest(body, teacherName),
        id: nextId++,
        createdAt: new Date().toISOString(),
      };

      current = [...current, created];

      return HttpResponse.json(created, {
        status: 201,
        headers: { Location: `/api/achievements/${String(created.id)}` },
      });
    }),

    http.put(ACHIEVEMENT_ITEM, async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as AchievementRequest;

      const existing = current.find((item) => item.id === id);
      if (!existing) return notFound(id);

      const teacherName = resolveTeacherName(body.teacherId);
      if (teacherName === undefined) return unknownTeacher(body.teacherId, `/api/achievements/${String(id)}`);

      // Полная замена: всё, кроме `id` и даты создания, приходит из тела.
      const updated: Achievement = {
        ...fromRequest(body, teacherName),
        id,
        createdAt: existing.createdAt,
      };
      current = current.map((item) => (item.id === id ? updated : item));

      return HttpResponse.json(updated);
    }),

    http.delete(ACHIEVEMENT_ITEM, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((item) => item.id === id)) return notFound(id);

      current = current.filter((item) => item.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Тело запроса — в поля ответа. Адрес обложки и имя преподавателя
 * собирает сервер: клиент отправляет ключ и ссылку.
 */
function fromRequest(
  body: AchievementRequest,
  teacherName: string | null,
): Omit<Achievement, 'id' | 'createdAt'> {
  return {
    title: body.title,
    description: body.description,
    content: body.content,
    previewImage: body.previewImage,
    previewImageUrl: `/media/${body.previewImage}`,
    display: body.display,
    teacherId: body.teacherId,
    teacherName,
  };
}

/**
 * ФИО карточки по ссылке: `null` — ссылки нет, достижение кафедральное;
 * `undefined` — карточки с таким `id` нет, и сервер ответил бы отказом.
 */
function resolveTeacherName(teacherId: number | null): string | null | undefined {
  if (teacherId === null) return null;

  const teacher = teachersFixture.find((each) => each.id === teacherId);

  return teacher
    ? [teacher.lastName, teacher.firstName, teacher.patronymic].filter(Boolean).join(' ')
    : undefined;
}

/** Текст — `TeacherService.getTeacherEntity`: `InvalidRequestException`, без словаря `errors`. */
function unknownTeacher(teacherId: number | null, instance: string) {
  return problemResponse(400, {
    title: 'Bad Request',
    detail: `Преподаватель не найден: id=${String(teacherId)}`,
    instance,
  });
}

function notFound(id: number) {
  return problemResponse(404, {
    title: 'Not Found',
    detail: `Достижение id=${String(id)} не найдено`,
    instance: `/api/achievements/${String(id)}`,
  });
}
