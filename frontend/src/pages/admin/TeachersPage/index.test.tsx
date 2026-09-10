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

const PUBLIC_TEACHERS = '*/api/public/teachers';

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
   * Отчество в контракте бывает `null`. Прочерк на его месте диктор
   * читает как «тире» либо молчит, поэтому здесь слова.
   */
  it('называет словами карточку без отчества', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Гаврилов Степан' });

    expect(rowOf('Гаврилов Степан').getByText('без отчества')).toBeInTheDocument();
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
      http.get(PUBLIC_TEACHERS, ({ request }) => {
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
      http.get(PUBLIC_TEACHERS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderTeachers('/admin/teachers?sort=position,asc');
    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });

    expect(requested).toContain('sort=position,asc');
  });

  it('меняет порядок кликом по заголовку колонки', async () => {
    renderTeachers();

    fireEvent.click(await screen.findByRole('button', { name: /Фамилия/ }));

    expect(await screen.findByRole('cell', { name: 'Фёдоров Максим Эдуардович' })).toBeInTheDocument();
  });

  it('говорит, что карточек нет вовсе', async () => {
    server.use(...teacherHandlers([]));

    renderTeachers();

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
      http.get(PUBLIC_TEACHERS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/public/teachers',
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
   * Удаление карточки ППС тянет за собой пять таблиц, и ведут они себя
   * по-разному: расписание уходит каскадом, а достижения, ведомости
   * и аспиранты остаются с обнулённой связью. Модератор, убирающий
   * уволившегося, должен знать про второе — «исчезнет карточка» звучит
   * безобиднее, чем есть.
   *
   * Проверка сторожит именно текст: он выясняется чтением changeset'ов
   * бэкенда, в контракте его нет (заявка B-8), и потерять его при первой
   * же правке подписи легче лёгкого.
   */
  it('перечисляет последствия удаления поимённо', async () => {
    renderTeachers();

    await screen.findByRole('cell', { name: 'Абрамов Никита Сергеевич' });
    fireEvent.click(
      rowOf('Абрамов Никита Сергеевич').getByRole('button', {
        name: 'Удалить карточку «Абрамов Никита Сергеевич»',
      }),
    );

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить карточку преподавателя?' }));

    expect(dialog.getByText(/вместе с расписанием занятий и экзаменов/)).toBeInTheDocument();
    expect(dialog.getByText(/достижения станут кафедральными/)).toBeInTheDocument();
    expect(dialog.getByText(/аспиранты — без руководителя/)).toBeInTheDocument();
    expect(dialog.getByText(/Учётная запись.*продолжит работать/)).toBeInTheDocument();
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
