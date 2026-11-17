import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { eventHandlers, makeEvent, pageResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';

import { fetchAllEvents } from './eventApi';

const EVENTS = '*/api/events';

describe('fetchAllEvents', () => {
  it('читает все страницы, а не первую', async () => {
    // 230 событий при сотне на странице — три запроса.
    const many = Array.from({ length: 230 }, (_, index) => makeEvent({ id: index + 1 }));
    const pages: string[] = [];

    server.use(...eventHandlers(many));
    server.events.on('request:start', ({ request }) => {
      pages.push(new URL(request.url).searchParams.get('page') ?? '');
    });

    const events = await fetchAllEvents();
    server.events.removeAllListeners();

    expect(events).toHaveLength(230);
    expect(events.at(-1)?.id).toBe(230);
    expect(pages).toEqual(['0', '1', '2']);
  });

  it('пустой календарь — один запрос и пустой массив', async () => {
    server.use(...eventHandlers([]));

    await expect(fetchAllEvents()).resolves.toEqual([]);
  });

  it('останавливается на пустой странице, даже если счётчик обещает больше', async () => {
    // Событие удалили между запросами: вторая страница пуста, а первая
    // ещё насчитала две. Без остановки цикл не кончился бы никогда.
    let calls = 0;
    server.use(
      http.get(EVENTS, () => {
        calls++;
        const page = pageResponse(calls === 1 ? [makeEvent()] : [], calls - 1, 1);
        return HttpResponse.json({ ...page, totalPages: 5 });
      }),
    );

    await expect(fetchAllEvents()).resolves.toHaveLength(1);
    expect(calls).toBe(2);
  });
});
