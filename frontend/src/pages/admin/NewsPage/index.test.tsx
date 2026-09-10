import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fileHandlers, makeNews, newsFixture, newsHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { NewsRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import AdminNewsPage from './index';
/*
 * Ленивый кусок редактора (F-41) — статическим импортом, ради времени.
 * Первый `findBy` иначе ждёт не рендера, а разбора TipTap, и на раннере
 * CI это дольше секунды. Разбор — в `pages/PersonalPage/index.test.tsx`.
 */
import '@shared/ui/RichTextEditor/Editor';

const NEWS = '*/api/news';

/**
 * Раздел новостей и объявлений админки.
 *
 * Прав здесь не проверяют: за них отвечает `RoleRoute`, и у него свои
 * шесть проверок. Страница рендерится напрямую — как и остальные страницы
 * портала в тестах.
 *
 * Вместе со страницей монтируется уголок тостов: сообщение об успехе
 * и об отказе — часть поведения раздела, и проверять его на самом сторе
 * значило бы проверять не то, что увидит человек.
 */
function renderNews(route = '/admin/news') {
  return renderWithProviders(
    <>
      <AdminNewsPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/**
 * Свой список на каждый тест.
 *
 * Мок новостей помнит, что в нём создали, поправили и удалили, а набор
 * по умолчанию собирается один раз на весь прогон — то есть заведённая
 * в одном тесте запись осталась бы в списке у следующего. `server.use`
 * кладёт поверх свежую копию, а `resetHandlers` в общей обвязке снимает
 * её после теста.
 */
beforeEach(() => {
  server.use(...newsHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

/**
 * Поле заголовка — по роли, а не по подписи: «Заголовок» в форме зовутся
 * двое, поле ввода и кнопка панели редактора, которая делает из абзаца
 * заголовок второго уровня. Диктор их различает ролью, тест — тоже.
 */
function titleField(scope: ReturnType<typeof within>) {
  return scope.getByRole('textbox', { name: 'Заголовок' });
}

/** Строка таблицы, в которой лежит запись с таким заголовком. */
function rowOf(title: string) {
  const cell = screen.getByRole('cell', { name: title });
  const row = cell.closest('tr');

  if (!row) throw new Error(`строки с записью «${title}» нет в разметке`);

  return within(row);
}

describe('AdminNewsPage, список', () => {
  it('показывает записи первой страницы, новые сверху', async () => {
    renderNews();

    expect(await screen.findByRole('cell', { name: 'Черновик объявления' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Новость 1' })).toBeInTheDocument();

    // Двадцать первая запись — уже на второй странице: размер страницы
    // держит контракт, а не фронт.
    expect(screen.queryByRole('cell', { name: 'Новость 16' })).not.toBeInTheDocument();
  });

  /**
   * Ради этого у списка админки и есть отдельная ручка: `GET /api/news`
   * отдаёт скрытые записи, которых в ленте нет вовсе. Не отличать
   * их в таблице значило бы показывать модератору список, из которого
   * не видно, что опубликовано.
   */
  it('отличает черновик от опубликованной записи', async () => {
    renderNews();

    await screen.findByRole('cell', { name: 'Черновик новости' });

    expect(rowOf('Черновик новости').getByText('Черновик')).toBeInTheDocument();
    expect(rowOf('Новость 1').getByText('Опубликована')).toBeInTheDocument();
  });

  it('показывает объявления, когда они выбраны в адресе', async () => {
    renderNews('/admin/news?postType=announcements');

    expect(await screen.findByRole('cell', { name: 'Объявление 1' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Новость 1' })).not.toBeInTheDocument();
  });

  it('переключает тип записи ссылкой фильтра', async () => {
    renderNews();

    await screen.findByRole('cell', { name: 'Новость 1' });
    fireEvent.click(screen.getByRole('link', { name: 'Объявления' }));

    // Пятое объявление в смешанном списке лежит на второй странице,
    // то есть на первой оно появляется только после отбора. «Объявление 1»
    // на его месте зеленело бы и без фильтра — оно видно и так.
    expect(await screen.findByRole('cell', { name: 'Объявление 5' })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Новость 1' })).not.toBeInTheDocument(),
    );
  });

  /**
   * Отбор делает бэкенд, и `totalElements` он считает с учётом фильтра.
   * Потерянный при перелистывании параметр показал бы на второй странице
   * смешанный список — и это не гипотеза, а то, ради чего адрес списка
   * собирается одним сборщиком.
   */
  it('сохраняет фильтр в ссылках пагинатора', async () => {
    renderNews('/admin/news?postType=news');

    await screen.findByRole('cell', { name: 'Новость 1' });

    expect(screen.getByRole('link', { name: 'Страница 2' })).toHaveAttribute(
      'href',
      '/admin/news?page=2&postType=news',
    );
  });

  it('открывает вторую страницу из адреса', async () => {
    renderNews('/admin/news?page=2');

    expect(await screen.findByRole('cell', { name: 'Новость 16' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Новость 1' })).not.toBeInTheDocument();
  });

  /**
   * Порядок берётся из адреса и уезжает в запрос: сортировка серверная,
   * и страница обязана попросить её у бэкенда, а не переставить двадцать
   * загруженных строк.
   */
  it('запрашивает обратный порядок, когда он задан в адресе', async () => {
    renderNews('/admin/news?sort=createdAt,asc');

    expect(await screen.findByRole('cell', { name: 'Новость 23' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Черновик объявления' })).not.toBeInTheDocument();
  });

  /**
   * `?sort=createdAt,desc` — не то же самое, что отсутствие параметра:
   * заданный порядок заменяет умолчание контракта целиком, вместе
   * с ключом `id`, который идёт в нём вторым и делает листание устойчивым.
   * Найдено в браузере: запрос уходил со «своим таким же» порядком.
   */
  it('не отправляет порядок по умолчанию — у контракта он с ключом id', async () => {
    let requested: string | null = null;
    // Хендлер без ответа пропускает запрос дальше по набору: смотрим
    // адрес, не подменяя выдачу.
    server.use(
      http.get(NEWS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderNews();
    await screen.findByRole('cell', { name: 'Новость 1' });

    expect(requested).not.toContain('sort=');
  });

  it('отправляет порядок, отличный от умолчания', async () => {
    let requested: string | null = null;
    server.use(
      http.get(NEWS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderNews('/admin/news?sort=createdAt,asc');
    await screen.findByRole('cell', { name: 'Новость 23' });

    expect(requested).toContain('sort=createdAt,asc');
  });

  it('меняет порядок кликом по заголовку даты', async () => {
    renderNews();

    fireEvent.click(await screen.findByRole('button', { name: /Дата/ }));

    expect(await screen.findByRole('cell', { name: 'Новость 23' })).toBeInTheDocument();
  });

  it('говорит, что записей нет вовсе', async () => {
    server.use(...newsHandlers([]));

    renderNews();

    expect(await screen.findByText('Записей пока нет')).toBeInTheDocument();
  });

  /**
   * Пустой список — про то, что отобрано. «Записей пока нет» на выбранных
   * объявлениях было бы неправдой: новостей рядом три десятка.
   */
  it('называет пустым отобранное, а не раздел целиком', async () => {
    server.use(...newsHandlers([makeNews({ id: 1, title: 'Новость 1' })]));

    renderNews('/admin/news?postType=announcements');

    expect(await screen.findByText('Объявлений пока нет')).toBeInTheDocument();
  });

  /** Страница за пределами данных — `200` с пустым `content`, а не ошибка. */
  it('объясняет страницу за пределами данных', async () => {
    renderNews('/admin/news?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(NEWS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/news',
        }),
      ),
    );

    renderNews();

    expect(await screen.findByText('Не удалось загрузить записи')).toBeInTheDocument();

    server.use(...newsHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Новость 1' })).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderNews();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

/**
 * Форма записи: создание, правка, удаление.
 *
 * Список здесь короткий, а не фикстура целиком, и это не экономия:
 * созданная запись получает дату «сейчас», то есть на списке из тридцати
 * августовских записей её место зависело бы от часов машины.
 */
describe('AdminNewsPage, создание', () => {
  beforeEach(() => {
    server.use(...newsHandlers([makeNews({ id: 1, title: 'Новость 1' })]), ...fileHandlers());
  });

  /**
   * Область ввода редактора: `contenteditable`, объявленный полем ввода
   * для диктора. Ждём с запасом — поле приезжает отдельным куском.
   */
  async function openForm(title = 'Новая запись') {
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));

    const dialog = screen.getByRole('dialog', { name: title });

    return {
      dialog: within(dialog),
      content: await within(dialog).findByRole('textbox', { name: 'Содержание' }, { timeout: 3000 }),
    };
  }

  /**
   * Набранный текст — вставкой из буфера: ProseMirror читает правки
   * области ввода наблюдателем за DOM, и напечатать в него `fireEvent`
   * нельзя. Вставка проходит теми же обработчиками, что и у человека
   * (`shared/ui/RichTextEditor/index.test.tsx`).
   */
  function pasteText(area: HTMLElement, text: string) {
    fireEvent.paste(area, {
      clipboardData: {
        files: [],
        types: ['text/plain'],
        getData: (type: string) => (type === 'text/plain' ? text : ''),
      },
    });
  }

  it('создаёт запись и показывает её в таблице', async () => {
    renderNews();

    const form = await openForm();
    fireEvent.change(titleField(form.dialog), {
      target: { value: 'Приём в магистратуру' },
    });
    pasteText(form.content, 'Документы принимаются до 15 августа.');
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Запись «Приём в магистратуру» создана')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Приём в магистратуру' })).toBeInTheDocument();
  });

  /** Новая запись публикуется, как и в сущности бэкенда (`display = true`). */
  it('заводит запись опубликованной, а не черновиком', async () => {
    renderNews();

    const form = await openForm();

    expect(form.dialog.getByLabelText('Опубликовать')).toBeChecked();
  });

  it('не отправляет пустую форму', async () => {
    renderNews();

    const form = await openForm();
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Укажите заголовок')).toBeInTheDocument();
    expect(screen.getByText('Добавьте текст записи')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /**
   * Нижняя граница заголовка — единственная в API, и проверять её
   * на клиенте стоит: иначе отказ приходит после отправки всей статьи
   * вместе с картинками.
   */
  it('называет нижнюю границу заголовка до запроса', async () => {
    renderNews();

    const form = await openForm();
    fireEvent.change(titleField(form.dialog), { target: { value: 'Итог' } });
    pasteText(form.content, 'Текст');
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Заголовок не короче 5 символов')).toBeInTheDocument();
  });

  /** Словарь `errors` от `@Valid` раскладывается по полям формы. */
  it('раскладывает ошибки валидации сервера по полям', async () => {
    server.use(
      http.post(NEWS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Ошибка валидации',
          instance: '/api/news',
          errors: { content: ['Текст новости пуст после удаления небезопасной разметки'] },
        }),
      ),
    );

    renderNews();

    const form = await openForm();
    fireEvent.change(titleField(form.dialog), {
      target: { value: 'Заголовок записи' },
    });
    pasteText(form.content, 'Текст');
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(
      await screen.findByText('Текст новости пуст после удаления небезопасной разметки'),
    ).toBeInTheDocument();
  });

  /**
   * Обложка отправляется **ключом** из ответа загрузки, а не адресом
   * и не собранным на клиенте путём: правило сборки адреса принадлежит
   * бэкенду, и на чужой ключ приходит `400` (docs/API.md, «Обложка
   * новости»).
   */
  it('отправляет обложку ключом из ответа загрузки', async () => {
    let sent: NewsRequest | null = null;
    server.use(
      http.post(NEWS, async ({ request }) => {
        sent = (await request.json()) as NewsRequest;

        return HttpResponse.json(makeNews({ id: 2, title: 'С обложкой' }), { status: 201 });
      }),
    );

    renderNews();

    const form = await openForm();
    fireEvent.change(titleField(form.dialog), { target: { value: 'С обложкой' } });
    pasteText(form.content, 'Текст');

    fireEvent.change(form.dialog.getByLabelText('Выбрать обложку'), {
      target: { files: [new File(['x'], 'cover.png', { type: 'image/png' })] },
    });

    // Поле описания появляется вместе с обложкой: без картинки описывать
    // нечего.
    const description = await form.dialog.findByLabelText('Описание обложки');
    fireEvent.change(description, { target: { value: 'Здание кафедры' } });
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Запись «С обложкой» создана');

    expect(sent).toMatchObject({
      previewImage: 'news/uploaded-1.jpg',
      previewImageDescription: 'Здание кафедры',
    });
  });

  /** Файл не того формата не уезжает на сервер вовсе — проверка до запроса. */
  it('отказывает негодному файлу обложки до загрузки', async () => {
    renderNews();

    const form = await openForm();
    fireEvent.change(form.dialog.getByLabelText('Выбрать обложку'), {
      target: { files: [new File(['x'], 'anim.gif', { type: 'image/gif' })] },
    });

    expect(await screen.findByText('Подходят только JPEG и PNG.')).toBeInTheDocument();
    expect(form.dialog.queryByLabelText('Описание обложки')).not.toBeInTheDocument();
  });
});

describe('AdminNewsPage, правка', () => {
  async function openEditor(title: string) {
    const table = await screen.findByRole('table');

    fireEvent.click(within(table).getByRole('button', { name: `Править запись «${title}»` }));

    const dialog = screen.getByRole('dialog', { name: 'Правка записи' });
    await within(dialog).findByRole('textbox', { name: 'Содержание' }, { timeout: 3000 });

    return within(dialog);
  }

  it('открывает форму со значениями записи и сохраняет их', async () => {
    renderNews();

    const form = await openEditor('Новость 1');
    const title = titleField(form);
    expect(title).toHaveValue('Новость 1');

    fireEvent.change(title, { target: { value: 'Новость первая' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Запись «Новость первая» сохранена')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Новость первая' })).toBeInTheDocument();
  });

  /**
   * Снять запись с сайта, не удаляя, — это `PUT` с `display: false`
   * (docs/API.md). Проверяется по таблице, а не по телу запроса: важно,
   * что список после этого называет запись черновиком.
   */
  it('снимает запись с публикации флажком', async () => {
    renderNews();

    const form = await openEditor('Новость 1');
    fireEvent.click(form.getByLabelText('Опубликовать'));
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Запись «Новость 1» сохранена');
    await waitFor(() => expect(rowOf('Новость 1').getByText('Черновик')).toBeInTheDocument());
  });

  it('открывает объявление объявлением, а не новостью', async () => {
    renderNews();

    const form = await openEditor('Объявление 1');

    expect(form.getByLabelText('Тип записи')).toHaveValue('announcements');
  });

  /**
   * Начальные значения берутся при монтировании окна: открой форму второй
   * записи, не размонтировав первую, — в полях осталась бы предыдущая,
   * и правка ушла бы не туда.
   */
  it('показывает поля той записи, которую открыли второй', async () => {
    renderNews();

    const first = await openEditor('Новость 1');
    fireEvent.click(first.getByRole('button', { name: 'Отмена' }));

    const second = await openEditor('Новость 2');

    expect(titleField(second)).toHaveValue('Новость 2');
  });
});

describe('AdminNewsPage, удаление', () => {
  function askDelete(title: string) {
    fireEvent.click(screen.getByRole('button', { name: `Удалить запись «${title}»` }));
  }

  it('спрашивает подтверждение и удаляет', async () => {
    renderNews();
    await screen.findByRole('table');

    askDelete('Новость 1');

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить запись?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Запись «Новость 1» удалена')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Новость 1' })).not.toBeInTheDocument(),
    );
  });

  it('ничего не удаляет по «Отмене»', async () => {
    renderNews();
    await screen.findByRole('table');

    askDelete('Новость 1');
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Новость 1' })).toBeInTheDocument();
  });

  /** Запись успели удалить в соседней вкладке: отказ приходит тостом. */
  it('показывает отказ, когда записи уже нет', async () => {
    server.use(
      http.delete('*/api/news/:id', () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Новость не найдена',
          instance: '/api/news/1',
        }),
      ),
    );

    renderNews();
    await screen.findByRole('table');

    askDelete('Новость 1');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Новость не найдена')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Новость 1' })).toBeInTheDocument();
  });
});

describe('AdminNewsPage, данные', () => {
  /**
   * Сторож фикстуры: на числе записей стоят проверки пагинации, на двух
   * черновиках — проверка состояния и весь смысл админской ручки,
   * а на их датах — то, что черновики видны на первой странице в порядке
   * по умолчанию.
   */
  it('фикстура — тридцать записей, из них два свежих черновика', () => {
    expect(newsFixture).toHaveLength(30);

    const drafts = newsFixture.filter((item) => !item.display);
    expect(drafts).toHaveLength(2);

    const newest = [...newsFixture].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    expect(newest.slice(0, 2)).toEqual(drafts.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });
});
