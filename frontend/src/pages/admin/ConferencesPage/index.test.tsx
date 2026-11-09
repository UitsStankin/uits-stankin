import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { conferenceDatesLabel } from '@entities/conference';
import {
  conferenceHandlers,
  conferencesFixture,
  fileHandlers,
  makeConference,
  problemResponse,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { ConferenceRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import AdminConferencesPage from './index';
/*
 * Ленивый кусок редактора (F-41) — статическим импортом, ради времени.
 * Первый `findBy` иначе ждёт не рендера, а разбора TipTap, и на раннере
 * CI это дольше секунды. Разбор — в `pages/PersonalPage/index.test.tsx`.
 */
import '@shared/ui/RichTextEditor/Editor';

const CONFERENCES = '*/api/conferences';

/**
 * Раздел конференций админки. Прав здесь не проверяют — за них отвечает
 * `RoleRoute`; уголок тостов монтируется вместе со страницей, потому что
 * сообщение об исходе — часть поведения раздела.
 */
function renderConferences(route = '/admin/conferences') {
  return renderWithProviders(
    <>
      <AdminConferencesPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/**
 * Свой список на каждый тест: мок помнит созданное и удалённое, а набор
 * по умолчанию собирается один раз на весь прогон.
 */
beforeEach(() => {
  server.use(...conferenceHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

/** Строка таблицы, в которой лежит объявление с таким названием. */
function rowOf(title: string) {
  const cell = screen.getByRole('cell', { name: title });
  const row = cell.closest('tr');

  if (!row) throw new Error(`строки с конференцией «${title}» нет в разметке`);

  return within(row);
}

describe('AdminConferencesPage, список', () => {
  it('показывает первую страницу вместе с черновиками, новые сверху', async () => {
    renderConferences();

    expect(await screen.findByRole('cell', { name: 'Черновик семинара' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Конференция 18' })).toBeInTheDocument();

    // Два черновика свежее всех, поэтому на первой странице
    // опубликованных восемнадцать, а девятнадцатое — уже на второй.
    expect(screen.queryByRole('cell', { name: 'Конференция 19' })).not.toBeInTheDocument();
  });

  /**
   * Ради этого у списка админки и есть отдельная ручка: в публичной
   * черновиков нет вовсе, и не отличать их в таблице значило бы не видеть,
   * что опубликовано.
   */
  it('отличает черновик от опубликованной конференции', async () => {
    renderConferences();

    await screen.findByRole('cell', { name: 'Черновик конференции' });

    expect(rowOf('Черновик конференции').getByText('Черновик')).toBeInTheDocument();
    expect(rowOf('Конференция 1').getByText('Опубликована')).toBeInTheDocument();
  });

  /**
   * Подпись дат та же, что на сайте, — сравнивается с самим форматтером,
   * а не с набранной строкой: тире и пробелы в ней ставит ICU, и сторож
   * на них сторожил бы версию Node, а не страницу.
   */
  it('подписывает даты проведения, как на сайте, и прочерком — заготовку без дат', async () => {
    renderConferences();

    await screen.findByRole('cell', { name: 'Конференция 2' });

    // Testing Library сводит пробелы в тексте разметки к обычному, а ICU
    // ставит неразрывный перед «г.»: искомую строку сводим так же.
    const asShown = (label: string | null) => (label ?? '').replace(/\s+/g, ' ');

    expect(
      rowOf('Конференция 2').getByText(asShown(conferenceDatesLabel('2026-10-02', '2026-10-04'))),
    ).toBeInTheDocument();
    expect(
      rowOf('Конференция 1').getByText(asShown(conferenceDatesLabel('2026-10-01', null))),
    ).toBeInTheDocument();
    expect(rowOf('Черновик семинара').getByText('—')).toBeInTheDocument();
  });

  it('открывает вторую страницу из адреса', async () => {
    renderConferences('/admin/conferences?page=2');

    expect(await screen.findByRole('cell', { name: 'Конференция 19' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Конференция 1' })).not.toBeInTheDocument();
  });

  it('запрашивает обратный порядок, когда он задан в адресе', async () => {
    renderConferences('/admin/conferences?sort=createdAt,asc');

    expect(await screen.findByRole('cell', { name: 'Конференция 23' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Черновик семинара' })).not.toBeInTheDocument();
  });

  /**
   * `?sort=createdAt,desc` — не то же самое, что отсутствие параметра:
   * заданный порядок заменяет умолчание контракта целиком, вместе
   * с ключом `id` (разбор у `useNewsAdmin`).
   */
  it('не отправляет порядок по умолчанию — у контракта он с ключом id', async () => {
    let requested: string | null = null;
    // Хендлер без ответа пропускает запрос дальше: смотрим адрес,
    // не подменяя выдачу.
    server.use(
      http.get(CONFERENCES, ({ request }) => {
        requested = request.url;
      }),
    );

    renderConferences();
    await screen.findByRole('cell', { name: 'Конференция 1' });

    expect(requested).not.toContain('sort=');
  });

  it('меняет порядок кликом по заголовку «Добавлена»', async () => {
    renderConferences();

    fireEvent.click(await screen.findByRole('button', { name: /Добавлена/ }));

    expect(await screen.findByRole('cell', { name: 'Конференция 23' })).toBeInTheDocument();
  });

  it('говорит, что конференций нет вовсе', async () => {
    server.use(...conferenceHandlers([]));

    renderConferences();

    expect(await screen.findByText('Конференций пока нет')).toBeInTheDocument();
  });

  /** Страница за пределами данных — `200` с пустым `content`, а не ошибка. */
  it('объясняет страницу за пределами данных', async () => {
    renderConferences('/admin/conferences?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(CONFERENCES, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/conferences',
        }),
      ),
    );

    renderConferences();

    expect(await screen.findByText('Не удалось загрузить конференции')).toBeInTheDocument();

    server.use(...conferenceHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Конференция 1' })).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderConferences();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

/**
 * Форма: создание. Список короткий, а не фикстура целиком: созданное
 * объявление получает дату «сейчас», и на списке из августовских записей
 * его место зависело бы от часов машины.
 */
describe('AdminConferencesPage, создание', () => {
  beforeEach(() => {
    server.use(
      ...conferenceHandlers([makeConference({ id: 1, title: 'Конференция 1' })]),
      ...fileHandlers(),
    );
  });

  /**
   * Открыть окно и дождаться редактора. Содержание у конференции
   * необязательно, но ждать куска всё равно надо: дорисовавшись после
   * конца теста, редактор уронил бы соседний.
   */
  async function openForm() {
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Новая конференция' }));
    await dialog.findByRole('textbox', { name: 'Содержание' });

    return dialog;
  }

  /** Содержание необязательно: объявление из одного названия — законное. */
  it('создаёт конференцию из одного названия и показывает её в таблице', async () => {
    renderConferences();

    const form = await openForm();
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Станкин-2026' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Конференция «Станкин-2026» создана')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Станкин-2026' })).toBeInTheDocument();
  });

  /** Как и в сущности бэкенда (`ConferenceAnnouncement.display = true`). */
  it('заводит конференцию опубликованной', async () => {
    renderConferences();

    const form = await openForm();
    const publish = form.getByLabelText('Опубликовать');

    expect(publish).toBeChecked();
    expect(publish).toHaveAccessibleDescription(
      'Снятый флажок оставляет объявление черновиком: на сайте его не видно.',
    );
  });

  /**
   * Связка дат проверяется до запроса и вместе с остальными полями,
   * а не после них: пустое название не должно прятать ошибку в датах
   * до второй попытки отправить форму.
   */
  it('проверяет связку дат до запроса вместе с остальными полями', async () => {
    let posted = false;
    server.use(
      http.post(CONFERENCES, () => {
        posted = true;
      }),
    );

    renderConferences();

    const form = await openForm();
    fireEvent.change(form.getByLabelText('Дата окончания'), { target: { value: '2026-10-16' } });
    fireEvent.change(form.getByLabelText('Время начала'), { target: { value: '10:00' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await form.findByText('Дата окончания указана без даты начала')).toBeInTheDocument();
    expect(form.getByText('Время начала указано без даты начала')).toBeInTheDocument();
    expect(form.getByText('Укажите название')).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  it('не пускает дату окончания раньше даты начала', async () => {
    renderConferences();

    const form = await openForm();
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Станкин-2026' } });
    fireEvent.change(form.getByLabelText('Дата начала'), { target: { value: '2026-10-16' } });
    fireEvent.change(form.getByLabelText('Дата окончания'), { target: { value: '2026-10-14' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await form.findByText('Дата окончания раньше даты начала')).toBeInTheDocument();
    expect(form.getByLabelText('Дата окончания')).toHaveAttribute('aria-invalid', 'true');
  });

  /**
   * Формат почты клиент не проверяет — серверный `@Email` мягче любой
   * клиентской проверки. Отказ по нему приходит словарём и встаёт под поле.
   */
  it('кладёт отказ сервера по почте под само поле', async () => {
    server.use(
      http.post(CONFERENCES, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Ошибка валидации',
          instance: '/api/conferences',
          errors: { contactEmail: ['Некорректный адрес почты'] },
        }),
      ),
    );

    renderConferences();

    const form = await openForm();
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Станкин-2026' } });
    fireEvent.change(form.getByLabelText('Почта для связи'), { target: { value: 'conf@' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(form.getByLabelText('Почта для связи')).toHaveAccessibleDescription(
        'Некорректный адрес почты',
      ),
    );
    expect(form.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * Тело целиком: пустые поля уезжают `null`, а не пустой строкой. Для дат
   * и времени это не формальность — поле у них не строковое, и пустая
   * строка там не обязана разобраться вовсе.
   */
  it('отправляет все поля, незаполненные — null', async () => {
    let sent: ConferenceRequest | null = null;
    server.use(
      http.post(CONFERENCES, async ({ request }) => {
        sent = (await request.json()) as ConferenceRequest;

        return HttpResponse.json(makeConference({ id: 2, title: 'Станкин-2026' }), { status: 201 });
      }),
    );

    renderConferences();

    const form = await openForm();
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Станкин-2026' } });
    fireEvent.change(form.getByLabelText('Дата начала'), { target: { value: '2026-10-14' } });
    fireEvent.change(form.getByLabelText('Время начала'), { target: { value: '10:00' } });
    fireEvent.change(form.getByLabelText('Организатор'), { target: { value: 'кафедра УИТС' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Конференция «Станкин-2026» создана');

    expect(sent).toEqual({
      title: 'Станкин-2026',
      description: null,
      startDate: '2026-10-14',
      endDate: null,
      time: '10:00',
      organizer: 'кафедра УИТС',
      contactEmail: null,
      contactPhone: null,
      content: null,
      previewImage: null,
      previewImageDescription: null,
      display: true,
    });
  });

  /**
   * Обложка — ключом из ответа загрузки и из раздела `news`: своего
   * раздела у конференций нет, и ключ из чужого сервер отклонит `400`.
   */
  it('отправляет обложку ключом из раздела news', async () => {
    let sent: ConferenceRequest | null = null;
    server.use(
      http.post(CONFERENCES, async ({ request }) => {
        sent = (await request.json()) as ConferenceRequest;

        return HttpResponse.json(makeConference({ id: 2, title: 'С афишей' }), { status: 201 });
      }),
    );

    renderConferences();

    const form = await openForm();
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'С афишей' } });
    fireEvent.change(form.getByLabelText('Выбрать обложку'), {
      target: { files: [new File(['x'], 'poster.png', { type: 'image/png' })] },
    });

    const description = await form.findByLabelText('Описание обложки');
    fireEvent.change(description, { target: { value: 'Афиша конференции' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Конференция «С афишей» создана');

    expect(sent).toMatchObject({
      previewImage: 'news/uploaded-1.jpg',
      previewImageDescription: 'Афиша конференции',
    });
  });
});

describe('AdminConferencesPage, правка', () => {
  async function openEditor(title: string) {
    const table = await screen.findByRole('table');

    fireEvent.click(within(table).getByRole('button', { name: `Править конференцию «${title}»` }));

    const dialog = within(screen.getByRole('dialog', { name: 'Правка конференции' }));
    await dialog.findByRole('textbox', { name: 'Содержание' });

    return dialog;
  }

  it('открывает форму со значениями конференции и сохраняет правку', async () => {
    renderConferences();

    const form = await openEditor('Конференция 1');
    const title = form.getByLabelText('Название');
    expect(title).toHaveValue('Конференция 1');

    fireEvent.change(title, { target: { value: 'Конференция первая' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Конференция «Конференция первая» сохранена')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Конференция первая' })).toBeInTheDocument();
  });

  /** Даты и время — в родных полях, в том виде, в каком их отдал контракт. */
  it('открывает даты и время проведения в своих полях', async () => {
    renderConferences();

    const form = await openEditor('Конференция 2');

    expect(form.getByLabelText('Дата начала')).toHaveValue('2026-10-02');
    expect(form.getByLabelText('Дата окончания')).toHaveValue('2026-10-04');
    expect(form.getByLabelText('Время начала')).toHaveValue('10:00');
  });

  /**
   * Черновик обязан открыться черновиком: иначе правка чужого черновика
   * молча выкладывала бы его на сайт.
   */
  it('открывает черновик со снятым флажком публикации', async () => {
    renderConferences();

    const form = await openEditor('Черновик конференции');

    expect(form.getByLabelText('Опубликовать')).not.toBeChecked();
  });

  it('снимает конференцию с публикации флажком', async () => {
    renderConferences();

    const form = await openEditor('Конференция 1');
    fireEvent.click(form.getByLabelText('Опубликовать'));
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Конференция «Конференция 1» сохранена');
    await waitFor(() => expect(rowOf('Конференция 1').getByText('Черновик')).toBeInTheDocument());
  });

  /**
   * `PUT` — полная замена: поле, не пришедшее в теле, обнуляется. Ключа
   * обложки в форме не видно вовсе, и потерянный ключ означает удалённый
   * с диска файл, — поэтому тело проверяется целиком.
   */
  it('отправляет в правке все поля, включая невидимые в форме', async () => {
    const full = makeConference({
      id: 7,
      title: 'Станкин-2026',
      description: 'Ежегодная конференция кафедры.',
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      time: '10:00',
      organizer: 'кафедра УИТС',
      contactEmail: 'conf@stankin.ru',
      contactPhone: '+7 (499) 972-95-84',
      content: '<p>Приглашаем.</p>',
      previewImage: 'news/2026/08/poster.jpg',
      previewImageUrl: '/media/news/2026/08/poster.jpg',
      previewImageDescription: 'Афиша конференции',
    });

    let sent: ConferenceRequest | null = null;
    // Перехватчик — первым: `server.use` проверяет хендлеры по порядку.
    server.use(
      http.put('*/api/conferences/:id', async ({ request }) => {
        sent = (await request.json()) as ConferenceRequest;

        return HttpResponse.json({ ...full, title: 'Станкин-2026. Итоги' });
      }),
      ...conferenceHandlers([full]),
    );

    renderConferences();

    const form = await openEditor('Станкин-2026');
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Станкин-2026. Итоги' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Конференция «Станкин-2026. Итоги» сохранена');

    expect(sent).toEqual({
      title: 'Станкин-2026. Итоги',
      description: 'Ежегодная конференция кафедры.',
      startDate: '2026-10-14',
      endDate: '2026-10-16',
      time: '10:00',
      organizer: 'кафедра УИТС',
      contactEmail: 'conf@stankin.ru',
      contactPhone: '+7 (499) 972-95-84',
      content: '<p>Приглашаем.</p>',
      previewImage: 'news/2026/08/poster.jpg',
      previewImageDescription: 'Афиша конференции',
      display: true,
    });
  });

  it('снимает обложку вместе с её описанием', async () => {
    const withCover = makeConference({
      id: 8,
      title: 'Станкин-2026',
      previewImage: 'news/2026/08/poster.jpg',
      previewImageUrl: '/media/news/2026/08/poster.jpg',
      previewImageDescription: 'Афиша конференции',
    });

    let sent: ConferenceRequest | null = null;
    server.use(
      http.put('*/api/conferences/:id', async ({ request }) => {
        sent = (await request.json()) as ConferenceRequest;

        return HttpResponse.json(withCover);
      }),
      ...conferenceHandlers([withCover]),
    );

    renderConferences();

    const form = await openEditor('Станкин-2026');
    expect(form.getByLabelText('Описание обложки')).toHaveValue('Афиша конференции');

    fireEvent.click(form.getByRole('button', { name: 'Убрать обложку' }));
    expect(form.queryByLabelText('Описание обложки')).not.toBeInTheDocument();

    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));
    await screen.findByText('Конференция «Станкин-2026» сохранена');

    expect(sent).toMatchObject({ previewImage: null, previewImageDescription: null });
  });

  /** Начальные значения берутся при монтировании окна. */
  it('показывает поля той конференции, которую открыли второй', async () => {
    renderConferences();

    const first = await openEditor('Конференция 1');
    fireEvent.click(first.getByRole('button', { name: 'Отмена' }));

    const second = await openEditor('Конференция 2');

    expect(second.getByLabelText('Название')).toHaveValue('Конференция 2');
  });
});

describe('AdminConferencesPage, удаление', () => {
  function askDelete(title: string) {
    fireEvent.click(screen.getByRole('button', { name: `Удалить конференцию «${title}»` }));
  }

  it('спрашивает подтверждение и удаляет', async () => {
    renderConferences();
    await screen.findByRole('table');

    askDelete('Конференция 1');

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить конференцию?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Конференция «Конференция 1» удалена')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Конференция 1' })).not.toBeInTheDocument(),
    );
  });

  it('ничего не удаляет по «Отмене»', async () => {
    renderConferences();
    await screen.findByRole('table');

    askDelete('Конференция 1');
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Конференция 1' })).toBeInTheDocument();
  });

  /** Объявление успели удалить в соседней вкладке: отказ приходит тостом. */
  it('показывает отказ, когда конференции уже нет', async () => {
    server.use(
      http.delete('*/api/conferences/:id', () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Конференция id=1 не найдена',
          instance: '/api/conferences/1',
        }),
      ),
    );

    renderConferences();
    await screen.findByRole('table');

    askDelete('Конференция 1');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Конференция id=1 не найдена')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Конференция 1' })).toBeInTheDocument();
  });
});

describe('AdminConferencesPage, данные', () => {
  /**
   * Сторож фикстуры: на двадцати трёх опубликованных стоят проверки
   * пагинации публичного списка, на двух черновиках — смысл админской
   * ручки, на их датах — то, что черновики видны первыми.
   */
  it('фикстура — двадцать три опубликованных и два свежих черновика', () => {
    expect(conferencesFixture).toHaveLength(25);
    expect(conferencesFixture.filter((item) => !item.display).map((item) => item.id)).toEqual([24, 25]);

    const newest = [...conferencesFixture].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    expect(newest.slice(0, 2).every((item) => !item.display)).toBe(true);
  });
});
