import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  fileHandlers,
  makeSubject,
  makeTeacher,
  makeUserDirectoryEntry,
  problemResponse,
  subjectHandlers,
  teacherHandlers,
  userDirectoryHandlers,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { useToastStore } from '@shared/store';
import type { TeacherAdminRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import TeacherFormPage from './index';
/*
 * Ленивый кусок редактора (F-41) — статическим импортом, ради времени.
 * Первый `findBy` иначе ждёт не рендера, а разбора TipTap, и на раннере
 * CI это дольше секунды. Разбор — в `pages/PersonalPage/index.test.tsx`.
 */
import '@shared/ui/RichTextEditor/Editor';

const TEACHERS = '*/api/teachers';

/**
 * Форма карточки ППС: адрес → догрузка → правка → запрос.
 *
 * Через роут, а не голым рендером: «новая карточка» и «правка» —
 * это разные адреса, и отличает их наличие параметра. Рядом стоит
 * заглушка списка: после сохранения форма уходит туда, и увидеть переход
 * иначе нечем.
 */
function renderForm(path: string) {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/admin/teachers" element={<p>Список преподавателей</p>} />
        <Route path="/admin/teachers/new" element={<TeacherFormPage />} />
        <Route path="/admin/teachers/:id" element={<TeacherFormPage />} />
      </Routes>
      <ToastViewport />
    </>,
    { route: path },
  );
}

/**
 * Карточка с заполненными полями и двумя дисциплинами: правка проверяется
 * на ней, а не на умолчании фикстуры, — так видно, что форма показывает
 * именно то, что пришло.
 */
function card() {
  return makeTeacher({
    id: 3,
    userId: 102,
    lastName: 'Андреева',
    firstName: 'Ольга',
    patronymic: 'Викторовна',
    position: 'профессор кафедры',
    avatar: 'avatars/2026/08/a3f9.jpg',
    avatarUrl: '/media/avatars/2026/08/a3f9.jpg',
    subjects: [makeSubject({ id: 1, name: 'Базы данных' })],
  });
}

beforeEach(() => {
  server.use(
    ...teacherHandlers([card()]),
    ...subjectHandlers([
      makeSubject({ id: 1, name: 'Базы данных' }),
      makeSubject({ id: 2, name: 'Операционные системы' }),
    ]),
    ...userDirectoryHandlers([
      makeUserDirectoryEntry({ id: 101, lastName: 'Абрамов', firstName: 'Никита' }),
      makeUserDirectoryEntry({ id: 102, lastName: 'Андреева', firstName: 'Ольга' }),
    ]),
    ...fileHandlers(),
  );
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

describe('TeacherFormPage, правка', () => {
  /**
   * Ради этой догрузки форма и живёт своим адресом: списочная ручка
   * отдаёт короткую карточку — без контактов, стажей, дисциплин, ключа
   * фото и связи с учёткой. Подсадить её в форму значило бы открыть форму
   * с пустыми полями, которые заполнятся через мгновение.
   */
  it('догружает полную карточку и показывает её поля', async () => {
    renderForm('/admin/teachers/3');

    expect(await screen.findByDisplayValue('Андреева')).toBeInTheDocument();
    expect(screen.getByDisplayValue('профессор кафедры')).toBeInTheDocument();
    expect(screen.getByLabelText('Электронная почта')).toHaveValue('petrov@stankin.ru');
  });

  it('отмечает дисциплины карточки и не отмечает остальные', async () => {
    renderForm('/admin/teachers/3');

    expect(await screen.findByRole('checkbox', { name: 'Базы данных' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Операционные системы' })).not.toBeChecked();
  });

  /**
   * Связь с учёткой приходит полем `userId`, которого в типах фронта
   * не было вовсе до F-44. Форма обязана её показать и отправить обратно:
   * `PUT` — полная замена, и не отправленная связь снялась бы молча.
   */
  it('показывает выбранной учётную запись карточки', async () => {
    renderForm('/admin/teachers/3');

    // Ждём справочник, а не поле: пока опций нет, у `<select>` нет
    // и значения — браузеру не из чего его выбрать.
    await screen.findByRole('option', { name: 'Андреева Ольга' });

    expect(screen.getByLabelText('Учётная запись')).toHaveValue('102');
  });

  it('отправляет правку и уходит к списку', async () => {
    renderForm('/admin/teachers/3');

    fireEvent.change(await screen.findByDisplayValue('профессор кафедры'), {
      target: { value: 'заведующий кафедрой' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Список преподавателей')).toBeInTheDocument();
    expect(screen.getByText('Карточка «Андреева Ольга» сохранена')).toBeInTheDocument();
  });

  /**
   * Тело `PUT` целиком: ручка — полная замена, и поле, которого в нём
   * нет, обнуляется. Отдельная проверка, потому что глазами этого
   * не видно: форма выглядит одинаково и когда отправляет ключ фото,
   * и когда забыла его.
   */
  it('отправляет ключ фото, связь и дисциплины обратно', async () => {
    let body: TeacherAdminRequest | null = null;
    server.use(
      http.put(`${TEACHERS}/:id`, async ({ request }) => {
        body = (await request.json()) as TeacherAdminRequest;

        return HttpResponse.json(card());
      }),
    );

    renderForm('/admin/teachers/3');

    fireEvent.click(await screen.findByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({
      lastName: 'Андреева',
      avatar: 'avatars/2026/08/a3f9.jpg',
      userId: 102,
      subjectIds: [1],
    });
  });

  it('снимает дисциплину флажком', async () => {
    let body: TeacherAdminRequest | null = null;
    server.use(
      http.put(`${TEACHERS}/:id`, async ({ request }) => {
        body = (await request.json()) as TeacherAdminRequest;

        return HttpResponse.json(card());
      }),
    );

    renderForm('/admin/teachers/3');

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Базы данных' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Операционные системы' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ subjectIds: [2] });
  });

  /**
   * Снять связь модератор должен уметь тем же списком, что и поставить:
   * учётной записи у карточки может не быть вовсе, и это штатно.
   */
  it('снимает связь с учётной записью', async () => {
    let body: TeacherAdminRequest | null = null;
    server.use(
      http.put(`${TEACHERS}/:id`, async ({ request }) => {
        body = (await request.json()) as TeacherAdminRequest;

        return HttpResponse.json(card());
      }),
    );

    renderForm('/admin/teachers/3');

    fireEvent.change(await screen.findByLabelText('Учётная запись'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ userId: null });
  });

  /**
   * Кнопка удаления фото есть только у модератора: в личном кабинете
   * её нет намеренно, и это проверяется там же (`PersonalPage`).
   */
  it('снимает фото и отправляет пустой ключ', async () => {
    let body: TeacherAdminRequest | null = null;
    server.use(
      http.put(`${TEACHERS}/:id`, async ({ request }) => {
        body = (await request.json()) as TeacherAdminRequest;

        return HttpResponse.json(card());
      }),
    );

    renderForm('/admin/teachers/3');

    fireEvent.click(await screen.findByRole('button', { name: 'Удалить фото' }));
    fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body).toMatchObject({ avatar: null });
  });

  it('говорит, что карточки нет', async () => {
    renderForm('/admin/teachers/99');

    expect(await screen.findByText('Карточка не найдена')).toBeInTheDocument();
  });

  /**
   * Нечисловой адрес в запрос не уходит вовсе: на «abc» бэкенд ответил бы
   * `400`, и человек увидел бы «ошибка сервера» вместо «нет такой
   * карточки».
   */
  it('не ходит на сервер за нечисловым адресом', async () => {
    let requested = false;
    server.use(
      http.get('*/api/public/teachers/:id', () => {
        requested = true;
      }),
    );

    renderForm('/admin/teachers/abc');

    expect(await screen.findByText('Карточка не найдена')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderForm('/admin/teachers/3');

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

describe('TeacherFormPage, создание', () => {
  it('открывает пустую форму без запроса за карточкой', async () => {
    let requested = false;
    server.use(
      http.get('*/api/public/teachers/:id', () => {
        requested = true;
      }),
    );

    renderForm('/admin/teachers/new');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Новая карточка преподавателя' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Фамилия')).toHaveValue('');
    expect(requested).toBe(false);
  });

  it('называет кнопку «Создать», а не «Сохранить»', async () => {
    renderForm('/admin/teachers/new');

    expect(await screen.findByRole('button', { name: 'Создать' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Сохранить' })).not.toBeInTheDocument();
  });

  it('заводит карточку и уходит к списку', async () => {
    renderForm('/admin/teachers/new');

    fireEvent.change(await screen.findByLabelText('Фамилия'), { target: { value: 'Волков' } });
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Артём' } });
    fireEvent.change(screen.getByLabelText('Должность'), { target: { value: 'ассистент' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Список преподавателей')).toBeInTheDocument();
    expect(screen.getByText('Карточка «Волков Артём» создана')).toBeInTheDocument();
  });

  /**
   * Проверки формы — те же, что на бэкенде. Незаполненная фамилия
   * не должна доезжать до сервера: отказ по ней иначе приходит после
   * отправки всей карточки.
   */
  it('не отправляет карточку без обязательных полей', async () => {
    let requested = false;
    server.use(
      http.post(TEACHERS, () => {
        requested = true;
      }),
    );

    renderForm('/admin/teachers/new');

    fireEvent.click(await screen.findByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Укажите фамилию')).toBeInTheDocument();
    expect(screen.getByText('Укажите должность')).toBeInTheDocument();
    expect(requested).toBe(false);
  });

  /**
   * Словарь `errors` от `@Valid` раскладывается по полям формы: имена
   * в нём совпадают с именами полей `TeacherRequestDto`.
   */
  it('раскладывает словарь errors по полям', async () => {
    server.use(
      http.post(TEACHERS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Проверьте правильность заполнения полей',
          instance: '/api/teachers',
          errors: { email: ['Некорректный адрес почты'] },
        }),
      ),
    );

    renderForm('/admin/teachers/new');

    fireEvent.change(await screen.findByLabelText('Фамилия'), { target: { value: 'Волков' } });
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Артём' } });
    fireEvent.change(screen.getByLabelText('Должность'), { target: { value: 'ассистент' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));

    expect(await screen.findByText('Некорректный адрес почты')).toBeInTheDocument();
  });

  /**
   * Три поля карточки живут вне react-hook-form — учётка, дисциплины
   * и ключ фото, — и до T-81 их отказы приходили без адреса, одним
   * `detail`. Заявка **B-7** закрыта, у каждого есть ключ, и сообщение
   * обязано встать под своим полем, а не в общей плашке наверху формы:
   * поля на этой странице разделяют два редактора TipTap, и плашку над
   * ними человек, стоящий у списка дисциплин, просто не увидит.
   */
  async function submitNewCard() {
    fireEvent.change(await screen.findByLabelText('Фамилия'), { target: { value: 'Волков' } });
    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'Артём' } });
    fireEvent.change(screen.getByLabelText('Должность'), { target: { value: 'ассистент' } });
    fireEvent.click(screen.getByRole('button', { name: 'Создать' }));
  }

  /** Поле вместе с подписью и сообщением под ним. */
  function fieldBlock(label: string) {
    const block = screen.getByLabelText(label).closest('div');

    if (!block) throw new Error(`поля «${label}» нет в разметке`);

    return within(block);
  }

  it('ставит отказ по занятой учётной записи под её полем', async () => {
    server.use(
      http.post(TEACHERS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Учётная запись уже связана с карточкой преподавателя id=3',
          instance: '/api/teachers',
          errors: { userId: ['Учётная запись уже связана с карточкой преподавателя id=3'] },
        }),
      ),
    );

    renderForm('/admin/teachers/new');
    await submitNewCard();

    expect(
      await fieldBlock('Учётная запись').findByText(
        'Учётная запись уже связана с карточкой преподавателя id=3',
      ),
    ).toBeInTheDocument();
  });

  /**
   * `detail` повторяет сообщение словаря дословно (docs/API.md, «Формат
   * ошибок»), поэтому показать надо что-то одно. Сторож на разложенное
   * дважды: под полем и заодно баннером.
   */
  it('не повторяет сообщение баннером над формой', async () => {
    server.use(
      http.post(TEACHERS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Дисциплины не найдены: [42]',
          instance: '/api/teachers',
          errors: { subjectIds: ['Дисциплины не найдены: [42]'] },
        }),
      ),
    );

    renderForm('/admin/teachers/new');
    await submitNewCard();

    expect(await screen.findByText('Дисциплины не найдены: [42]')).toBeInTheDocument();
    expect(screen.getAllByText('Дисциплины не найдены: [42]')).toHaveLength(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  /**
   * Ключ фото — третий такой ключ, и адрес у него есть **только**
   * в карточке ППС: у обложек новостей, у файла публикации и у аватаров
   * УВП и профиля тот же отказ приходит одним `detail` (docs/API.md).
   */
  it('ставит отказ по ключу фото под рамкой фото', async () => {
    server.use(
      http.post(TEACHERS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Файл аватара не найден: avatars/2026/08/zzz.jpg',
          instance: '/api/teachers',
          errors: { avatar: ['Файл аватара не найден: avatars/2026/08/zzz.jpg'] },
        }),
      ),
    );

    renderForm('/admin/teachers/new');
    await submitNewCard();

    const message = await screen.findByText('Файл аватара не найден: avatars/2026/08/zzz.jpg');

    // Рядом с выбором файла, а не наверху формы: сообщение лежит
    // в одном блоке с подписью «Выбрать фото». Подпись, а не кнопка —
    // это `<label>` поверх скрытого `input[type=file]`.
    const block = message.closest('div');

    expect(block).not.toBeNull();
    expect(within(block!).getByText('Выбрать фото')).toBeInTheDocument();
  });

  /**
   * Правка поля снимает серверный отказ — так же, как react-hook-form
   * снимает свои `type: 'server'`. Иначе «Учётная запись уже связана
   * с карточкой id=3» висит под уже выбранной другой учёткой и врёт.
   */
  it('снимает отказ, когда поле поправили', async () => {
    server.use(
      http.post(TEACHERS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Учётная запись уже связана с карточкой преподавателя id=3',
          instance: '/api/teachers',
          errors: { userId: ['Учётная запись уже связана с карточкой преподавателя id=3'] },
        }),
      ),
    );

    renderForm('/admin/teachers/new');
    await submitNewCard();
    await screen.findByText('Учётная запись уже связана с карточкой преподавателя id=3');

    fireEvent.change(screen.getByLabelText('Учётная запись'), { target: { value: '101' } });

    expect(
      screen.queryByText('Учётная запись уже связана с карточкой преподавателя id=3'),
    ).not.toBeInTheDocument();
  });

  /**
   * Словарь дисциплин пуст — это не сбой формы, а состояние кафедры:
   * дисциплины заводятся своим разделом админки, и отправить туда
   * полезнее, чем показать пустую рамку.
   */
  it('отправляет в раздел дисциплин, когда словарь пуст', async () => {
    server.use(...subjectHandlers([]));

    renderForm('/admin/teachers/new');

    expect(await screen.findByText(/Словарь дисциплин пуст/)).toBeInTheDocument();
  });

  /**
   * Справочник учёток не доехал. Список обязан заблокироваться,
   * а не показать «Без учётной записи»: это выглядело бы как ответ,
   * хотя ответа нет.
   */
  it('запирает выбор учётки, когда справочник не доехал', async () => {
    server.use(
      http.get('*/api/users/directory', () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/users/directory',
        }),
      ),
    );

    renderForm('/admin/teachers/new');

    expect(
      await screen.findByText('Не удалось загрузить справочник учётных записей'),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Учётная запись')).toBeDisabled();

    // Пустой пункт объясняет запертый выбор сам: место под полем может
    // занять отказ сохранения, и «почему не нажимается» осталось бы
    // без ответа.
    expect(
      within(screen.getByLabelText('Учётная запись')).getByRole('option', {
        name: 'Справочник не доехал',
      }),
    ).toBeInTheDocument();
  });

  /** ФИО в справочнике бывает не заполнено вовсе — пустой пункт выбрать можно, а понять нельзя. */
  it('подписывает номером учётку без ФИО', async () => {
    server.use(
      ...userDirectoryHandlers([makeUserDirectoryEntry({ id: 108, lastName: null, firstName: null })]),
    );

    renderForm('/admin/teachers/new');

    expect(
      await within(screen.getByLabelText('Учётная запись')).findByRole('option', {
        name: 'Учётная запись № 108',
      }),
    ).toBeInTheDocument();
  });

  it('уходит к списку по «Отмене», ничего не отправив', async () => {
    let requested = false;
    server.use(
      http.post(TEACHERS, () => {
        requested = true;
      }),
    );

    renderForm('/admin/teachers/new');

    fireEvent.click(await screen.findByRole('button', { name: 'Отмена' }));

    expect(await screen.findByText('Список преподавателей')).toBeInTheDocument();
    expect(requested).toBe(false);
  });
});

/**
 * Картинки внутри «Образования» и «Повышения квалификации» — раздел
 * хранилища `staff` (B-5, приехал с T-79). Раздел закрыт от преподавателя,
 * поэтому кнопка есть только здесь, у модератора; в кабинете её нет
 * (проверка — в тестах личного кабинета).
 */
describe('TeacherFormPage, картинки в rich-text полях', () => {
  it('грузит картинку «Образования» в раздел staff', async () => {
    renderForm('/admin/teachers/3');

    // Ждём саму форму: редактор приезжает отдельным куском.
    await screen.findByRole('textbox', { name: 'Образование' }, { timeout: 3000 });

    const выбор = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
    // Три: фото карточки и по одному у каждого rich-text поля.
    expect(выбор).toHaveLength(3);

    fireEvent.change(выбор[1], {
      target: { files: [new File(['x'], 'diplom.png', { type: 'image/png' })] },
    });

    const описание = await screen.findByLabelText('Описание');
    fireEvent.change(описание, { target: { value: 'Диплом' } });
    fireEvent.click(screen.getByRole('button', { name: 'Вставить' }));

    // Раздел виден в ключе, который вернула загрузка: мок кладёт его туда,
    // куда просили. Уйди запрос с разделом `news` — тут был бы `news`,
    // а живой бэкенд ответил бы `403`.
    await waitFor(() =>
      expect(
        screen.getByRole('textbox', { name: 'Образование' }).querySelector('img'),
      ).toHaveAttribute('src', '/media/staff/uploaded-1.jpg'),
    );
  });
});
