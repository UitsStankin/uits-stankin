import { onlineManager } from '@tanstack/react-query';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  achievementHandlers,
  achievementsFixture,
  fileHandlers,
  makeAchievement,
  problemResponse,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { IMAGE_HINT } from '@shared/lib';
import { useToastStore } from '@shared/store';
import type { AchievementRequest } from '@shared/types';
import ToastViewport from '@shared/ui/Toast';
import { renderWithProviders } from '@/test/render';

import AdminAchievementsPage from './index';
/*
 * Ленивый кусок редактора (F-41) — статическим импортом, ради времени.
 * Разбор — в `pages/PersonalPage/index.test.tsx`.
 */
import '@shared/ui/RichTextEditor/Editor';

const ACHIEVEMENTS = '*/api/achievements';
const TEACHERS = '*/api/public/teachers';

/**
 * Раздел достижений админки. Прав здесь не проверяют — за них отвечает
 * `RoleRoute`; уголок тостов монтируется вместе со страницей.
 *
 * Список преподавателей для формы отдаёт общий набор моков
 * (`teacherHandlers`), и в тестах выбора он подменяется точечно.
 */
function renderAchievements(route = '/admin/achievements') {
  return renderWithProviders(
    <>
      <AdminAchievementsPage />
      <ToastViewport />
    </>,
    { route },
  );
}

/** Свой список на каждый тест: мок помнит созданное и удалённое. */
beforeEach(() => {
  server.use(...achievementHandlers());
});

afterEach(() => {
  useToastStore.setState({ toasts: [] });
  onlineManager.setOnline(true);
});

function rowOf(title: string) {
  const cell = screen.getByRole('cell', { name: title });
  const row = cell.closest('tr');

  if (!row) throw new Error(`строки с достижением «${title}» нет в разметке`);

  return within(row);
}

/**
 * Текст в поле редактора — вставкой из буфера: ProseMirror читает правки
 * области ввода наблюдателем за DOM, и напечатать в него `fireEvent`
 * нельзя (разбор в `shared/ui/RichTextEditor/index.test.tsx`).
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

/**
 * Выбрать обложку и дождаться ответа загрузки. Ждать надо: пока файл летит,
 * «Сохранить» заблокирована, и клик по ней ничего бы не сделал. Признак
 * конца — предпросмотр по адресу из ответа.
 */
async function chooseCover(dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText('Выбрать обложку'), {
    target: { files: [new File(['x'], 'cover.png', { type: 'image/png' })] },
  });

  await waitFor(() =>
    expect(dialog.querySelector('img[src^="/media/achievements/uploaded-"]')).not.toBeNull(),
  );
}

describe('AdminAchievementsPage, список', () => {
  it('показывает первую страницу вместе с черновиками, новые сверху', async () => {
    renderAchievements();

    expect(await screen.findByRole('cell', { name: 'Черновик гранта' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Достижение 18' })).toBeInTheDocument();

    // Два черновика свежее всех: опубликованных на первой странице
    // восемнадцать, девятнадцатое — уже на второй.
    expect(screen.queryByRole('cell', { name: 'Достижение 19' })).not.toBeInTheDocument();
  });

  it('отличает черновик от опубликованного достижения', async () => {
    renderAchievements();

    await screen.findByRole('cell', { name: 'Черновик достижения' });

    expect(rowOf('Черновик достижения').getByText('Черновик')).toBeInTheDocument();
    expect(rowOf('Достижение 1').getByText('Опубликовано')).toBeInTheDocument();
  });

  /**
   * Привязка решает, где достижение покажется на сайте, поэтому видна
   * в таблице. Кафедральное подписано словом, а не прочерком: это решение,
   * а не пропуск.
   */
  it('подписывает преподавателя именем, а кафедральное — словом', async () => {
    renderAchievements();

    await screen.findByRole('cell', { name: 'Достижение 2' });

    expect(rowOf('Достижение 2').getByText('Абрамов Никита Сергеевич')).toBeInTheDocument();
    expect(rowOf('Достижение 1').getByText('Кафедральное')).toBeInTheDocument();
  });

  it('открывает вторую страницу из адреса', async () => {
    renderAchievements('/admin/achievements?page=2');

    expect(await screen.findByRole('cell', { name: 'Достижение 19' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Достижение 1' })).not.toBeInTheDocument();
  });

  it('запрашивает обратный порядок, когда он задан в адресе', async () => {
    renderAchievements('/admin/achievements?sort=createdAt,asc');

    expect(await screen.findByRole('cell', { name: 'Достижение 23' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Черновик гранта' })).not.toBeInTheDocument();
  });

  it('не отправляет порядок по умолчанию — у контракта он с ключом id', async () => {
    let requested: string | null = null;
    server.use(
      http.get(ACHIEVEMENTS, ({ request }) => {
        requested = request.url;
      }),
    );

    renderAchievements();
    await screen.findByRole('cell', { name: 'Достижение 1' });

    expect(requested).not.toContain('sort=');
  });

  it('меняет порядок кликом по заголовку «Добавлено»', async () => {
    renderAchievements();

    fireEvent.click(await screen.findByRole('button', { name: /Добавлено/ }));

    expect(await screen.findByRole('cell', { name: 'Достижение 23' })).toBeInTheDocument();
  });

  it('говорит, что достижений нет вовсе', async () => {
    server.use(...achievementHandlers([]));

    renderAchievements();

    expect(await screen.findByText('Достижений пока нет')).toBeInTheDocument();
  });

  it('объясняет страницу за пределами данных', async () => {
    renderAchievements('/admin/achievements?page=9');

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
  });

  it('показывает сбой и повторяет запрос', async () => {
    server.use(
      http.get(ACHIEVEMENTS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/achievements',
        }),
      ),
    );

    renderAchievements();

    expect(await screen.findByText('Не удалось загрузить достижения')).toBeInTheDocument();

    server.use(...achievementHandlers());
    fireEvent.click(screen.getByRole('button', { name: 'Повторить' }));

    expect(await screen.findByRole('cell', { name: 'Достижение 1' })).toBeInTheDocument();
  });

  it('показывает паузу запроса отдельно от сбоя', async () => {
    onlineManager.setOnline(false);

    renderAchievements();

    expect(await screen.findByText('Нет связи с сервером')).toBeInTheDocument();
  });
});

describe('AdminAchievementsPage, создание', () => {
  beforeEach(() => {
    server.use(
      ...achievementHandlers([makeAchievement({ id: 1, title: 'Достижение 1' })]),
      ...fileHandlers(),
    );
  });

  async function openForm() {
    fireEvent.click(await screen.findByRole('button', { name: 'Добавить' }));

    const element = screen.getByRole('dialog', { name: 'Новое достижение' });
    const dialog = within(element);
    const content = await dialog.findByRole('textbox', { name: 'Содержание' });

    return { element, dialog, content };
  }

  /** Всё обязательное, кроме обложки: её каждый тест решает сам. */
  function fillRequired(form: Awaited<ReturnType<typeof openForm>>) {
    fireEvent.change(form.dialog.getByLabelText('Название'), { target: { value: 'Инженер года' } });
    fireEvent.change(form.dialog.getByLabelText('Краткое описание'), {
      target: { value: 'Лауреат всероссийского конкурса.' },
    });
    pasteText(form.content, 'Подробности награждения.');
  }

  it('создаёт достижение и показывает его в таблице', async () => {
    renderAchievements();

    const form = await openForm();
    fillRequired(form);
    await chooseCover(form.element);
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Достижение «Инженер года» создано')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Инженер года' })).toBeInTheDocument();
  });

  /**
   * Черновиком — как в сущности бэкенда (`Achievement.display = false`)
   * и в старой модели (`is_published`, `default=False`). Сторож стоит
   * потому, что у новостей и конференций умолчание обратное, и «привести
   * к единообразию» здесь было бы ошибкой.
   */
  it('заводит достижение черновиком, в отличие от новостей и конференций', async () => {
    renderAchievements();

    const form = await openForm();
    const publish = form.dialog.getByLabelText('Опубликовать');

    expect(publish).not.toBeChecked();
    expect(publish).toHaveAccessibleDescription(
      'Снятый флажок оставляет достижение черновиком: на сайте его не видно.',
    );
  });

  /** Обложка проверяется тем же нажатием, что и поля, а не со второй попытки. */
  it('называет все пустые обязательные поля и обложку разом', async () => {
    let posted = false;
    server.use(
      http.post(ACHIEVEMENTS, () => {
        posted = true;
      }),
    );

    renderAchievements();

    const form = await openForm();
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(await form.dialog.findByText('Укажите название')).toBeInTheDocument();
    expect(form.dialog.getByText('Добавьте краткое описание')).toBeInTheDocument();
    expect(form.dialog.getByText('Добавьте текст достижения')).toBeInTheDocument();
    expect(
      form.dialog.getByText('Добавьте обложку: без неё достижение не сохранится.'),
    ).toBeInTheDocument();
    expect(posted).toBe(false);
  });

  /**
   * Поля в порядке, обложки нет — запрос не уходит. Сервер ответил бы
   * на такое `400`, но только после отправки всей статьи.
   */
  it('не отправляет достижение без обложки', async () => {
    let posted = false;
    server.use(
      http.post(ACHIEVEMENTS, () => {
        posted = true;
      }),
    );

    renderAchievements();

    const form = await openForm();
    fillRequired(form);
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(
      await form.dialog.findByText('Добавьте обложку: без неё достижение не сохранится.'),
    ).toBeInTheDocument();

    // Отказ по обложке встаёт сразу, а проверка полей асинхронна: ждём её
    // конца, иначе «запроса не было» проверялось бы раньше, чем он мог уйти.
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(posted).toBe(false);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('снимает отказ по обложке, когда её выбрали', async () => {
    renderAchievements();

    const form = await openForm();
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));
    await form.dialog.findByText('Добавьте обложку: без неё достижение не сохранится.');

    await chooseCover(form.element);

    expect(
      form.dialog.queryByText('Добавьте обложку: без неё достижение не сохранится.'),
    ).not.toBeInTheDocument();
  });

  it('отправляет обложку ключом из раздела achievements и выбранного преподавателя', async () => {
    let sent: AchievementRequest | null = null;
    server.use(
      http.post(ACHIEVEMENTS, async ({ request }) => {
        sent = (await request.json()) as AchievementRequest;

        return HttpResponse.json(makeAchievement({ id: 2, title: 'Инженер года' }), { status: 201 });
      }),
    );

    renderAchievements();

    const form = await openForm();
    fillRequired(form);

    const teacher = form.dialog.getByLabelText('Преподаватель');
    await waitFor(() => expect(teacher).toBeEnabled());
    fireEvent.change(teacher, { target: { value: '2' } });

    await chooseCover(form.element);
    fireEvent.click(form.dialog.getByLabelText('Опубликовать'));
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Достижение «Инженер года» создано');

    expect(sent).toEqual({
      title: 'Инженер года',
      description: 'Лауреат всероссийского конкурса.',
      content: expect.stringContaining('Подробности награждения.'),
      previewImage: 'achievements/uploaded-1.jpg',
      display: true,
      teacherId: 2,
    });
  });

  it('раскладывает ошибки валидации сервера по полям', async () => {
    server.use(
      http.post(ACHIEVEMENTS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Ошибка валидации',
          instance: '/api/achievements',
          errors: { content: ['Содержание пусто после удаления небезопасной разметки'] },
        }),
      ),
    );

    renderAchievements();

    const form = await openForm();
    fillRequired(form);
    await chooseCover(form.element);
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(
      await form.dialog.findByText('Содержание пусто после удаления небезопасной разметки'),
    ).toBeInTheDocument();
  });

  /**
   * Ключ обложки — не поле формы, но у сообщения есть место: под рамкой,
   * рядом с подсказкой о формате, а не баннером наверху формы.
   */
  it('кладёт отказ сервера по ключу обложки под рамку обложки', async () => {
    const message = 'Ключ обложки не длиннее 100 символов';
    server.use(
      http.post(ACHIEVEMENTS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: message,
          instance: '/api/achievements',
          errors: { previewImage: [message] },
        }),
      ),
    );

    renderAchievements();

    const form = await openForm();
    fillRequired(form);
    await chooseCover(form.element);
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    const refusal = await form.dialog.findByText(message);

    expect(form.dialog.getAllByText(message)).toHaveLength(1);
    expect(refusal.previousElementSibling).toHaveTextContent(IMAGE_HINT);
  });

  /**
   * Карточку удалили, пока форма была открыта: сервер отвечает одним
   * `detail`, без адреса поля, и сообщение уходит баннером.
   */
  it('показывает отказ по удалённому преподавателю баннером', async () => {
    server.use(
      http.post(ACHIEVEMENTS, () =>
        problemResponse(400, {
          title: 'Bad Request',
          detail: 'Преподаватель не найден: id=2',
          instance: '/api/achievements',
        }),
      ),
    );

    renderAchievements();

    const form = await openForm();
    fillRequired(form);
    await chooseCover(form.element);
    fireEvent.click(form.dialog.getByRole('button', { name: 'Сохранить' }));

    expect(await form.dialog.findByText('Преподаватель не найден: id=2')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /** Список не доехал: выбор заперт, а «кафедральное» не выдаётся за ответ. */
  it('запирает выбор преподавателя, когда список не доехал', async () => {
    server.use(
      http.get(TEACHERS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/public/teachers',
        }),
      ),
    );

    renderAchievements();

    const form = await openForm();

    expect(
      await form.dialog.findByText('Не удалось загрузить список преподавателей'),
    ).toBeInTheDocument();

    const teacher = form.dialog.getByLabelText('Преподаватель');
    expect(teacher).toBeDisabled();
    expect(teacher).toHaveDisplayValue('Список преподавателей не доехал');
  });
});

describe('AdminAchievementsPage, правка', () => {
  async function openEditor(title: string) {
    const table = await screen.findByRole('table');

    fireEvent.click(within(table).getByRole('button', { name: `Править достижение «${title}»` }));

    const dialog = within(screen.getByRole('dialog', { name: 'Правка достижения' }));
    await dialog.findByRole('textbox', { name: 'Содержание' });

    return dialog;
  }

  it('открывает форму со значениями достижения и сохраняет правку', async () => {
    renderAchievements();

    const form = await openEditor('Достижение 1');
    const title = form.getByLabelText('Название');
    expect(title).toHaveValue('Достижение 1');

    fireEvent.change(title, { target: { value: 'Достижение первое' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    expect(await screen.findByText('Достижение «Достижение первое» сохранено')).toBeInTheDocument();
    expect(await screen.findByRole('cell', { name: 'Достижение первое' })).toBeInTheDocument();
  });

  /**
   * Главное в поле преподавателя. Список приезжает позже формы, и выбор
   * обязан показать привязанного преподавателя, когда его пункт появится, —
   * а до того не показывать «кафедральное». Затвор, а не задержка:
   * порядок «форма раньше списка» задаёт тест, а не скорость машины.
   */
  it('показывает привязанного преподавателя, когда список приезжает позже формы', async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Хендлер без ответа пропускает запрос дальше — к общему набору.
    server.use(
      http.get(TEACHERS, async () => {
        await gate;
      }),
    );

    renderAchievements();

    const form = await openEditor('Достижение 2');
    const teacher = form.getByLabelText('Преподаватель');

    expect(teacher).toBeDisabled();
    expect(teacher).toHaveDisplayValue('Загружаем преподавателей…');

    release();

    await waitFor(() => expect(teacher).toBeEnabled());
    expect(teacher).toHaveDisplayValue('Абрамов Никита Сергеевич');
  });

  /**
   * `PUT` — полная замена, и пропущенный `teacherId` делает достижение
   * кафедральным. Не доехавший список не должен этого делать молча:
   * выбор заперт, а в теле уходит прежняя ссылка.
   */
  it('не отвязывает преподавателя, когда список не доехал', async () => {
    let sent: AchievementRequest | null = null;
    server.use(
      http.get(TEACHERS, () =>
        problemResponse(500, {
          title: 'Internal Server Error',
          detail: 'Внутренняя ошибка сервера.',
          instance: '/api/public/teachers',
        }),
      ),
      // Отвечает сам, а не пропускает дальше: тело уже прочитано.
      http.put('*/api/achievements/:id', async ({ params, request }) => {
        const body = (await request.json()) as AchievementRequest;
        sent = body;

        return HttpResponse.json(makeAchievement({ ...body, id: Number(params.id) }));
      }),
    );

    renderAchievements();

    const form = await openEditor('Достижение 2');
    const teacher = form.getByLabelText('Преподаватель');

    await form.findByText('Не удалось загрузить список преподавателей');
    // Пункт привязанного — из имени, пришедшего с самим достижением.
    expect(teacher).toHaveDisplayValue('Абрамов Никита Сергеевич');

    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Достижение второе' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Достижение «Достижение второе» сохранено');

    expect(sent).toMatchObject({ teacherId: 1 });
  });

  it('делает достижение кафедральным пустым пунктом списка', async () => {
    renderAchievements();

    const form = await openEditor('Достижение 2');
    const teacher = form.getByLabelText('Преподаватель');

    await waitFor(() => expect(teacher).toBeEnabled());
    fireEvent.change(teacher, { target: { value: '' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Достижение «Достижение 2» сохранено');
    await waitFor(() =>
      expect(rowOf('Достижение 2').getByText('Кафедральное')).toBeInTheDocument(),
    );
  });

  /** Обложку контракт снять не даёт — только заменить. */
  it('даёт заменить обложку, но не убрать', async () => {
    let sent: AchievementRequest | null = null;
    server.use(
      ...fileHandlers(),
      // Отвечает сам, а не пропускает дальше: тело уже прочитано.
      http.put('*/api/achievements/:id', async ({ params, request }) => {
        const body = (await request.json()) as AchievementRequest;
        sent = body;

        return HttpResponse.json(makeAchievement({ ...body, id: Number(params.id) }));
      }),
    );

    renderAchievements();

    const form = await openEditor('Достижение 1');

    expect(form.queryByRole('button', { name: 'Убрать обложку' })).not.toBeInTheDocument();

    await chooseCover(screen.getByRole('dialog'));
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Достижение «Достижение 1» сохранено');

    expect(sent).toMatchObject({ previewImage: 'achievements/uploaded-1.jpg' });
  });

  /**
   * `PUT` — полная замена: ключ обложки и ссылку на преподавателя форма
   * не показывает полями ввода, но обязана отправить обратно.
   */
  it('отправляет в правке все поля, включая невидимые в форме', async () => {
    const full = makeAchievement({
      id: 7,
      title: 'Инженер года',
      description: 'Лауреат всероссийского конкурса.',
      content: '<p>Подробности награждения.</p>',
      previewImage: 'achievements/2026/08/b41e.jpg',
      previewImageUrl: '/media/achievements/2026/08/b41e.jpg',
      display: true,
      teacherId: 2,
      teacherName: 'Андреева Ольга Викторовна',
    });

    let sent: AchievementRequest | null = null;
    server.use(
      http.put('*/api/achievements/:id', async ({ request }) => {
        sent = (await request.json()) as AchievementRequest;

        return HttpResponse.json({ ...full, title: 'Инженер года 2026' });
      }),
      ...achievementHandlers([full]),
    );

    renderAchievements();

    const form = await openEditor('Инженер года');
    fireEvent.change(form.getByLabelText('Название'), { target: { value: 'Инженер года 2026' } });
    fireEvent.click(form.getByRole('button', { name: 'Сохранить' }));

    await screen.findByText('Достижение «Инженер года 2026» сохранено');

    expect(sent).toEqual({
      title: 'Инженер года 2026',
      description: 'Лауреат всероссийского конкурса.',
      content: '<p>Подробности награждения.</p>',
      previewImage: 'achievements/2026/08/b41e.jpg',
      display: true,
      teacherId: 2,
    });
  });

  /**
   * Опубликованное — отмеченным, черновик — снятым. Умолчание нового
   * достижения — черновик, и без сторожа замена начального значения этим
   * умолчанием молча прятала бы с сайта каждое сохранённое достижение.
   */
  it('открывает опубликованное отмеченным, а черновик — снятым', async () => {
    renderAchievements();

    const published = await openEditor('Достижение 1');
    expect(published.getByLabelText('Опубликовать')).toBeChecked();
    fireEvent.click(published.getByRole('button', { name: 'Отмена' }));

    const draft = await openEditor('Черновик достижения');
    expect(draft.getByLabelText('Опубликовать')).not.toBeChecked();
  });

  it('показывает поля того достижения, которое открыли второй', async () => {
    renderAchievements();

    const first = await openEditor('Достижение 1');
    fireEvent.click(first.getByRole('button', { name: 'Отмена' }));

    const second = await openEditor('Достижение 2');

    expect(second.getByLabelText('Название')).toHaveValue('Достижение 2');
  });
});

describe('AdminAchievementsPage, удаление', () => {
  function askDelete(title: string) {
    fireEvent.click(screen.getByRole('button', { name: `Удалить достижение «${title}»` }));
  }

  it('спрашивает подтверждение и удаляет', async () => {
    renderAchievements();
    await screen.findByRole('table');

    askDelete('Достижение 1');

    const dialog = within(screen.getByRole('dialog', { name: 'Удалить достижение?' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Достижение «Достижение 1» удалено')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole('cell', { name: 'Достижение 1' })).not.toBeInTheDocument(),
    );
  });

  it('ничего не удаляет по «Отмене»', async () => {
    renderAchievements();
    await screen.findByRole('table');

    askDelete('Достижение 1');
    fireEvent.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Достижение 1' })).toBeInTheDocument();
  });

  it('показывает отказ, когда достижения уже нет', async () => {
    server.use(
      http.delete('*/api/achievements/:id', () =>
        problemResponse(404, {
          title: 'Not Found',
          detail: 'Достижение id=1 не найдено',
          instance: '/api/achievements/1',
        }),
      ),
    );

    renderAchievements();
    await screen.findByRole('table');

    askDelete('Достижение 1');
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }));

    expect(await screen.findByText('Достижение id=1 не найдено')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Достижение 1' })).toBeInTheDocument();
  });
});

describe('AdminAchievementsPage, данные', () => {
  /**
   * Сторож фикстуры: на двадцати трёх опубликованных стоят проверки
   * пагинации раздела на сайте, на черновиках — смысл админской ручки,
   * на привязке первого черновика — то, что блок на карточке ППС
   * черновиков не показывает.
   */
  it('фикстура — двадцать три опубликованных и два свежих черновика', () => {
    expect(achievementsFixture).toHaveLength(25);

    const drafts = achievementsFixture.filter((item) => !item.display);
    expect(drafts.map((item) => item.id)).toEqual([24, 25]);
    expect(drafts[0]?.teacherId).toBe(2);

    const newest = [...achievementsFixture].sort(
      (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
    expect(newest.slice(0, 2).every((item) => !item.display)).toBe(true);
  });
});
