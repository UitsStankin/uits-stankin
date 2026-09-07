import { http, HttpResponse } from 'msw';

import type { Subject, SubjectRequest } from '@shared/types';

import { pageResponse, numberParam, DEFAULT_PAGE_SIZE } from './page';
import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const SUBJECTS = '*/api/subjects';
const SUBJECT = '*/api/subjects/:id';

/**
 * Дисциплина со всеми полями контракта. Переопределяется точечно: тесту
 * обычно нужно одно название, а не весь DTO.
 */
export function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: 1,
    name: 'Базы данных',
    description: 'Реляционная модель, SQL',
    ...overrides,
  };
}

/**
 * Двадцать три дисциплины — на три больше, чем помещается на страницу.
 * Числа и причины те же, что у фикстур новостей, ППС и аспирантов:
 * пагинатор рисуется, вторая страница неполная, а `?page=3` попадает
 * за пределы данных.
 *
 * Порядок — **по названию**, как отдаёт контракт по умолчанию: фикстура,
 * перемешанная как попало, врала бы про сортировку, и тест на смену
 * порядка зеленел бы сам собой.
 *
 * У части дисциплин описания нет: в базе колонка необязательна, и это
 * не экзотика, а обычное состояние словаря.
 */
export const subjectsFixture: readonly Subject[] = [
  ['Автоматизация технологических процессов', 'Датчики, исполнительные механизмы, АСУ ТП'],
  ['Базы данных', 'Реляционная модель, SQL, проектирование схем'],
  ['Вычислительная математика', null],
  ['Дискретная математика', 'Графы, комбинаторика, булевы функции'],
  ['Инженерная графика', null],
  ['Информационная безопасность', 'Модели угроз, криптография, аудит'],
  ['Компьютерные сети', 'Стек TCP/IP, маршрутизация, протоколы прикладного уровня'],
  ['Локальные системы управления', null],
  ['Математическая статистика', 'Оценки, проверка гипотез, регрессия'],
  ['Метрология и измерения', null],
  ['Микропроцессорная техника', 'Архитектура, периферия, программирование контроллеров'],
  ['Моделирование систем', 'Имитационное и аналитическое моделирование'],
  ['Надёжность технических систем', null],
  ['Операционные системы', 'Процессы, память, файловые системы'],
  ['Основы программирования', 'Алгоритмы, структуры данных, отладка'],
  ['Проектирование информационных систем', 'Требования, архитектура, документирование'],
  ['Робототехнические системы', null],
  ['Системный анализ', 'Постановка задач, критерии, принятие решений'],
  ['Теория автоматического управления', 'Устойчивость, качество, синтез регуляторов'],
  ['Теория вероятностей', null],
  ['Технологии машиностроения', 'Обработка резанием, оснастка, техпроцессы'],
  ['Управление проектами', null],
  ['Численные методы', 'Аппроксимация, интегрирование, решение уравнений'],
].map(([name, description], index) =>
  makeSubject({ id: index + 1, name: name as string, description: description as string | null }),
);

/**
 * Словарь дисциплин целиком: список, создание, правка, удаление.
 *
 * Мок **с состоянием**: созданная дисциплина появляется в списке,
 * удалённая исчезает. Без этого проверить каркас админки нечем — весь
 * его смысл в том, что после сохранения таблица показывает новое,
 * а мок, отвечающий «201» и забывающий тело, зеленил бы форму, которая
 * никуда не сохраняет.
 *
 * Что мок повторяет из контракта, а что нет:
 *
 * - сортировка `?sort=name,asc|desc` — да: на ней стоит проверка смены
 *   порядка, и клиентская сортировка вместо серверной была бы ровно тем
 *   враньём, от которого таблица отказалась (`manualSorting`);
 * - занятое название — да, `409` с текстом «Конфликт данных.»: именно
 *   так отвечает уникальный индекс базы, и форма переводит этот отказ
 *   в понятный. Мок с готовым текстом проверял бы сам себя;
 * - назначенность дисциплины преподавателям — нет: `409` на удаление
 *   заводится точечно в тесте через `server.use`, потому что зависит
 *   от данных, которых у словаря нет.
 */
export function subjectHandlers(items: readonly Subject[] = subjectsFixture) {
  let current = [...items];
  let nextId = current.reduce((max, subject) => Math.max(max, subject.id), 0) + 1;

  return [
    http.get(SUBJECTS, ({ request }) => {
      const url = new URL(request.url);
      const sorted = sortSubjects(current, url.searchParams.get('sort'));

      return HttpResponse.json(
        pageResponse(
          sorted,
          numberParam(url, 'page', 0),
          numberParam(url, 'size', DEFAULT_PAGE_SIZE, 1),
        ),
      );
    }),

    http.post(SUBJECTS, async ({ request }) => {
      const body = (await request.json()) as SubjectRequest;

      const taken = current.some(
        (subject) => subject.name.toLowerCase() === body.name.toLowerCase(),
      );
      if (taken) return conflict('/api/subjects');

      const created = makeSubject({ id: nextId++, name: body.name, description: body.description });
      current = [...current, created];

      return HttpResponse.json(created, { status: 201 });
    }),

    http.put(SUBJECT, async ({ params, request }) => {
      const id = Number(params.id);
      const body = (await request.json()) as SubjectRequest;

      const existing = current.find((subject) => subject.id === id);
      if (!existing) return notFound(`/api/subjects/${id}`);

      const taken = current.some(
        (subject) => subject.id !== id && subject.name.toLowerCase() === body.name.toLowerCase(),
      );
      if (taken) return conflict(`/api/subjects/${id}`);

      const updated = { ...existing, name: body.name, description: body.description };
      current = current.map((subject) => (subject.id === id ? updated : subject));

      return HttpResponse.json(updated);
    }),

    http.delete(SUBJECT, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((subject) => subject.id === id)) return notFound(`/api/subjects/${id}`);

      current = current.filter((subject) => subject.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Порядок по названию — тот же, что у Spring: по возрастанию, если
 * параметра нет. Сравнение русских строк — `localeCompare`, иначе «Ё»
 * уезжает за «Я», а в словаре кафедры такие названия есть.
 */
function sortSubjects(items: readonly Subject[], sort: string | null): readonly Subject[] {
  const desc = sort === 'name,desc';

  return [...items].sort((a, b) => (desc ? -1 : 1) * a.name.localeCompare(b.name, 'ru'));
}

/** Занятое название: `409` от уникального индекса, текст общий. */
function conflict(instance: string) {
  return problemResponse(409, { title: 'Conflict', detail: 'Конфликт данных.', instance });
}

function notFound(instance: string) {
  return problemResponse(404, { title: 'Not Found', detail: 'Ресурс не найден.', instance });
}
