import { http, HttpResponse } from 'msw';

import type { Teacher, TeacherListItem } from '@shared/types';

import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const TEACHERS_ME = '*/api/teachers/me';
const PUBLIC_TEACHERS = '*/api/public/teachers';

/**
 * Своя карточка ППС со всеми полями контракта. Переопределяется точечно:
 * тесту обычно нужна одна фамилия, а не двадцать полей DTO.
 */
export function makeTeacher(overrides: Partial<Teacher> = {}): Teacher {
  return {
    id: 1,
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
 * Чтение своей карточки. `card: null` — контрактный `404`: роль есть,
 * карточка не привязана. Это не сбой, а состояние, и различать его
 * с настоящим сбоем умеет только страница — значит, мок обязан уметь
 * отдавать оба.
 */
export function teacherHandlers(card: Teacher | null = makeTeacher()) {
  return [
    http.get(TEACHERS_ME, () =>
      card
        ? HttpResponse.json(card)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Карточка преподавателя не найдена',
            instance: '/api/teachers/me',
          }),
    ),
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
 * Публичные ручки ППС: страница коротких карточек и одна полная.
 *
 * Список берётся аргументом, чтобы тест пустого раздела был одной строкой
 * `server.use(...publicTeacherHandlers([]))`, а не копией хендлера
 * с другим телом.
 */
export function publicTeacherHandlers(items: readonly Teacher[] = teachersFixture) {
  return [
    http.get(PUBLIC_TEACHERS, ({ request }) =>
      HttpResponse.json(pageFromUrl(items.map(teacherListItem), new URL(request.url))),
    ),

    http.get(`${PUBLIC_TEACHERS}/:id`, ({ params }) => {
      const teacher = items.find((item) => String(item.id) === params.id);

      // Скрытых карточек у ППС не бывает: `404` здесь значит ровно одно —
      // карточки с таким `id` нет.
      return teacher
        ? HttpResponse.json(teacher)
        : problemResponse(404, {
            title: 'Not Found',
            detail: 'Преподаватель не найден',
            instance: `/api/public/teachers/${String(params.id)}`,
          });
    }),
  ];
}
