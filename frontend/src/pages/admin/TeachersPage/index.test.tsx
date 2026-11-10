import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeTeacher, problemResponse, teacherHandlers } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import AdminTeachersPage from './index';

/**
 * Защищённый список: с F-53 раздел читает его, а не публичный — публичный
 * архивных не отдаёт.
 */
const TEACHERS = '*/api/teachers';

/**
 * Раздел преподавателей админки.
 *
 * Прав здесь не проверяют: за них отвечает `RoleRoute`, и у него свои
 * шесть проверок. Страница рендерится напрямую — как и остальные страницы
 * портала в тестах.
 *
 * Вместе со страницей монтируется уголок тостов: сообщение об удалении
 * и об отказе — часть поведения раздела, и проверять его на самом сторе
 * значило бы проверять не то, что увидит человек.
 */
function renderTeachers(route = '/admin/teachers') {
  return renderWithProviders(
    <>
      <AdminTeachersPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/**
 * Свой список на каждый тест: мок помнит, кого в нём удалили, а набор
 * по умолчанию собирается один раз на весь прогон — то есть удалённая
 * в одном тесте карточка не вернулась бы к следующему.
 */
beforeEach(() => {
  server.use(...teacherHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

/** Строка таблицы, в которой лежит карточка с таким ФИО. */
function rowOf(fullName: string) {
  const cell = screen.getByRole('cell', { name: fullName });
  const row = cell.closest('tr');

  if (!row) throw new Error(`строки с карточкой «${fullName}» нет в разметке`);

  return within(row);
}

describe('AdminTeachersPage, список', () => {
  it('показывает карточки первой страницы по алфавиту фамилий', async () => {
    renderTeachers();

    expect(await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();

    // Двадцать первая карточка — уже на второй странице: размер страницы
    // держит контракт, а не фронт.
    expect(screen.queryByRole('cell', { name: 'Фёдоров Максим Эдуардович' })).not.toBeInTheDocument();
  });

  /**
   * Должность, степень и звание собираются в одну строку тем же
   * способом, что и на публичной странице. Три колонки под них съели бы
   * ширину, а читаются они всё равно вместе.
   */
  it('показывает должность вместе с регалиями', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });

    expect(
      rowOf('Абрамов Никита Сергеевич').getByText(
        'доцент кафедры, кандидат технических наук, доцент',
      ),
    ).toBeInTheDocument();
  });

  /**
   * Отчество в контракте бывает `null`, и ФИО собирается без него —
   * без « null» на конце и без пустого места.
   *
   * Своей колонки у отчества нет: она была и ушла на первом же взгляде
   * на живой стенд — сортировала по имени, а показывала отчество
   * (разбор в `ui/teacherColumns.tsx`).
   */
  it('собирает ФИО без отчества, когда его нет', async () => {
    renderTeachers();

    expect(await screen.findByRole('cell', { name: 'Гаврилов Степан' })).toBeInTheDocument();
    expect(screen.queryByText('без отчества')).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Имя/ })).not.toBeInTheDocument();
  });

  /**
   * «Править» — ссылка, а не кнопка: форма живёт своим адресом, и открыть
   * её в новой вкладке должно быть можно.
   */
  it('ведёт на форму правки ссылкой, а не кнопкой', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });

    expect(
      rowOf('Абрамов Никита Сергеевич').getByRole('link', {
        name: 'Править карточку «Абрамов Никита Сергеевич»',
      }),
    ).toHaveAttribute('href', '/admin/teachers/1');
  });

  it('ведёт на форму создания ссылкой', async () => {
    renderTeachers();

    expect(await screen.findByRole('link', { name: 'Добавить' })).toHaveAttribute(
      'href',
      '/admin/teachers/new',
    );
  });

  it('открывает вторую страницу из адреса', async () => {
    renderTeachers('/admin/teachers?page=2');

    expect(await screen.findByRole('cell', { name: 'Фёдоров Максим Эдуардович' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Абрамов Никита Сергеевич' })).not.toBeInTheDocument();
  });

  it('запрашивает обратный порядок, когда он задан в адресе', async () => {
    renderTeachers('/admin/teachers?sort=lastName,desc');

    expect(await screen.findByRole('cell', { name: 'Фёдоров Максим Эдуардович' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Абрамов Никита Сергеевич' })).not.toBeInTheDocument();
  });

  /**
   * `?sort=lastName,asc` — не то же самое, что отсутствие параметра:
   * заданный порядок заменяет умолчание контракта целиком, вместе
   * с ключами `firstName` и `id`, которые идут в нём следом и делают
   * листание устойчивым.
   */
  it('не отправляет порядок по умолчанию — у контракта он с ключами firstName и id', async () => {
    let requested: string | null = null;
    // Хендлер без ответа пропускает запрос дальше по набору: смотрим
    // адрес, не подменяя выдачу.
    server.use(
      http.get(TEACHERS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderTeachers();
    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });

    expect(requested).not.toContain('sort=');
  });

  it('отправляет порядок, отличный от умолчания', async () => {
    let requested: string | null = null;
    server.use(
      http.get(TEACHERS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderTeachers('/admin/teachers?sort=position,asc');
    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });

    expect(requested).toContain('sort=position,asc');
  });

  it('меняет порядок кликом по заголовку колонки', async () => {
    renderTeachers();

    fireEvent.click(await screen.findByRole('button', { name: /ФИО/ }));

    expect(await screen.findByRole('cell', { name: 'Фёдоров Максим Эдуардович' })).toBeInTheDocument();
  });

  it('говорит, что действующих карточек нет', async () => {
    server.use(...teacherHandlers([]));

    renderTeachers();

    expect(await screen.findByText('Действующих карточек нет')).toBeInTheDocument();
  });

  it('говорит, что карточек нет вовсе, в отборе «Все»', async () => {
    server.use(...teacherHandlers([]));

    renderTeachers('/admin/teachers?archived=all');

    expect(await screen.findByText('Карточек преподавателей пока нет')).toBeInTheDocument();
  });

  /** Страница за пределами данных — `200` с пустым `content`, а не ошибка. */
  it('объясняет страницу за пределами данных', async () => {
    renderTeachers('/admin/teachers?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(TEACHERS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/teachers',
        }),
      ),
    );

    renderTeachers();

    expect(await screen.findByText('Не удалось загрузить преподавателей')).toBeInTheDocument();

    server.use(...teacherHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderTeachers();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

describe('AdminTeachersPage, удаление', () => {
  beforeEach(() => {
    server.use(
      ...teacherHandlers([
        makeTeacher({ id: 1, lastName: 'Абрамов', firstName: 'Никита', patronymic: 'Сергеевич' }),
        makeTeacher({ id: 2, lastName: 'Белова', firstName: 'Екатерина', patronymic: 'Андреевна' }),
      ]),
    );
  });

  it('удаляет карточку после подтверждения', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      rowOf('Абрамов Никита Сергеевич').getByRole('button', {
        name: 'Удалить карточку «Абрамов Никита Сергеевич»',
      }),
    );

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('cell', { name: 'Абрамов Никита Сергеевич' }),
      ).not.toBeInTheDocument(),
    );
    expect(await screen.findByText('Карточка «Абрамов Никита» удалена')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Белова Екатерина Андреевна' })).toBeInTheDocument();
  });

  /**
   * Текст окна сверен с таблицей «Что уносит с собой удаление карточки»
   * в docs/API.md (F-51): расписание уходит, достижения, записи
   * аспирантуры и ведомости теряют преподавателя, учётка живёт. Ведомостей
   * в тексте до F-51 не было — он писался по changeset'ам, а не по
   * контракту. Проверка сторожит именно текст: потерять его при правке
   * подписи легче лёгкого.
   */
  it('перечисляет последствия удаления по контракту', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      rowOf('Абрамов Никита Сергеевич').getByRole('button', {
        name: 'Удалить карточку «Абрамов Никита Сергеевич»',
      }),
    );

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' }));

    expect(dialog.getByText(/вместе с расписанием занятий и экзаменов/)).toBeInTheDocument();
    expect(
      dialog.getByText(/Достижения, записи аспирантуры и ведомости останутся/),
    ).toBeInTheDocument();
    expect(dialog.getByText(/Учётная запись.*продолжит работать/)).toBeInTheDocument();
  });

  /**
   * Для ушедшего преподавателя штатный путь — архив, удаление — для
   * ошибочно заведённой карточки (docs/API.md, «Архив»). Окно, куда
   * модератор пришёл удалять уволившегося, обязано этот путь предложить.
   */
  it('предлагает архив вместо удаления', async () => {
    let deleted = false;
    server.events.on('request:start', ({ request }) => {
      if (request.method === 'DELETE') deleted = true;
    });

    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      rowOf('Абрамов Никита Сергеевич').getByRole('button', {
        name: 'Удалить карточку «Абрамов Никита Сергеевич»',
      }),
    );

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' }));
    expect(dialog.getByText(/отправьте карточку в архив/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'В архив' }));

    expect(await screen.findByText('Карточка «Абрамов Никита» в архиве')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('cell', { name: 'Абрамов Никита Сергеевич' }),
      ).not.toBeInTheDocument(),
    );
    expect(deleted).toBe(false);
  });

  it('не предлагает архив уже архивной карточке', async () => {
    server.use(
      ...teacherHandlers([
        makeTeacher({
          id: 1,
          lastName: 'Абрамов',
          firstName: 'Никита',
          patronymic: 'Сергеевич',
          archived: true,
        }),
      ]),
    );

    renderTeachers('/admin/teachers?archived=true');

    await screen.findByRole('cell', { name: /^Абрамов Никита Сергеевич/ });
    fireEvent.click(
      screen.getByRole('button', { name: 'Удалить карточку «Абрамов Никита Сергеевич»' }),
    );

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' }));
    expect(dialog.queryByRole('button', { name: 'В архив' })).not.toBeInTheDocument();
    expect(dialog.queryByText(/отправьте карточку в архив/)).not.toBeInTheDocument();
  });

  it('не удаляет по «Отмене»', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      rowOf('Абрамов Никита Сергеевич').getByRole('button', {
        name: 'Удалить карточку «Абрамов Никита Сергеевич»',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' })).getByRole(
        'button',
        { name: 'Отмена' },
      ),
    );

    expect(screen.getByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
  });

  /**
   * Карточку успели удалить в соседней вкладке. Отказ показывается тостом:
   * окно подтверждения к этому моменту закрыто, и держать его открытым
   * ради строчки с ошибкой значило бы предлагать нажать «Удалить» ещё раз.
   */
  it('говорит словами сервера, если карточки уже нет', async () => {
    server.use(
      http.delete('*/api/teachers/:id', () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Преподаватель не найден',
          instance: '/api/teachers/1',
        }),
      ),
    );

    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      rowOf('Абрамов Никита Сергеевич').getByRole('button', {
        name: 'Удалить карточку «Абрамов Никита Сергеевич»',
      }),
    );
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' })).getByRole(
        'button',
        { name: 'Удалить' },
      ),
    );

    expect(await screen.findByText('Преподаватель не найден')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
  });
});

describe('AdminTeachersPage, архив', () => {
  /**
   * Две действующие и одна архивная. Порядок по фамилии сохраняется
   * внутри каждого отбора — его держит мок так же, как Spring.
   */
  beforeEach(() => {
    server.use(
      ...teacherHandlers([
        makeTeacher({ id: 1, lastName: 'Абрамов', firstName: 'Никита', patronymic: 'Сергеевич' }),
        makeTeacher({
          id: 2,
          lastName: 'Белова',
          firstName: 'Екатерина',
          patronymic: 'Андреевна',
          archived: true,
        }),
        makeTeacher({ id: 3, lastName: 'Волков', firstName: 'Артём', patronymic: 'Дмитриевич' }),
      ]),
    );
  });

  /** Ловит адрес запроса защищённого списка, не подменяя выдачу. */
  function captureListRequests() {
    const urls: URL[] = [];
    server.use(
      http.get(TEACHERS, ({ request }) => {
        urls.push(new URL(request.url));
      }),
    );
    return urls;
  }

  /**
   * По умолчанию — действующие, и это `archived=false` в запросе, а не
   * отсутствие параметра: без него контракт отдал бы и архив.
   */
  it('показывает по умолчанию только действующих', async () => {
    const urls = captureListRequests();

    renderTeachers();

    expect(await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /Белова/ })).not.toBeInTheDocument();
    expect(urls.at(-1)?.searchParams.get('archived')).toBe('false');
    expect(screen.getByRole('link', { name: 'Действующие' })).toHaveAttribute('aria-current', 'page');
  });

  it('открывает архив из адреса — с плашкой и возвратом', async () => {
    const urls = captureListRequests();

    renderTeachers('/admin/teachers?archived=true');

    const cell = await screen.findByRole('cell', { name: /^Белова Екатерина Андреевна/ });
    expect(within(cell).getByText('В архиве')).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: /Абрамов/ })).not.toBeInTheDocument();
    expect(urls.at(-1)?.searchParams.get('archived')).toBe('true');
    expect(
      screen.getByRole('button', {
        name: 'Вернуть из архива карточку «Белова Екатерина Андреевна»',
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Отправить в архив/ }),
    ).not.toBeInTheDocument();
  });

  /** «Все» — отсутствие параметра в запросе: так контракт отдаёт всех. */
  it('показывает всех без параметра в запросе, плашка — только у архивной', async () => {
    const urls = captureListRequests();

    renderTeachers('/admin/teachers?archived=all');

    expect(await screen.findByRole('cell', { name: /^Белова Екатерина Андреевна/ })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
    expect(screen.getAllByText('В архиве', { selector: 'span' })).toHaveLength(1);
    expect(urls.at(-1)?.searchParams.has('archived')).toBe(false);
  });

  it('говорит, что архив пуст', async () => {
    server.use(...teacherHandlers([makeTeacher({ id: 1 })]));

    renderTeachers('/admin/teachers?archived=true');

    expect(await screen.findByText('В архиве пусто')).toBeInTheDocument();
  });

  /** Битое значение в адресе — обычный вид раздела, а не `400` от Spring. */
  it('открывает действующих на незнакомом значении отбора', async () => {
    const urls = captureListRequests();

    renderTeachers('/admin/teachers?archived=yes');

    expect(await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
    expect(urls.at(-1)?.searchParams.get('archived')).toBe('false');
  });

  /**
   * Отбор — ссылками, и смена его сбрасывает страницу, но не порядок:
   * третья страница действующих к архиву отношения не имеет.
   */
  it('держит порядок в ссылках отбора и сбрасывает страницу', async () => {
    renderTeachers('/admin/teachers?page=2&sort=position,asc');

    const archiveLink = await screen.findByRole('link', { name: 'В архиве' });

    expect(archiveLink).toHaveAttribute('href', '/admin/teachers?sort=position,asc&archived=true');
    expect(screen.getByRole('link', { name: 'Действующие' })).toHaveAttribute(
      'href',
      '/admin/teachers?sort=position,asc',
    );
  });

  it('отправляет карточку в архив из строки', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Отправить в архив карточку «Абрамов Никита Сергеевич»',
      }),
    );

    expect(await screen.findByText('Карточка «Абрамов Никита» в архиве')).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('cell', { name: 'Абрамов Никита Сергеевич' }),
      ).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('cell', { name: 'Волков Артём Дмитриевич' })).toBeInTheDocument();
  });

  it('возвращает карточку из архива', async () => {
    renderTeachers('/admin/teachers?archived=true');

    await screen.findByRole('cell', { name: /^Белова Екатерина Андреевна/ });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Вернуть из архива карточку «Белова Екатерина Андреевна»',
      }),
    );

    expect(
      await screen.findByText('Карточка «Белова Екатерина» возвращена из архива'),
    ).toBeInTheDocument();
    expect(await screen.findByText('В архиве пусто')).toBeInTheDocument();
  });

  /** Карточку удалили в соседней вкладке: `404` — словами сервера. */
  it('говорит словами сервера, если карточки для архива уже нет', async () => {
    server.use(
      http.post('*/api/teachers/:id/archive', () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Преподаватель не найден',
          instance: '/api/teachers/1/archive',
        }),
      ),
    );

    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Отправить в архив карточку «Абрамов Никита Сергеевич»',
      }),
    );

    expect(await screen.findByText('Преподаватель не найден')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Абрамов Никита Сергеевич' })).toBeInTheDocument();
  });
});
