import { http, HttpResponse } from 'msw';

import type { Achievement } from '@shared/types';

import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';

/**
 * Публичные ручки достижений, `*` вместо origin — по той же причине,
 * что у новостей: в тестах запрос уходит на origin jsdom, в браузере
 * при `VITE_API_BASE_URL=http://localhost:8080` — на порт бэкенда.
 */
const PUBLIC_ACHIEVEMENTS = '*/api/public/achievements';
const PUBLIC_TEACHER_ACHIEVEMENTS = '*/api/public/teachers/:teacherId/achievements';

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
 * Двадцать три достижения — на одно больше, чем помещается на страницу:
 * при размере 20 получается ровно две страницы, то есть пагинатор рисуется,
 * вторая страница неполная, а `?page=3` попадает за пределы данных.
 * Все три случая нужны тестам списка — по счёту, проверенному на ленте
 * новостей (`news.ts`).
 *
 * Каждое третье — кафедральное (`teacherId: null`): привязанные
 * и непривязанные идут вперемешку, как в базе, и карточка, рисующая
 * подпись преподавателя без проверки, выдала бы себя на первой же странице.
 */
export const achievementsFixture: readonly Achievement[] = Array.from(
  { length: 23 },
  (_, index) => {
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
  },
);

/**
 * Хендлеры чтения достижений. Список берётся аргументом, чтобы тест пустого
 * раздела был одной строкой `server.use(...achievementHandlers([]))`,
 * а не копией хендлера с другим телом.
 *
 * Ручка достижений преподавателя фильтрует тот же список по `teacherId` —
 * так же, как бэкенд. Неизвестный преподаватель получает **пустую
 * страницу**, а не `404`: ручка фильтрует достижения по ссылке,
 * а не проверяет карточку (docs/API.md, «Достижения кафедры»), и мок,
 * отвечающий здесь ошибкой, проверял бы несуществующее поведение.
 */
export function achievementHandlers(items: readonly Achievement[] = achievementsFixture) {
  return [
    http.get(PUBLIC_ACHIEVEMENTS, ({ request }) => {
      return HttpResponse.json(pageFromUrl(items, new URL(request.url)));
    }),

    http.get(`${PUBLIC_ACHIEVEMENTS}/:id`, ({ params }) => {
      const achievement = items.find((item) => String(item.id) === params.id);

      // Скрытое и несуществующее достижения неразличимы — оба `404`.
      return achievement
        ? HttpResponse.json(achievement)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Достижение не найдено',
            instance: `/api/public/achievements/${String(params.id)}`,
          });
    }),

    http.get(PUBLIC_TEACHER_ACHIEVEMENTS, ({ request, params }) => {
      const teacherId = Number(params.teacherId);
      const mine = items.filter((item) => item.teacherId === teacherId);

      return HttpResponse.json(pageFromUrl(mine, new URL(request.url)));
    }),
  ];
}
