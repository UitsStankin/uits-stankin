import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { editablePageKeys } from '@entities/editable-page';
import { editablePageHandlers, fileHandlers, problemResponse } from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { EditablePage, EditablePageRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { createTestQueryClient, renderWithProviders } from '@/test/render';

import EditablePageFormPage from './index';

const PAGE_ITEM = '*/api/pages/:slug';
const PUBLIC_PAGE = '*/api/public/pages/:slug';

/**
 * Исходник раздела. Пробелы в конце первой строки адреса не опечатка:
 * в Markdown это перенос строки, и форма обязана вернуть их серверу
 * так же, как получила.
 */
const CONTACTS = '## Как нас найти\n\nМосква, Вадковский переулок, 1  \nкорпус 3';

/**
 * Форма раздела: адрес → чтение → правка → запрос.
 *
 * Через роут, а не голым рендером: слаг приходит из адреса. Рядом стоит
 * заглушка списка — после сохранения форма уходит туда, и увидеть переход
 * иначе нечем.
 */
function renderForm(path = '/admin/pages/contacts', queryClient = createTestQueryClient()) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/admin/pages" element={<p>Список разделов</p>} />
        <Route path="/admin/pages/:slug" element={<EditablePageFormPage />} />
      </Routes>
      <ToastViewport />
    </>,
    { route: path, queryClient },
  );
}

/** Ответ `PUT` — раздел после правки, собранный из тела. */
function savedFrom(slug: string, body: EditablePageRequest): EditablePage {
  return {
    slug: slug as EditablePage['slug'],
    title: body.title,
    text: body.text,
    createdAt: '2026-08-01T10:15:30.123456+03:00',
    updatedAt: '2026-09-11T10:15:30.123456+03:00',
  };
}

beforeEach(() => {
  server.use(...editablePageHandlers({ contacts: CONTACTS }), ...fileHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

const titleField = () => screen.getByRole('textbox', { name: 'Подпись раздела' });
const textField = () => screen.getByRole<HTMLTextAreaElement>('textbox', { name: 'Текст раздела' });

describe('EditablePageFormPage, правка', () => {
  it('открывает раздел с его подписью и исходником как есть', async () => {
    renderForm();

    expect(await screen.findByRole('textbox', { name: 'Подпись раздела' })).toHaveValue('Контакты');
    expect(textField()).toHaveValue(CONTACTS);
  });

  /**
   * Ради этого разделы и правятся исходником, а не WYSIWYG: таблицы,
   * чекбоксы GFM и пробелы в конце строки обязаны доехать до сервера
   * побайтово — rich-text редактор потерял бы первые два при открытии
   * формы, а `trim` в схеме срезал бы третьи.
   */
  it('сохраняет исходник побайтово — с таблицей, чекбоксами и переносами', async () => {
    const source =
      '| Курс | Часы |\n|---|---|\n| 1 | 144 |\n\n- [ ] план\n- [x] практика\n\nстрока  \nперенос\n';

    let sent: EditablePageRequest | null = null;
    server.use(
      http.put(PAGE_ITEM, async ({ params, request }) => {
        const body = (await request.json()) as EditablePageRequest;
        sent = body;

        return HttpResponse.json(savedFrom(String(params.slug), body));
      }),
    );

    renderForm();

    fireEvent.change(await screen.findByRole('textbox', { name: 'Текст раздела' }), {
      target: { value: source },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Раздел «Контакты» сохранён');

    expect(sent).toEqual({ title: 'Контакты', text: source });
  });

  it('после сохранения возвращается к списку разделов', async () => {
    renderForm();

    await screen.findByRole('textbox', { name: 'Подпись раздела' });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Список разделов')).toBeInTheDocument();
  });

  /**
   * Пустая строка — законное «опустошить раздел», и уходит она строкой:
   * `null` в `text` сервер отклоняет (docs/API.md).
   */
  it('опустошает раздел пустой строкой, а не null', async () => {
    let sent: EditablePageRequest | null = null;
    server.use(
      http.put(PAGE_ITEM, async ({ params, request }) => {
        const body = (await request.json()) as EditablePageRequest;
        sent = body;

        return HttpResponse.json(savedFrom(String(params.slug), body));
      }),
    );

    renderForm();

    fireEvent.change(await screen.findByRole('textbox', { name: 'Текст раздела' }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Раздел «Контакты» сохранён');

    expect(sent).toEqual({ title: 'Контакты', text: '' });
  });

  /**
   * Контракт прямо: раздел, прочитанный с `title: null`, сохранить,
   * не заполнив подпись, нельзя. Форма обязана сказать это до запроса.
   */
  it('требует подпись у раздела, пришедшего без неё, до запроса', async () => {
    let put = false;
    server.use(
      http.get(PUBLIC_PAGE, ({ params }) =>
        HttpResponse.json({ ...savedFrom(String(params.slug), { title: '', text: CONTACTS }), title: null }),
      ),
      http.put(PAGE_ITEM, () => {
        put = true;
      }),
    );

    renderForm();

    expect(await screen.findByRole('textbox', { name: 'Подпись раздела' })).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Укажите подпись раздела')).toBeInTheDocument();
    expect(put).toBe(false);
  });

  it('кладёт отказ сервера по подписи под само поле', async () => {
    server.use(
      http.put(PAGE_ITEM, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Ошибка валидации',
          instance: '/api/pages/contacts',
          errors: { title: ['Подпись раздела длиннее 255 символов'] },
        }),
      ),
    );

    renderForm();

    await screen.findByRole('textbox', { name: 'Подпись раздела' });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() =>
      expect(titleField()).toHaveAccessibleDescription('Подпись раздела длиннее 255 символов'),
    );
  });

  it('показывает отказ без адреса поля баннером и остаётся на форме', async () => {
    server.use(
      http.put(PAGE_ITEM, () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Раздел contacts не найден',
          instance: '/api/pages/contacts',
        }),
      ),
    );

    renderForm();

    await screen.findByRole('textbox', { name: 'Подпись раздела' });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Раздел contacts не найден')).toBeInTheDocument();
    expect(titleField()).toBeInTheDocument();
  });

  it('по «Отмене» возвращается к списку без запроса', async () => {
    let put = false;
    server.use(
      http.put(PAGE_ITEM, () => {
        put = true;
      }),
    );

    renderForm();

    fireEvent.change(await screen.findByRole('textbox', { name: 'Подпись раздела' }), {
      target: { value: 'Контакты кафедры' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(await screen.findByText('Список разделов')).toBeInTheDocument();
    expect(put).toBe(false);
  });

  /** Картинки раздела — в раздел хранилища `pages`, его завёл T-79 под эту форму. */
  it('вставляет картинку в текст адресом из раздела pages', async () => {
    renderForm();

    const field = await screen.findByRole<HTMLTextAreaElement>('textbox', { name: 'Текст раздела' });
    field.setSelectionRange(CONTACTS.length, CONTACTS.length);

    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (input === null) throw new Error('выбора файла нет в разметке');

    fireEvent.change(input, {
      target: { files: [new File(['x'], 'map.png', { type: 'image/png' })] },
    });

    await waitFor(() =>
      expect(field).toHaveValue(`${CONTACTS}![](/media/pages/uploaded-1.jpg)`),
    );
  });
});

describe('EditablePageFormPage, адрес и загрузка', () => {
  /** Набор слагов закрыт: опечатка в адресе до сервера не доезжает. */
  it('не спрашивает сервер о слаге вне закрытого набора', async () => {
    let requested = false;
    server.use(
      http.get(PUBLIC_PAGE, () => {
        requested = true;
      }),
    );

    renderForm('/admin/pages/contact');

    expect(await screen.findByText('Такого раздела нет')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  /**
   * При негодном слаге запрос выключен, но ключ-заглушка указывает
   * на настоящий раздел. Открытые раньше «Контакты» не должны подставиться
   * в форму по адресу с опечаткой.
   */
  it('не подставляет раздел из кэша по адресу с опечаткой', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      editablePageKeys.item('contacts'),
      savedFrom('contacts', { title: 'Контакты', text: CONTACTS }),
    );

    renderForm('/admin/pages/contact', queryClient);

    expect(await screen.findByText('Такого раздела нет')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Подпись раздела' })).not.toBeInTheDocument();
  });

  /** `404` по настоящему слагу — не доехавшая миграция; для человека раздела нет. */
  it('называет раздел несуществующим на 404 по настоящему слагу', async () => {
    server.use(
      http.get(PUBLIC_PAGE, () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Раздел contacts не найден',
          instance: '/api/public/pages/contacts',
        }),
      ),
    );

    renderForm();

    expect(await screen.findByText('Такого раздела нет')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(PUBLIC_PAGE, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/public/pages/contacts',
        }),
      ),
    );

    renderForm();

    expect(await screen.findByText('Не удалось загрузить раздел')).toBeInTheDocument();

    server.use(...editablePageHandlers({ contacts: CONTACTS }));
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('textbox', { name: 'Подпись раздела' })).toHaveValue('Контакты');
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderForm();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});
