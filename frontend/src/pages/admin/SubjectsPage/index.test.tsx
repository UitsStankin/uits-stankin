import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { problemResponse, subjectHandlers, subjectsFixture } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import SubjectsPage from './index';

const SUBJECTS = '*/api/subjects';

/**
 * Раздел дисциплин админки.
 *
 * Прав здесь не проверяют: за них отвечает `RoleRoute`, и у него свои
 * шесть проверок. Страница рендерится напрямую — как и остальные страницы
 * портала в тестах.
 *
 * Вместе со страницей монтируется уголок тостов: сообщение об успехе
 * и об отказе — часть поведения раздела, и проверять его на самом сторе
 * значило бы проверять не то, что увидит человек.
 */
function renderSubjects(route = '/admin/subjects') {
  return renderWithProviders(
    <>
      <SubjectsPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/**
 * Свой словарь на каждый тест.
 *
 * Мок дисциплин помнит, что в нём создали и удалили, а набор по умолчанию
 * собирается один раз на весь прогон — то есть заведённая в одном тесте
 * дисциплина осталась бы в списке у следующего, а переименованная
 * исчезла бы из него под старым названием. `server.use` кладёт поверх
 * свежую копию, а `resetHandlers` в общей обвязке снимает её после теста.
 */
beforeEach(() => {
  server.use(...subjectHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

describe('SubjectsPage, список', () => {
  it('показывает дисциплины первой страницы', async () => {
    renderSubjects();

    expect(await screen.findByRole('cell', { name: 'Базы данных' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Компьютерные сети' })).toBeInTheDocument();
  });

  /** Незаполненное описание — словами: колонка из тире выглядит сломанной. */
  it('называет незаполненное описание словами', async () => {
    renderSubjects();

    const row = within(await screen.findByRole('table')).getAllByRole('row')[3];

    expect(within(row).getByText('не заполнено')).toBeInTheDocument();
  });

  it('открывает вторую страницу из адреса', async () => {
    renderSubjects('/admin/subjects?page=2');

    expect(await screen.findByRole('cell', { name: 'Численные методы' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Базы данных' })).not.toBeInTheDocument();
  });

  /**
   * Порядок берётся из адреса и уезжает в запрос: сортировка серверная,
   * и страница обязана попросить её у бэкенда, а не переставить двадцать
   * загруженных строк.
   */
  it('запрашивает обратный порядок, когда он задан в адресе', async () => {
    renderSubjects('/admin/subjects?sort=name,desc');

    expect(await screen.findByRole('cell', { name: 'Численные методы' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Базы данных' })).not.toBeInTheDocument();
  });

  it('меняет порядок кликом по заголовку', async () => {
    renderSubjects();

    fireEvent.click(await screen.findByRole('button', { name: /Название/ }));

    expect(await screen.findByRole('cell', { name: 'Численные методы' })).toBeInTheDocument();
  });

  it('говорит, что дисциплин нет вовсе', async () => {
    server.use(...subjectHandlers([]));

    renderSubjects();

    expect(await screen.findByText('Дисциплин пока нет')).toBeInTheDocument();
  });

  /** Страница за пределами данных — `200` с пустым `content`, а не ошибка. */
  it('объясняет страницу за пределами данных', async () => {
    renderSubjects('/admin/subjects?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(SUBJECTS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/subjects',
        }),
      ),
    );

    renderSubjects();

    expect(await screen.findByText('Не удалось загрузить дисциплины')).toBeInTheDocument();

    server.use(...subjectHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Базы данных' })).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderSubjects();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

describe('SubjectsPage, создание', () => {
  it('добавляет дисциплину и показывает её в таблице', async () => {
    renderSubjects();

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));

    const dialog = screen.getByRole('dialog', { name: 'Новая дисциплина' });
    fireEvent.change(within(dialog).getByLabelText('Название'), {
      target: { value: 'Анализ данных' },
    });
    fireEvent.change(within(dialog).getByLabelText('Описание'), {
      target: { value: 'Разведочный анализ, визуализация' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Дисциплина «Анализ данных» добавлена')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Анализ данных' })).toBeInTheDocument();
  });

  it('не отправляет форму без названия', async () => {
    renderSubjects();

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Укажите название дисциплины')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * Занятое название приходит как `400` с готовым текстом и словарём
   * `errors` из одного ключа (`FieldValidationException`, B-6). Показываем
   * его словами сервера и под тем полем, которое надо править: свой перевод
   * подменял бы сообщение менее точным, а баннер уводил бы сообщение
   * от курсора.
   */
  it('ставит отказ по занятому названию под поле, словами сервера', async () => {
    renderSubjects();

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Базы данных' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    const поле = screen.getByLabelText('Название');
    await waitFor(() => expect(поле).toHaveAccessibleDescription(/уже существует/));

    expect(поле).toHaveAccessibleDescription('Дисциплина с названием «Базы данных» уже существует');
    // Баннер над формой при этом молчит: сообщение уже стоит там, где
    // его будут править, и второй копией оно только сбивало бы.
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /** Словарь `errors` от `@Valid` раскладывается по полям формы. */
  it('раскладывает ошибки валидации сервера по полям', async () => {
    server.use(
      http.post(SUBJECTS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Ошибка валидации',
          instance: '/api/subjects',
          errors: { name: ['Название дисциплины не длиннее 100 символов'] },
        }),
      ),
    );

    renderSubjects();

    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));
    fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Название' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Название дисциплины не длиннее 100 символов'),
    ).toBeInTheDocument();
  });
});

describe('SubjectsPage, правка', () => {
  it('открывает форму со значениями дисциплины и сохраняет их', async () => {
    renderSubjects();

    fireEvent.click(
      within(await screen.findByRole('table')).getByRole('button', {
        name: 'Править дисциплину «Базы данных»',
      }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Правка дисциплины' });
    const name = within(dialog).getByLabelText('Название');
    expect(name).toHaveValue('Базы данных');

    fireEvent.change(name, { target: { value: 'Базы данных и знаний' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Дисциплина «Базы данных и знаний» сохранена'),
    ).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Базы данных и знаний' })).toBeInTheDocument();
  });

  /**
   * Начальные значения берутся при монтировании окна: если открыть форму
   * второй дисциплины, не размонтировав первую, в полях осталась бы
   * предыдущая запись — и правка ушла бы не туда.
   */
  it('показывает поля той дисциплины, которую открыли второй', async () => {
    renderSubjects();

    const table = await screen.findByRole('table');

    fireEvent.click(
      within(table).getByRole('button', { name: 'Править дисциплину «Базы данных»' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));
    fireEvent.click(
      within(table).getByRole('button', { name: 'Править дисциплину «Компьютерные сети»' }),
    );

    expect(screen.getByLabelText('Название')).toHaveValue('Компьютерные сети');
  });
});

describe('SubjectsPage, удаление', () => {
  it('спрашивает подтверждение и удаляет', async () => {
    renderSubjects();

    fireEvent.click(
      within(await screen.findByRole('table')).getByRole('button', {
        name: 'Удалить дисциплину «Базы данных»',
      }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Удалить дисциплину?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Дисциплина «Базы данных» удалена')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Базы данных' })).not.toBeInTheDocument(),
    );
  });

  it('ничего не удаляет по «Отмене»', async () => {
    renderSubjects();

    fireEvent.click(
      within(await screen.findByRole('table')).getByRole('button', {
        name: 'Удалить дисциплину «Базы данных»',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Базы данных' })).toBeInTheDocument();
  });

  /**
   * Назначенную дисциплину бэкенд удалить не даёт и объясняет, почему.
   * Текст приходит готовым — показываем его как есть: он говорит,
   * скольким карточкам она назначена и что делать дальше.
   */
  it('показывает отказ, когда дисциплина назначена преподавателям', async () => {
    server.use(
      http.delete('*/api/subjects/:id', () =>
        problemResponse(409, {
          title: 'Conflict',
          detail: 'Дисциплина назначена преподавателям (3), сначала снять её с карточек',
          instance: '/api/subjects/2',
        }),
      ),
    );

    renderSubjects();

    fireEvent.click(
      within(await screen.findByRole('table')).getByRole('button', {
        name: 'Удалить дисциплину «Базы данных»',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(
      await screen.findByText(
        'Дисциплина назначена преподавателям (3), сначала снять её с карточек',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Базы данных' })).toBeInTheDocument();
  });
});

describe('SubjectsPage, данные', () => {
  /**
   * Сторож фикстуры: на её порядке стоят проверки сортировки, а на её
   * длине — проверки пагинации. Перемешанная или урезанная, она зеленила
   * бы их сама собой.
   */
  it('фикстура — две страницы по алфавиту названий', () => {
    expect(subjectsFixture).toHaveLength(23);

    const names = subjectsFixture.map((subject) => subject.name);
    expect([...names].sort((a, b) => a.localeCompare(b, 'ru'))).toEqual(names);
  });
});
