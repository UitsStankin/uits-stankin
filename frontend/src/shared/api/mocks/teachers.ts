import { http, HttpResponse } from 'msw';

import type {
  Teacher,
  TeacherAdminRequest,
  TeacherListItem,
  TeacherUpsertRequest,
} from '@shared/types';

import { DEFAULT_PAGE_SIZE, numberParam, pageResponse } from './page';
import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const TEACHERS_ME = '*/api/teachers/me';
const PUBLIC_TEACHERS = '*/api/public/teachers';
const TEACHERS = '*/api/teachers';

/**
 * Своя карточка ППС со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужна одна фамилия, а не двадцать полей DTO.
 */
export function makeTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 1,
    // Учётка у карточки есть: своя карточка (`/api/teachers/me`) без связи
    // не существует вовсе — по ней ручка и находит, чью карточку отдавать.
    userId: 7,
    lastName: 'Петров',
    firstName: 'Пётр',
    patronymic: 'Петрович',
    position: 'доцент кафедры',
    degree: 'CANDIDATE_TECH',
    rank: 'READER',
    avatarUrl: null,
    avatar: null,
    phoneNumber: '+7 495 000-00-00',
    email: 'petrov@stankin.ru',
    messenger: null,
    experience: 20,
    professionalExperience: 15,
    education: 'МГТУ «СТАНКИН», 2005',
    qualification: null,
    bio: null,
    examScheduleGraduation: null,
    examScheduleNonGraduation: null,
    subjects: [{ id: 1, name: 'Базы данных', description: 'Реляционная модель, SQL' }],
    ...overrides,
  };
}

/**
 * Чтение и правка своей карточки. `card: null` — контрактный `404`: роль
 * есть, карточка не привязана. Это не сбой, а состояние, и различать его
 * с настоящим сбоем умеет только страница — значит, мок обязан уметь
 * отдавать оба.
 *
 * `PUT` отвечает карточкой, собранной из тела по правилам контракта,
 * а не самим телом: ручка — полная замена, но дисциплины она не трогает
 * (их назначает модератор), а вместо ключа аватара в ответе приходит пара
 * «ключ и адрес». Мок, возвращающий присланное, зеленил бы форму,
 * потерявшую дисциплины.
 *
 * Своё состояние, отдельное от `teacherHandlers`. На живом бэкенде это
 * одна и та же строка таблицы: правка модератором карточки, которая
 * кому-то «своя», видна в личном кабинете сразу. Здесь связи нет,
 * и это осознанный шов — сводить два набора значило бы заводить в моке
 * учётные записи и связь один к одному ради случая, которого ни один
 * тест не проверяет. Найдётся такой — шов станет виден именно там.
 */
export function myTeacherCardHandlers(card: Teacher | null = makeTeacher()) {
  let current = card;

  const notFound = () =>
    problemResponse(404, {
      title: 'Not Found',
      detail: 'Карточка преподавателя не найдена',
      instance: '/api/teachers/me',
    });

  return [
    http.get(TEACHERS_ME, () => (current ? HttpResponse.json(current) : notFound())),

    http.put(TEACHERS_ME, async ({ request }) => {
      if (!current) return notFound();

      const body = (await request.json()) as TeacherUpsertRequest;

      current = {
        ...current,
        ...body,
        // Адрес собирает бэкенд, и по ключу его на фронте не построить —
        // здесь это делает мок, ровно как хранилище: префикс `/media`.
        avatarUrl: body.avatar === null ? null : `/media/${body.avatar}`,
        subjects: current.subjects,
      };

      return HttpResponse.json(current);
    }),
  ];
}

/**
 * ФИО по алфавиту фамилий. У одного отчества нет вовсе: контракт разрешает
 * `null`, и склейка ФИО обязана не дописывать « null» к имени.
 */
const NAMES: readonly (readonly [string, string, string | null])[] = [
  ['Абрамов', 'Никита', 'Сергеевич'],
  ['Андреева', 'Ольга', 'Викторовна'],
  ['Баранов', 'Илья', 'Матвеевич'],
  ['Белова', 'Екатерина', 'Андреевна'],
  ['Волков', 'Артём', 'Дмитриевич'],
  ['Воронцова', 'Марина', 'Петровна'],
  ['Гаврилов', 'Степан', null],
  ['Григорьева', 'Анна', 'Ивановна'],
  ['Данилов', 'Кирилл', 'Олегович'],
  ['Егорова', 'Светлана', 'Борисовна'],
  ['Жуков', 'Роман', 'Валерьевич'],
  ['Зайцева', 'Полина', 'Максимовна'],
  ['Ильин', 'Георгий', 'Антонович'],
  ['Кузнецова', 'Татьяна', 'Николаевна'],
  ['Лебедев', 'Виктор', 'Павлович'],
  ['Морозова', 'Ирина', 'Алексеевна'],
  ['Никитин', 'Павел', 'Юрьевич'],
  ['Орлова', 'Дарья', 'Романовна'],
  ['Петров', 'Пётр', 'Петрович'],
  ['Родионова', 'Алла', 'Тимофеевна'],
  ['Соколов', 'Денис', 'Игоревич'],
  ['Тарасова', 'Вера', 'Львовна'],
  ['Фёдоров', 'Максим', 'Эдуардович'],
];

const POSITIONS = ['доцент кафедры', 'профессор кафедры', 'старший преподаватель', 'ассистент'];

const DEGREES = ['CANDIDATE_TECH', 'DOCTOR_TECH', 'CANDIDATE_PHYS_MATH'] as const;

const RANKS = ['READER', 'PROFESSOR'] as const;

/** Дисциплины, которые раздаются карточкам по кругу. */
const SUBJECTS = [
  { id: 1, name: 'Базы данных', description: 'Реляционная модель, SQL' },
  { id: 2, name: 'Операционные системы', description: null },
  { id: 3, name: 'Проектирование информационных систем', description: 'От ТЗ до внедрения' },
] as const;

/**
 * Двадцать три карточки ППС — на одну больше, чем помещается на страницу.
 * При размере 20 это ровно две страницы: пагинатор рисуется, вторая
 * страница неполная, а `?page=3` попадает за пределы данных. Числа взяты
 * по той же причине, что и в фикстуре новостей, — на списке из трёх
 * ни один из трёх случаев не проверить.
 *
 * Порядок — **по фамилии**, как отдаёт контракт по умолчанию. Фикстура,
 * перемешанная как попало, врала бы про сортировку: тест второй страницы
 * прошёл бы при любом порядке, а на живом бэкенде список выглядел бы иначе.
 *
 * Данные правдоподобные, а не «Преподаватель 1…23»: тем же набором
 * пользуется браузер под `VITE_ENABLE_MOCKS`, и на выдуманных подписях
 * не видно ни длинных ФИО в две строки, ни карточки без степени и звания.
 * Крайние случаи заведены нарочно: без отчества, без степени и звания,
 * без фото, с фотографией, с пустым списком дисциплин.
 */
export const teachersFixture: readonly Teacher[] = buildTeachers();

function buildTeachers(): readonly Teacher[] {
  return NAMES.map(([lastName, firstName, patronymic], index) =>
    makeTeacher({
      id: index + 1,
      lastName,
      firstName,
      patronymic,
      position: POSITIONS[index % POSITIONS.length],
      // Каждый четвёртый — без степени, каждый третий — без звания:
      // ассистенты и старшие преподаватели существуют, и подпись под ФИО
      // обязана собираться из того, что есть.
      degree: index % 4 === 3 ? null : DEGREES[index % DEGREES.length],
      rank: index % 3 === 2 ? null : RANKS[index % RANKS.length],
      // Фото есть у первого — в списке проверяется, что адрес идёт в `src`,
      // а не подменяется заглушкой.
      avatarUrl: index === 0 ? '/media/avatars/2026/08/a3f9.jpg' : null,
      avatar: index === 0 ? 'avatars/2026/08/a3f9.jpg' : null,
      // Каждый пятый — без дисциплин: их назначает модератор, и новая
      // карточка живёт с пустым списком, пока до неё не дошли руки.
      subjects: index % 5 === 0 ? [] : SUBJECTS.slice(index % 2, (index % 2) + 2),
    }),
  );
}

/**
 * Короткая карточка из полной — тем же способом, что и бэкенд: одна
 * сущность, две проекции.
 *
 * Поля списка перечислены поимённо, а не выброшены через `Omit`: контракт
 * обещает списку ровно семь полей, и мок, отдающий заодно контакты
 * и дисциплины, скрыл бы страницу, которая на них молча опирается, —
 * а на живом бэкенде она бы развалилась.
 */
export function teacherListItem(teacher: Teacher): TeacherListItem {
  return {
    id: teacher.id,
    lastName: teacher.lastName,
    firstName: teacher.firstName,
    patronymic: teacher.patronymic,
    position: teacher.position,
    degree: teacher.degree,
    rank: teacher.rank,
    avatarUrl: teacher.avatarUrl,
  };
}

/**
 * Карточки ППС целиком: публичное чтение и модераторский CRUD.
 *
 * Мок **с состоянием**: заведённая карточка появляется в списке, правка
 * видна и в списке, и в детальной, удалённая исчезает отовсюду. Один
 * набор на две роли — по той же причине, что у новостей: разведённые
 * по разным наборам, чтение и правка стали бы двумя разными выдумками,
 * и форма, ничего не сохраняющая, зеленела бы.
 *
 * Список берётся аргументом, чтобы тест пустого раздела был одной строкой
 * `server.use(...teacherHandlers([]))`, а не копией хендлера с другим телом.
 *
 * Что мок повторяет из контракта, а что нет:
 *
 * - две проекции — да: список отдаёт **короткую** карточку (`teacherListItem`),
 *   детальная — полную. Раздел админки читает список и потому не знает
 *   ни дисциплин, ни ключа фото, ни связи с учёткой — форма правки
 *   догружает карточку сама, и мок, отдающий списку всё, скрыл бы это;
 * - сортировка `?sort=` — да, по трём полям карточки: на ней стоит
 *   проверка смены порядка, а клиентская сортировка вместо серверной
 *   была бы ровно тем враньём, от которого таблица отказалась
 *   (`manualSorting`);
 * - `400` на неизвестную дисциплину, занятую и безролевую учётку — нет:
 *   заводятся точечно через `server.use`, потому что зависят от данных,
 *   которых у мока карточек нет. Мок, выдумавший свой словарь учёток,
 *   сторожил бы собственную выдумку.
 */
export function teacherHandlers(items: readonly Teacher[] = teachersFixture) {
  let current = [...items];
  let nextId = current.reduce((max, teacher) => Math.max(max, teacher.id), 0) + 1;

  const notFound = (instance: string) =>
    problemResponse(404, { title: 'Not Found', detail: 'Преподаватель не найден', instance });

  return [
    http.get(PUBLIC_TEACHERS, ({ request }) => {
      const url = new URL(request.url);
      const sorted = sortTeachers(current, url.searchParams.get('sort'));

      return HttpResponse.json(
        pageResponse(
          sorted.map(teacherListItem),
          numberParam(url, 'page', 0),
          numberParam(url, 'size', DEFAULT_PAGE_SIZE, 1),
        ),
      );
    }),

    http.get(`${PUBLIC_TEACHERS}/:id`, ({ params }) => {
      const teacher = current.find((item) => String(item.id) === params.id);

      // Скрытых карточек у ППС не бывает: `404` здесь значит ровно одно —
      // карточки с таким `id` нет.
      return teacher
        ? HttpResponse.json(teacher)
        : notFound(`/api/public/teachers/${String(params.id)}`);
    }),

    http.post(TEACHERS, async ({ request }) => {
      const body = (await request.json()) as TeacherAdminRequest;
      const created = cardFromRequest(makeTeacher({ id: nextId++ }), body);

      current = [...current, created];

      return HttpResponse.json(created, { status: 201 });
    }),

    http.put(`${TEACHERS}/:id`, async ({ params, request }) => {
      const id = Number(params.id);
      const existing = current.find((teacher) => teacher.id === id);

      if (!existing) return notFound(`/api/teachers/${String(params.id)}`);

      const body = (await request.json()) as TeacherAdminRequest;
      const updated = cardFromRequest(existing, body);

      current = current.map((teacher) => (teacher.id === id ? updated : teacher));

      return HttpResponse.json(updated);
    }),

    http.delete(`${TEACHERS}/:id`, ({ params }) => {
      const id = Number(params.id);

      if (!current.some((teacher) => teacher.id === id)) {
        return notFound(`/api/teachers/${String(params.id)}`);
      }

      current = current.filter((teacher) => teacher.id !== id);

      return new HttpResponse(null, { status: 204 });
    }),
  ];
}

/**
 * Карточка из тела запроса — так же, как её собирает бэкенд.
 *
 * Три вещи мок делает сам, потому что их делает сервер, а не форма:
 * собирает `avatarUrl` из ключа (префикс `/media`, как в хранилище),
 * разворачивает `subjectIds` в объекты дисциплин и отбрасывает всё
 * остальное. Мок, возвращающий присланное тело, отдал бы форме `subjectIds`
 * вместо `subjects` — и она зеленела бы, показывая пустой список дисциплин.
 *
 * Дисциплины берутся из общего словаря `SUBJECTS`: своего справочника
 * у мока карточек нет, а выдумывать имя по `id` («Дисциплина 7») значило бы
 * рисовать в форме то, чего в словаре нет. Незнакомый `id` до сюда
 * не доезжает — на живом бэкенде это `400`, и заводится он в тесте точечно.
 */
function cardFromRequest(base: Teacher, body: TeacherAdminRequest): Teacher {
  const { subjectIds, avatar, ...fields } = body;

  return {
    ...base,
    ...fields,
    avatar,
    avatarUrl: avatar === null ? null : `/media/${avatar}`,
    subjects: subjectIds
      .map((id) => SUBJECTS.find((subject) => subject.id === id))
      .filter((subject) => subject !== undefined),
  };
}

/**
 * Порядок — тот же, что у Spring: `lastName`, затем `firstName`, затем
 * `id`, если параметра нет (`@PageableDefault`). Последний ключ уникален
 * не для красоты: без него две однофамилицы меняются местами между
 * запросами, и при листании одна приезжает дважды, а другая не приезжает
 * вовсе.
 *
 * Сравнение русских строк — `localeCompare`, иначе «Ё» уезжает за «Я».
 * Направление `desc` переворачивает **всё** сравнение, включая `id`, —
 * ровно как `Sort.Direction` у Spring, где направление принадлежит
 * запрошенному полю, а не каждому ключу по отдельности.
 */
function sortTeachers(items: readonly Teacher[], sort: string | null): readonly Teacher[] {
  const [field, direction] = (sort ?? '').split(',');
  const sign = direction === 'desc' ? -1 : 1;
  const primary = field === 'firstName' || field === 'position' ? field : 'lastName';

  return [...items].sort(
    (a, b) =>
      sign *
      (a[primary].localeCompare(b[primary], 'ru') ||
        a.lastName.localeCompare(b.lastName, 'ru') ||
        a.firstName.localeCompare(b.firstName, 'ru') ||
        a.id - b.id),
  );
}
