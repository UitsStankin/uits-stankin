import { http, HttpResponse } from 'msw';

import type {
  Postgraduate,
  PostgraduateDetails,
  PostgraduateRequest,
  PostgraduateStudent,
} from '@shared/types';

import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';
import { teachersFixture } from './teachers';

/** `*` вместо origin — по той же причине, что и у новостей. */
const PUBLIC_POSTGRADUATES = '*/api/public/postgraduates';
const POSTGRADUATES = '*/api/postgraduates';

/**
 * Запись аспирантуры со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужна одна фамилия, а не весь DTO. Умолчания — пример
 * из docs/API.md («Аспирантура»), кроме руководителя: там он выдуман,
 * а здесь взят из фикстуры ППС (`id: 3`), чтобы ссылка на карточку
 * из таблицы вела на существующего человека и в браузере под
 * `VITE_ENABLE_MOCKS`.
 */
export function makePostgraduate(overrides: Partial<Postgraduate> = {}): Postgraduate {
  return {
    id: 1,
    studentId: 101,
    studentName: 'Абрамов Пётр Сергеевич',
    speciality: '2.3.1',
    diplomaTheme: 'Методы анализа промышленных данных',
    admissionYear: 2024,
    teacherId: 3,
    teacherName: 'Баранов Илья Матвеевич',
    ...overrides,
  };
}

/**
 * ФИО аспирантов по алфавиту фамилий — уже склеенное, как отдаёт контракт.
 * У одной аспирантки отчества нет вовсе: `patronymic` в базе необязателен,
 * склейку делает бэкенд, и фронту достаётся строка из двух слов, а не
 * «Жданова Милана null».
 *
 * Фамилии намеренно не пересекаются с фикстурой ППС: в таблице рядом стоят
 * два человека — аспирант и руководитель, — и одинаковые фамилии в обеих
 * колонках прятали бы перепутанные местами поля.
 */
const STUDENT_NAMES: readonly string[] = [
  'Абдулов Тимур Русланович',
  'Бахтин Егор Владимирович',
  'Верещагина Софья Андреевна',
  'Гончаров Марк Дмитриевич',
  'Дорохова Алиса Игоревна',
  'Ерофеев Артур Максимович',
  'Жданова Милана',
  'Зотов Даниил Сергеевич',
  'Исаева Камила Ринатовна',
  'Кабанов Матвей Львович',
  'Лаптев Савелий Юрьевич',
  'Мамедова Лейла Эльдаровна',
  'Наумов Всеволод Игоревич',
  'Овсянников Тихон Петрович',
  'Пахомова Ева Данииловна',
  'Рожков Николай Аркадьевич',
  'Сорокина Виктория Тарасовна',
  'Терентьев Богдан Русланович',
  'Устинова Злата Кирилловна',
  'Филатов Герман Антонович',
  'Хайруллин Ильдар Маратович',
  'Цибулько Аглая Романовна',
  'Чернышёв Родион Валерьевич',
];

/**
 * Шифры научных специальностей номенклатуры 2021 года — те, по которым
 * кафедра и готовит аспирантов. Свободной строкой их не заменить:
 * в колонке видно, что это код, а не название, и по нему же работает
 * фильтр `?speciality=` контракта.
 */
const SPECIALITIES = ['2.3.1', '2.3.3', '2.3.5', '1.2.2'];

/** Темы диссертаций — правдоподобные, из предметной области кафедры. */
const THEMES = [
  'Адаптивное управление многосвязными технологическими объектами',
  'Алгоритмы диагностики станочного оборудования по вибросигналам',
  'Модели планирования загрузки гибких производственных систем',
  'Цифровые двойники металлорежущих станков',
  'Оптимизация раскроя листового материала эвристическими методами',
  'Программное обеспечение распределённых систем сбора телеметрии',
];

/**
 * Руководители — из фикстуры ППС, вместе с их `id`: ссылка из таблицы
 * ведёт на карточку, и мок, назвавший несуществующего преподавателя,
 * отправлял бы её в `404`.
 */
const SUPERVISORS: readonly (readonly [number, string])[] = [
  [3, 'Баранов Илья Матвеевич'],
  [5, 'Волков Артём Дмитриевич'],
  [14, 'Кузнецова Татьяна Николаевна'],
  [19, 'Петров Пётр Петрович'],
  [21, 'Соколов Денис Игоревич'],
];

/**
 * Двадцать три записи аспирантуры — на одну больше, чем помещается
 * на страницу. При размере 20 это ровно две страницы: пагинатор рисуется,
 * вторая страница неполная, а `?page=3` попадает за пределы данных. Числа
 * и причины те же, что у фикстур новостей, ППС и УВП.
 *
 * Порядок — **по фамилии аспиранта**, как отдаёт контракт по умолчанию:
 * фикстура, перемешанная как попало, врала бы про сортировку.
 *
 * Крайние случаи заведены нарочно, и все четыре берутся из схемы, а не
 * из головы: запись без руководителя (пара `null`, docs/API.md), без
 * специальности и без темы (обе колонки в базе необязательные) и с темой
 * в две строки — колонка темы самая широкая, и переносить её приходится
 * именно на таких.
 */
export const postgraduatesFixture: readonly Postgraduate[] = buildPostgraduates();

function buildPostgraduates(): readonly Postgraduate[] {
  return STUDENT_NAMES.map((studentName, index) => {
    const [teacherId, teacherName] = SUPERVISORS[index % SUPERVISORS.length];

    return makePostgraduate({
      // `id` — записи аспирантуры, `studentId` — студента: разные
      // пространства, и разведены нарочно, чтобы перепутанные местами
      // поля были видны.
      id: index + 1,
      studentId: 101 + index,
      studentName,
      speciality: index === 4 ? null : SPECIALITIES[index % SPECIALITIES.length],
      diplomaTheme: pickTheme(index),
      // Шесть лет поступления по кругу: аспирантура длится три-четыре года,
      // и в списке одновременно живут несколько наборов.
      admissionYear: 2021 + (index % 6),
      // Третья запись — без руководителя. Так выглядит и новая запись,
      // и любая после удаления карточки ППС: контракт обнуляет
      // руководителя, а не запись.
      teacherId: index === 2 ? null : teacherId,
      teacherName: index === 2 ? null : teacherName,
    });
  });
}

function pickTheme(index: number): string | null {
  // Тема в две строки — на первой же записи после верхней: перенос
  // в самой широкой колонке виден сразу, а не на второй странице.
  if (index === 1) {
    return 'Разработка методов и алгоритмов автоматизированного контроля точности обработки на многокоординатных станках с числовым программным управлением';
  }

  // Восьмая — без темы: аспирант первого года ещё не утвердил её.
  if (index === 7) return null;

  return THEMES[index % THEMES.length];
}

/**
 * Строка, по которой ищет `?q=`, — та же склейка, что и на бэкенде:
 * ФИО аспиранта, тема, специальность, год поступления, ФИО руководителя
 * через пробел (`PostgraduateRepository.search`). Склейка тут не ради
 * удобства: она меняет результат — `абрамов пётр` находит запись, хотя
 * ни в одном отдельном поле такого текста нет, и мок, ищущий по каждому
 * полю отдельно, тихо расходился бы с сервером именно на таких запросах.
 *
 * Незаполненные поля дают пустое место между пробелами — как `coalesce`
 * в запросе, а не выпадают из строки: иначе `2.3.1 2025` находилось бы
 * там, где у сервера между специальностью и годом стоит пустая тема.
 */
function searchableText(item: Postgraduate): string {
  return [
    item.studentName,
    item.diplomaTheme ?? '',
    item.speciality ?? '',
    String(item.admissionYear),
    item.teacherName ?? '',
  ]
    .join(' ')
    .toLowerCase();
}

/**
 * Запись так, как её хранит мок: студент по частям и с группой, как
 * в форме правки, плюс подпись руководителя для публичного списка.
 * Обе проекции контракта — элемент списка и запись формы — собираются
 * из неё, а не хранятся рядом: две копии разошлись бы на первой правке.
 */
type StoredPostgraduate = {
  id: number;
  studentId: number;
  student: PostgraduateStudent;
  teacherId: number | null;
};

/**
 * Записи аспирантуры целиком: публичное чтение и модераторский CRUD.
 *
 * Мок **с состоянием**, как у УВП и карточек ППС: заведённая запись
 * появляется в списке, правка видна там же, удалённая исчезает. Один
 * набор на две роли — разведённые, чтение и правка стали бы двумя
 * разными выдумками.
 *
 * ### Публичный список
 *
 * `q` разобран, потому что фронт его отправляет: поиск приехал с T-78
 * по заявке B-3. Регистр не учитывается, `%` и `_` — обычные символы
 * (бэкенд экранирует их перед `like`), пустой и пробельный запрос
 * равносилен отсутствию фильтра. Счётчики страницы считаются **после**
 * поиска: `totalElements` контракта — «сколько всего с учётом фильтров».
 *
 * Фильтры `?teacherId=` и `?speciality=` и `?sort=` не разобраны
 * намеренно: фронт их не отправляет ни с публичной страницы, ни из админки
 * (разбор, почему у раздела нет сортировки, — в `useAdminPostgraduates`).
 *
 * ### Запись
 *
 * Отказы — те же, что у сервера, и того же вида. Словарь `errors`
 * с вложенными именами (`student.lastName`) — у проверок `@Valid`;
 * без словаря — у проверок сервиса: уровень образования не `POSTGRADUATE`,
 * год поступления в будущем, неизвестный руководитель. Последний —
 * `400`, а не `404`: так отвечает `TeacherService.getTeacherEntity`.
 *
 * Записи принимаются аргументом публичной формы, как и раньше: тесту
 * публичной страницы нужна одна фамилия, а не студент по частям. Части
 * восстанавливаются из склеенного ФИО, группа выдумывается из года.
 */
export function postgraduateHandlers(items: readonly Postgraduate[] = postgraduatesFixture) {
  let current: readonly StoredPostgraduate[] = items.map(fromListItem);
  let nextId = current.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  let nextStudentId = current.reduce((max, item) => Math.max(max, item.studentId), 0) + 1;

  // Подписи руководителей: из фикстуры ППС — её же видит выбор
  // в форме, — поверх неё из самих записей, чтобы тест с выдуманным
  // руководителем не терял его имя на первой же правке.
  const teacherNames = new Map<number, string>(
    teachersFixture.map((teacher) => [
      teacher.id,
      [teacher.lastName, teacher.firstName, teacher.patronymic].filter(Boolean).join(' '),
    ]),
  );
  for (const item of items) {
    if (item.teacherId !== null && item.teacherName !== null) {
      teacherNames.set(item.teacherId, item.teacherName);
    }
  }

  const toListItem = (stored: StoredPostgraduate): Postgraduate => ({
    id: stored.id,
    studentId: stored.studentId,
    studentName: [stored.student.lastName, stored.student.firstName, stored.student.patronymic]
      .filter(Boolean)
      .join(' '),
    speciality: stored.student.speciality,
    diplomaTheme: stored.student.diplomaTheme,
    admissionYear: stored.student.admissionYear,
    teacherId: stored.teacherId,
    teacherName: stored.teacherId === null ? null : (teacherNames.get(stored.teacherId) ?? null),
  });

  const notFound = (id: string) =>
    problemResponse(404, {
      title: 'Not Found',
      detail: `Запись аспирантуры id=${id} не найдена`,
      instance: `/api/postgraduates/${id}`,
    });

  /** Отказ на тело запроса либо `null`, если тело годится. */
  const refusal = (body: PostgraduateRequest, instance: string) => {
    const errors = validationErrors(body.student);

    if (errors) {
      return problemResponse(400, {
        title: 'Bad Request',
        detail: 'Ошибка валидации',
        instance,
        errors,
      });
    }

    const detail = serviceRefusal(body, teacherNames);

    return detail === null
      ? null
      : problemResponse(400, { title: 'Bad Request', detail, instance });
  };

  return [
    http.get(PUBLIC_POSTGRADUATES, ({ request }) => {
      const url = new URL(request.url);
      const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
      const list = current.map(toListItem);

      const found = q === '' ? list : list.filter((item) => searchableText(item).includes(q));

      return HttpResponse.json(pageFromUrl(found, url));
    }),

    http.get(`${POSTGRADUATES}/:id`, ({ params }) => {
      const stored = current.find((item) => item.id === Number(params.id));

      if (!stored) return notFound(String(params.id));

      const details: PostgraduateDetails = {
        id: stored.id,
        student: stored.student,
        teacherId: stored.teacherId,
      };

      return HttpResponse.json(details);
    }),

    http.post(POSTGRADUATES, async ({ request }) => {
      const body = (await request.json()) as PostgraduateRequest;
      const refused = refusal(body, '/api/postgraduates');

      if (refused) return refused;

      const created: StoredPostgraduate = {
        id: nextId++,
        studentId: nextStudentId++,
        student: body.student,
        teacherId: body.teacherId,
      };

      current = sortStored([...current, created]);

      return HttpResponse.json(toListItem(created), {
        status: 201,
        headers: { Location: `/api/postgraduates/${created.id}` },
      });
    }),

    http.put(`${POSTGRADUATES}/:id`, async ({ params, request }) => {
      const id = Number(params.id);
      const existing = current.find((item) => item.id === id);

      if (!existing) return notFound(String(params.id));

      const body = (await request.json()) as PostgraduateRequest;
      const refused = refusal(body, `/api/postgraduates/${id}`);

      if (refused) return refused;

      const updated: StoredPostgraduate = {
        ...existing,
        student: body.student,
        teacherId: body.teacherId,
      };

      current = sortStored(current.map((item) => (item.id === id ? updated : item)));

      return HttpResponse.json(toListItem(updated));
    }),

    http.delete(`${POSTGRADUATES}/:id`, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((item) => item.id === id)) return notFound(String(params.id));

      current = current.filter((item) => item.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Элемент публичного списка → запись мока. ФИО режется по пробелам:
 * фикстура склеивает его так же, как бэкенд, — фамилия, имя и, если есть,
 * отчество. Группа выдумана из года поступления: в публичном списке
 * её нет вовсе.
 */
function fromListItem(item: Postgraduate): StoredPostgraduate {
  const [lastName = '', firstName = '', ...rest] = item.studentName.split(' ');

  return {
    id: item.id,
    studentId: item.studentId,
    student: {
      lastName,
      firstName,
      patronymic: rest.length > 0 ? rest.join(' ') : null,
      group: `АДМ-${String(item.admissionYear).slice(2)}-01`,
      educationLevel: 'POSTGRADUATE',
      speciality: item.speciality,
      diplomaTheme: item.diplomaTheme,
      admissionYear: item.admissionYear,
    },
    teacherId: item.teacherId,
  };
}

/**
 * Порядок контракта по умолчанию: фамилия, имя, `id` (`@PageableDefault`).
 * Держится после каждой записи, иначе новая запись вставала бы в конец
 * списка, а не на место своей фамилии.
 */
function sortStored(items: readonly StoredPostgraduate[]): readonly StoredPostgraduate[] {
  return [...items].sort(
    (a, b) =>
      a.student.lastName.localeCompare(b.student.lastName, 'ru') ||
      a.student.firstName.localeCompare(b.student.firstName, 'ru') ||
      a.id - b.id,
  );
}

/**
 * Проверки `@Valid` из `StudentRequestDto` — те, что дают словарь
 * с вложенными именами полей. Длины строк мок не сверяет: форма режет
 * их сама, и проверить ими нечего.
 */
function validationErrors(student: PostgraduateStudent): Record<string, string[]> | null {
  const errors: Record<string, string[]> = {};

  if (student.lastName.trim() === '') errors['student.lastName'] = ['Фамилия обязательна'];
  if (student.firstName.trim() === '') errors['student.firstName'] = ['Имя обязательно'];
  if (student.group.trim() === '') errors['student.group'] = ['Группа обязательна'];
  if (student.admissionYear < 2000) {
    errors['student.admissionYear'] = ['Год поступления не раньше 2000'];
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

/** Проверки сервиса — отказ без словаря, одной строкой `detail`. */
function serviceRefusal(
  body: PostgraduateRequest,
  teacherNames: ReadonlyMap<number, string>,
): string | null {
  if (body.student.educationLevel !== 'POSTGRADUATE') {
    return 'В записи аспирантуры уровень образования должен быть POSTGRADUATE';
  }

  if (body.student.admissionYear > new Date().getFullYear()) {
    return `Год поступления не может быть в будущем: ${body.student.admissionYear}`;
  }

  if (body.teacherId !== null && !teacherNames.has(body.teacherId)) {
    return `Преподаватель не найден: id=${body.teacherId}`;
  }

  return null;
}
