import { onlineManager } from '@tanstack/react-query';
import { useLocation } from 'react-router';
import { fireEvent, screen, within } from '@testing-library/react';
import { http } from 'msw';
import { afterEach, describe, expect, it } from 'vitest';

import {
  editablePageHandlers,
  problemResponse,
  publicPostgraduateHandlers,
} from '@shared/api/mocks';
import { server } from '@shared/api/mocks/server';
import { renderWithProviders } from '@/test/render';

import PostgraduatePage from './index';

const POSTGRADUATES_URL = '*/api/public/postgraduates';
const ROUTE = '/scientific-activities/postgraduate';

/** Ответ `500` вместо списка — то, что на живом бэкенде не воспроизвести. */
function respondWithServerError() {
  server.use(
    http.get(POSTGRADUATES_URL, () =>
      problemResponse(500, {
        title: 'Internal Server Error',
        detail: 'Что-то пошло не так на сервере',
        instance: '/api/public/postgraduates',
      }),
    ),
  );
}

/**
 * Адрес, видимый роутеру. `MemoryRouter` не трогает `window.location`,
 * а проверять надо именно адрес: поиск обязан в нём оказаться, иначе его
 * не переслать ссылкой и не вернуть кнопкой «назад».
 */
function LocationProbe() {
  const { search } = useLocation();
  return <span data-testid="location-search">{search}</span>;
}

/** Страница вместе с пробником адреса. */
function renderPage(route: string = ROUTE) {
  return renderWithProviders(
    <>
      <PostgraduatePage />
      <LocationProbe />
    </>,
    { route },
  );
}

/**
 * Что сейчас в адресе после `?`, в читаемом виде: кириллицу роутер
 * процентно кодирует, и сравнивать с `%D1%87%D0%B5...` нечитаемо.
 */
function locationSearch(): string {
  return decodeURIComponent(screen.getByTestId('location-search').textContent ?? '');
}

/** Набор в поле поиска — одним событием, как вставка из буфера. */
function typeSearch(value: string) {
  fireEvent.change(screen.getByRole('searchbox', { name: 'Поиск по таблице аспирантов' }), {
    target: { value },
  });
}

/**
 * Ожидание длиннее обычного: между набором и запросом стоит пауза
 * в 300 мс (`model/usePostgraduateSearch.ts`), и умолчания в 1000 мс
 * на неё вместе с ответом мока хватает впритык.
 */
const AFTER_DEBOUNCE = { timeout: 3000 };

/** Строка таблицы целиком — по имени аспиранта в её заголовке. */
function rowOf(studentName: string): HTMLElement {
  const row = screen.getByRole('rowheader', { name: studentName }).closest('tr');
  if (row === null) throw new Error(`Строка «${studentName}» не найдена`);
  return row;
}

afterEach(() => {
  // Сеть возвращается всем: `onlineManager` — глобальный синглтон Query,
  // и оставленный офлайн поставил бы на паузу запросы соседнего теста.
  onlineManager.setOnline(true);
});

/**
 * Страница аспирантуры целиком: адрес → два запроса → разметка.
 *
 * Страница смешанная, и проверяется именно это: редактируемый раздел
 * и таблица живут своими запросами, и сбой одного не гасит второй.
 *
 * Фикстура — двадцать три записи по алфавиту фамилий аспирантов
 * (`shared/api/mocks/postgraduates.ts`): на первой странице
 * Абдулов…Филатов, на второй остаются трое. Крайние случаи в ней
 * заведены нарочно — запись без руководителя, без специальности
 * и без темы.
 */
describe('PostgraduatePage', () => {
  it('показывает скелет, потом первую страницу таблицы', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(screen.getByText('Загрузка списка аспирантов')).toBeInTheDocument();

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();
    expect(screen.getByText('Филатов Герман Антонович')).toBeInTheDocument();
    expect(screen.queryByText('Загрузка списка аспирантов')).not.toBeInTheDocument();

    // Двадцать первая запись — уже на второй странице: размер страницы
    // держит контракт, а не фронт.
    expect(screen.queryByText('Хайруллин Ильдар Маратович')).not.toBeInTheDocument();
  });

  /**
   * Колонки и их порядок — из оригинала. Проверяются ролями, а не
   * текстом: `columnheader` появляется только у `th scope="col"` внутри
   * таблицы, то есть заодно сторожит, что таблица осталась таблицей,
   * а не превратилась в сетку из `div`.
   */
  it('называет колонки так же, как оригинал, и в том же порядке', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    expect(screen.getAllByRole('columnheader').map((cell) => cell.textContent)).toEqual([
      '№',
      'Аспирант',
      'Тема диссертации',
      'Специальность',
      'Год поступления',
      'Руководитель',
    ]);
  });

  /** Значения строки стоят по своим колонкам, а не съехали на соседние. */
  it('раскладывает запись по колонкам', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    const row = within(rowOf('Абдулов Тимур Русланович'));

    expect(
      row.getByText('Адаптивное управление многосвязными технологическими объектами'),
    ).toBeInTheDocument();
    expect(row.getByText('2.3.1')).toBeInTheDocument();
    expect(row.getByText('2021')).toBeInTheDocument();
    // Номер первой строки — единица, а не идентификатор записи.
    expect(row.getByText('1')).toBeInTheDocument();
  });

  /**
   * Номер сквозной по списку, а не от единицы на каждой странице.
   * В оригинале пагинации не было вовсе, и колонка «№» считала от начала
   * списка; двадцать первая запись обязана остаться двадцать первой.
   */
  it('продолжает нумерацию на второй странице, а не начинает заново', async () => {
    renderWithProviders(<PostgraduatePage />, { route: `${ROUTE}?page=2` });

    expect(await screen.findByText('Хайруллин Ильдар Маратович')).toBeInTheDocument();
    expect(within(rowOf('Хайруллин Ильдар Маратович')).getByText('21')).toBeInTheDocument();
    expect(within(rowOf('Чернышёв Родион Валерьевич')).getByText('23')).toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByText('2')).toHaveAttribute('aria-current', 'page');
  });

  /**
   * Руководитель ведёт на свою карточку ППС. Ссылки в оригинале не было:
   * старый ответ нёс одно `full_name`, вести по имени было некуда, —
   * а новый контракт отдаёт `teacherId`.
   */
  it('ведёт от руководителя к его карточке', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    // Ищется внутри своей строки: руководители в фикстуре раздаются
    // по кругу, и один и тот же стоит у нескольких аспирантов.
    expect(
      within(rowOf('Абдулов Тимур Русланович')).getByRole('link', {
        name: 'Баранов Илья Матвеевич',
      }),
    ).toHaveAttribute('href', '/about/employee/teachers/3');
  });

  /**
   * Пустые поля объясняются словами, а не прочерком. Все три приходят
   * `null` по контракту: руководителя обнуляет удаление карточки ППС,
   * а специальность и тема в базе необязательны.
   */
  it('объясняет словами незаполненные руководителя, специальность и тему', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    expect(
      within(rowOf('Верещагина Софья Андреевна')).getByText('не назначен'),
    ).toBeInTheDocument();
    expect(within(rowOf('Дорохова Алиса Игоревна')).getByText('не указана')).toBeInTheDocument();
    expect(within(rowOf('Зотов Даниил Сергеевич')).getByText('не указана')).toBeInTheDocument();
  });

  /**
   * Заголовки по уровням без дырок. В оригинале страница шла `h1` → `h3`:
   * заголовка второго уровня на ней не было вовсе, и по заголовкам она
   * читалась с пропуском.
   */
  it('называет страницу и таблицу заголовками соседних уровней', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(screen.getByRole('heading', { level: 1, name: 'Аспирантура' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: 'Аспиранты, руководители и специальности' }),
    ).toBeInTheDocument();
  });

  /**
   * Широкая таблица прокручивается внутри себя — и добраться до этой
   * прокрутки можно с клавиатуры. Область, которую двигает только мышь,
   * на телефоне и с клавиатуры отрезает половину колонок.
   */
  it('делает прокрутку таблицы доступной с клавиатуры', async () => {
    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    const region = screen.getByRole('region', { name: 'Аспиранты кафедры' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveClass('overflow-x-auto');
  });

  /**
   * Поиск серверный: запрос уезжает параметром `?q=`, а не фильтрует
   * загруженную страницу. Сторож «поля поиска нет», стоявший здесь
   * с F-34, снят вместе с приходом ручки (B-3, T-78) — искать по двадцати
   * записям из двадцати трёх было нечестно, по всем двадцати трём честно.
   */
  it('ищет по всему разделу и кладёт запрос в адрес', async () => {
    renderPage();

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    typeSearch('чернышёв');

    expect(await screen.findByText('Чернышёв Родион Валерьевич', {}, AFTER_DEBOUNCE))
      .toBeInTheDocument();
    // Найденный лежал на второй странице: фильтруй страница сама себя,
    // на первой его бы не нашлось вовсе.
    expect(screen.queryByText('Абдулов Тимур Русланович')).not.toBeInTheDocument();
    expect(locationSearch()).toBe('?q=чернышёв');
    expect(screen.getByText('Найдено аспирантов: 1')).toBeInTheDocument();
  });

  /** Ищут не только по фамилии: контракт склеивает пять колонок в одну. */
  it('находит по руководителю и по году поступления', async () => {
    renderPage();

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();

    typeSearch('соколов денис');
    expect(await screen.findByText('Найдено аспирантов: 4', {}, AFTER_DEBOUNCE))
      .toBeInTheDocument();
    expect(within(rowOf('Дорохова Алиса Игоревна')).getByText('Соколов Денис Игоревич'))
      .toBeInTheDocument();

    typeSearch('2026');
    expect(await screen.findByText('Найдено аспирантов: 3', {}, AFTER_DEBOUNCE))
      .toBeInTheDocument();
  });

  /** Адрес с запросом открывается сразу найденным — и поле не пустое. */
  it('открывает поиск по адресу и подставляет запрос в поле', async () => {
    renderPage(`${ROUTE}?q=цибулько`);

    expect(await screen.findByText('Цибулько Аглая Романовна')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Поиск по таблице аспирантов' }))
      .toHaveValue('цибулько');
    expect(screen.queryByText('Абдулов Тимур Русланович')).not.toBeInTheDocument();
  });

  /**
   * Пустая выдача поиска — не пустой раздел. Записи есть, просто не эти,
   * и предложить надо изменить запрос, а не ждать, пока их заведут.
   */
  it('на пустой выдаче поиска зовёт к полному списку, а не в пустой раздел', async () => {
    renderPage(`${ROUTE}?q=бузина`);

    expect(await screen.findByText('Ничего не найдено')).toBeInTheDocument();
    expect(screen.getByText(/По запросу «бузина» аспирантов нет/)).toBeInTheDocument();
    // Ноль тоже проговаривается: `role="status"` — единственное, что диктор
    // скажет о результате набора, а блок ниже сам себя не объявляет.
    expect(screen.getByText('Найдено аспирантов: 0')).toBeInTheDocument();
    expect(screen.queryByText('Аспирантов пока нет')).not.toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Показать всех' }));

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Поиск по таблице аспирантов' }))
      .toHaveValue('');
  });

  /**
   * Запрос переживает перелистывание. Без этого «страница 2» показывала бы
   * вторую страницу полного списка — поиск терялся бы, хотя человек
   * не нажимал ничего похожего на «сбросить».
   */
  it('сохраняет запрос в ссылках пагинатора', async () => {
    // `202` есть в году поступления каждой записи — двадцать три штуки,
    // то есть две страницы и живой пагинатор.
    renderPage(`${ROUTE}?q=202`);

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();
    expect(screen.getByText('Найдено аспирантов: 23')).toBeInTheDocument();

    const pagination = screen.getByRole('navigation', { name: 'Постраничная навигация' });
    expect(within(pagination).getByRole('link', { name: 'Страница 2' }))
      .toHaveAttribute('href', '/scientific-activities/postgraduate?page=2&q=202');
  });

  /**
   * Смена запроса сбрасывает страницу. Искать со второй бессмысленно:
   * под новый запрос её может не быть вовсе, и вместо результатов
   * человек получил бы «такой страницы нет».
   */
  it('сбрасывает номер страницы при новом запросе', async () => {
    renderPage(`${ROUTE}?page=2`);

    expect(await screen.findByText('Хайруллин Ильдар Маратович')).toBeInTheDocument();

    typeSearch('верещагина');

    expect(await screen.findByText('Верещагина Софья Андреевна', {}, AFTER_DEBOUNCE))
      .toBeInTheDocument();
    expect(locationSearch()).toBe('?q=верещагина');
    expect(screen.queryByText('Такой страницы нет')).not.toBeInTheDocument();
  });

  /** Крестик очищает поиск сразу, не дожидаясь паузы набора. */
  it('очищает поиск кнопкой и возвращает полный список', async () => {
    renderPage(`${ROUTE}?q=цибулько`);

    expect(await screen.findByText('Цибулько Аглая Романовна')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Очистить поиск' }));

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();
    expect(locationSearch()).toBe('');
    expect(screen.queryByText(/Найдено аспирантов/)).not.toBeInTheDocument();
  });

  /**
   * Пробельный запрос — это отсутствие запроса, и на бэкенде тоже
   * (`SearchText.normalize`). Иначе он дал бы отдельный ключ кэша, лишний
   * запрос и надпись «найдено» над полным списком.
   */
  it('пробельный запрос в адресе не считает поиском', async () => {
    renderPage(`${ROUTE}?q=%20%20`);

    expect(await screen.findByText('Абдулов Тимур Русланович')).toBeInTheDocument();
    expect(screen.queryByText(/Найдено аспирантов/)).not.toBeInTheDocument();
  });

  /** Искать не в чем — поля нет: раздел пуст целиком, а не по запросу. */
  it('не показывает поле поиска в пустом разделе', async () => {
    server.use(...publicPostgraduateHandlers([]));

    renderPage();

    expect(await screen.findByText('Аспирантов пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  /** Текст раздела приходит с бэкенда и рисуется Markdown'ом над таблицей. */
  it('показывает редактируемый раздел над таблицей', async () => {
    server.use(
      ...editablePageHandlers({
        'scientific-activity-postgraduate': '## Приём в аспирантуру\n\nДокументы до 15 июля.',
      }),
    );

    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Приём в аспирантуру' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Документы до 15 июля.')).toBeInTheDocument();
  });

  /**
   * Два запроса — две судьбы: упавший список не уносит с собой текст
   * раздела, который приехал целым. Общий разбор состояний на страницу
   * выглядел бы честнее ровно до первой пятисотки.
   */
  it('на 500 у списка оставляет раздел на месте', async () => {
    respondWithServerError();

    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('Не удалось загрузить список аспирантов'),
    ).toBeInTheDocument();
    expect(within(alert).getByText('Ошибка на сервере, попробуйте позже.')).toBeInTheDocument();

    // `detail` пятисотки — внутренняя диагностика, посетителю портала
    // из неё ничего не следует.
    expect(screen.queryByText('Что-то пошло не так на сервере')).not.toBeInTheDocument();

    // Раздел пришёл своим запросом и остался: на чистой базе он пуст,
    // и пустота объяснена словами.
    expect(screen.getByText('Раздел пока не заполнен')).toBeInTheDocument();
  });

  it('на пустом списке объясняет, что записей нет', async () => {
    server.use(...publicPostgraduateHandlers([]));

    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findByText('Аспирантов пока нет')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Постраничная навигация' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Страница за пределами данных — не ошибка: контракт отвечает на неё
   * `200` с пустым `content`, и отличить её от пустого раздела можно
   * только по `totalPages`.
   */
  it('за пределами данных зовёт на первую страницу, а не показывает пустоту', async () => {
    renderWithProviders(<PostgraduatePage />, { route: `${ROUTE}?page=3` });

    expect(await screen.findByText('Такой страницы нет')).toBeInTheDocument();
    expect(screen.getByText('Всего страниц: 2.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'К первой странице' })).toBeInTheDocument();
    expect(screen.queryByText('Аспирантов пока нет')).not.toBeInTheDocument();
  });

  /**
   * Пауза — третье состояние Query помимо загрузки и ошибки: `error` при
   * ней `null`, а `isLoading` уже снят. На пропущенной ветке в личном
   * кабинете молча исчезала целая секция (D-F11). Здесь запросов два,
   * и без сети о ней сообщают оба — каждый про своё.
   */
  it('без сети объясняет, что связи нет, и у раздела, и у таблицы', async () => {
    onlineManager.setOnline(false);

    renderWithProviders(<PostgraduatePage />, { route: ROUTE });

    expect(await screen.findAllByText('Нет связи с сервером')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Повторить' })).toHaveLength(2);
  });
});
