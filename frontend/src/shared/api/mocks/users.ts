import { http, HttpResponse } from 'msw';

import type { UserDirectoryEntry } from '@shared/types';

import { numberParam, pageResponse } from './page';

/** `*` вместо origin — по той же причине, что и у новостей. */
const USER_DIRECTORY = '*/api/users/directory';

/** Запись справочника: `id` и ФИО, больше ручка ничего не отдаёт. */
export function makeUserDirectoryEntry(
  overrides: Partial<UserDirectoryEntry> = {},
): UserDirectoryEntry {
  return { id: 42, lastName: 'Иванов', firstName: 'Иван', ...overrides };
}

/**
 * Двенадцать учёток преподавателей по алфавиту фамилий — столько же,
 * сколько в примере контракта.
 *
 * Меньше, чем карточек ППС (23), и это не небрежность: учётка есть
 * не у каждого преподавателя, и справочник обязан выглядеть короче
 * списка карточек — иначе форма правки создавала бы впечатление, что
 * связь найдётся всегда.
 *
 * У последней записи ФИО не заполнено вовсе: контракт разрешает обе
 * строки `null`, а подпись в выпадающем списке собирает фронт — и на
 * пустом ФИО он обязан показать хоть что-то, а не пустой пункт.
 *
 * `id` начинаются с сотни, чтобы ни один не совпал с `id` карточки ППС:
 * это разные сущности, и тест, перепутавший их местами, обязан упасть,
 * а не сойтись случайно.
 */
export const userDirectoryFixture: readonly UserDirectoryEntry[] = [
  ['Абрамов', 'Никита'],
  ['Андреева', 'Ольга'],
  ['Баранов', 'Илья'],
  ['Волков', 'Артём'],
  ['Григорьева', 'Анна'],
  ['Данилов', 'Кирилл'],
  ['Кузнецова', 'Татьяна'],
  ['Лебедев', 'Виктор'],
  ['Петров', 'Пётр'],
  ['Соколов', 'Денис'],
  ['Фёдоров', 'Максим'],
  [null, null],
].map(([lastName, firstName], index) =>
  makeUserDirectoryEntry({ id: 101 + index, lastName, firstName }),
);

/**
 * Справочник учёток преподавателей — одна ручка чтения.
 *
 * Список берётся аргументом, чтобы тест пустого справочника был одной
 * строкой `server.use(...userDirectoryHandlers([]))`: форма карточки ППС
 * обязана в этом случае сказать, что привязывать не к чему, а не показать
 * пустой выпадающий список.
 *
 * Сортировки мок не повторяет: справочник приходит уже по алфавиту,
 * и фикстура сложена так же — просить у него другой порядок в портале
 * некому.
 */
export function userDirectoryHandlers(
  items: readonly UserDirectoryEntry[] = userDirectoryFixture,
) {
  return [
    http.get(USER_DIRECTORY, ({ request }) => {
      const url = new URL(request.url);

      // Размер страницы у справочника — 50, а не общие 20 (docs/API.md,
      // «Пагинация списков»). Клиент просит сотню и получает всё.
      return HttpResponse.json(
        pageResponse(items, numberParam(url, 'page', 0), numberParam(url, 'size', 50, 1)),
      );
    }),
  ];
}
