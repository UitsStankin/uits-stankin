/**
 * Преподаватели (ППС) — контракт T-26 (docs/API.md, «Преподаватели»).
 *
 * Карточка живёт отдельно от учётной записи: ФИО и фото хранятся в ней
 * самой, а не в профиле пользователя. Учётной записи у преподавателя
 * может не быть вовсе, поэтому полей учётки здесь нет — только `userId`
 * самой связи, и только в детальной карточке.
 *
 * Ручек чтения две, и формы у них разные: список отдаёт короткую карточку,
 * детальная — её же плюс контакты, стажи и дисциплины. Своя карточка
 * (`GET`/`PUT /api/teachers/me`, тикет F-16) приходит в полной форме,
 * как детальная.
 */

import type { Page } from './api.types';

/**
 * Учёная степень — код закрытого словаря, а не свободная строка.
 * Подписи рисует фронт: `shared/config/teacherDictionaries.ts`.
 *
 * Коды повторяют старый портал буква в букву, включая неудачный `READER`
 * у званий: в старой базе лежат именно эти строки, и совпадение позволило
 * перенести данные копированием колонки (docs/API.md).
 */
export type TeacherDegree =
  | 'CANDIDATE_TECH'
  | 'DOCTOR_TECH'
  | 'CANDIDATE_PHYS_MATH'
  | 'DOCTOR_PHYS_MATH'
  | 'CANDIDATE_ECONOM'
  | 'DOCTOR_ECONOM'
  | 'CANDIDATE_PED';

/** Учёное звание. `READER` — это «доцент». */
export type TeacherRank = 'READER' | 'PROFESSOR';

/**
 * Дисциплина — элемент `subjects` карточки и словаря `GET /api/subjects`.
 * Схема одна на оба места: те же три поля приходят и там, и там.
 */
export type Subject = {
  id: number;
  name: string;
  /** Незаполненное описание приходит как `null`, а не пустой строкой. */
  description: string | null;
};

/** Страница словаря дисциплин — ответ `GET /api/subjects`. */
export type SubjectPage = Page<Subject>;

/**
 * Тело `POST /api/subjects` и `PUT /api/subjects/{id}` — оно у них одно
 * и то же, поэтому и тип один.
 *
 * `PUT` — полная замена, как у остальных карточек: тело без `description`
 * очищает описание (docs/API.md, «Преподаватели», врезка про дисциплины).
 * Поэтому поле не необязательное — `?` здесь означал бы «можно не слать»,
 * а слать нужно всегда, просто иногда `null`.
 */
export type SubjectRequest = {
  /** Обязательно, до 100 символов, уникально среди дисциплин. */
  name: string;
  /** `null` — очистить описание. */
  description: string | null;
};

/** Короткая карточка — элемент `GET /api/public/teachers`. */
export type TeacherListItem = {
  /** Идентификатор карточки; для ручек учётных записей не годится. */
  id: number;
  lastName: string;
  firstName: string;
  patronymic: string | null;
  /** Должность — свободная строка, словаря у неё нет. */
  position: string;
  degree: TeacherDegree | null;
  rank: TeacherRank | null;
  /** Готовый адрес для `<img src>`, относительный; без фото — `null`. */
  avatarUrl: string | null;
};

/**
 * Полная карточка — ответ `GET /api/public/teachers/{id}` и обеих ручек
 * `/api/teachers/me`.
 */
export type Teacher = TeacherListItem & {
  /**
   * Учётная запись, привязанная к карточке, или `null`.
   *
   * Приходит только в детальной карточке (`TeacherDetailsResponseDto`,
   * `@Mapping(target = "userId", source = "user.id")`) — в списке связи
   * нет. Учётки у карточки может не быть вовсе, и это штатно: карточка
   * живёт отдельно от неё.
   *
   * До F-44 (2026-09-10) поля в типах не было, хотя контракт отдавал его
   * с самого T-26. Заметить это было негде: своя карточка связь
   * не показывает и не правит — «иначе он переписал бы её на чужую учётку
   * и увёл карточку» (docs/API.md), — а публичной карточке она не нужна.
   * Дыра вскрылась на форме модератора: `PUT` — полная замена, и форма,
   * не отправившая `userId` обратно, **снимала бы связь** у каждой
   * сохранённой карточки. Молча, и заметил бы это преподаватель — тем,
   * что его «моя карточка» вдруг отвечает `404`.
   */
  userId: number | null;
  /**
   * Ключ файла аватара — он же уходит обратно в `PUT`.
   *
   * Появился с T-44 (2026-08-29) по заявке B-1. До него обе ручки чтения
   * отдавали только адрес, а `PUT` — полная замена и ждёт именно ключ:
   * преподаватель, поправивший телефон, не мог честно сохранить своё фото.
   * Ключ добывался разбором адреса — времянка удалена вместе с этой строкой.
   *
   * В элементе списка (`TeacherListItem`) ключа нет и не будет: там правки
   * не бывает, только показ (docs/API.md, «Преподаватели»).
   */
  avatar: string | null;
  /** Рабочие контакты из карточки, их заполняет модератор, — не из учётки. */
  phoneNumber: string | null;
  email: string | null;
  messenger: string | null;
  /** Общий стаж, полных лет. */
  experience: number | null;
  /** Стаж по специальности, полных лет. */
  professionalExperience: number | null;
  education: string | null;
  qualification: string | null;
  bio: string | null;
  /** Ссылки на PDF с расписанием экзаменов выпускных и невыпускных курсов. */
  examScheduleGraduation: string | null;
  examScheduleNonGraduation: string | null;
  /** Дисциплины по алфавиту названий; в короткой карточке их нет. */
  subjects: Subject[];
};

/** Страница коротких карточек. */
export type TeacherPage = Page<TeacherListItem>;

/**
 * Тело `PUT /api/teachers/me` (`TeacherRequestDto` без `subjectIds`:
 * дисциплины назначает модератор, пришедшее от преподавателя поле бэкенд
 * игнорирует — слать его незачем).
 *
 * `PUT` — **полная замена**: поле, не пришедшее в теле, обнуляется,
 * форма обязана отправлять все поля. Обязательны только `lastName`,
 * `firstName` и `position`, остальное может быть `null`.
 *
 * `avatar` — **ключ** файла из `POST /api/files` с `category: avatars`,
 * не адрес; ключ несуществующего файла — `400`. `null` очищает аватар
 * и удаляет прежний файл с диска.
 *
 * Админский CRUD шлёт то же тело плюс `subjectIds` и `userId` —
 * `TeacherAdminRequest` ниже (F-44).
 */
export type TeacherUpsertRequest = {
  lastName: string;
  firstName: string;
  patronymic: string | null;
  position: string;
  degree: TeacherDegree | null;
  rank: TeacherRank | null;
  avatar: string | null;
  phoneNumber: string | null;
  email: string | null;
  messenger: string | null;
  experience: number | null;
  professionalExperience: number | null;
  education: string | null;
  qualification: string | null;
  bio: string | null;
  examScheduleGraduation: string | null;
  examScheduleNonGraduation: string | null;
};

/**
 * Тело `POST /api/teachers` и `PUT /api/teachers/{id}` — то же, что у своей
 * карточки, плюс два поля, которые правит только модератор.
 *
 * Оба подчиняются правилу полной замены, и оба поэтому обязательны
 * в теле, а не «можно не слать»: не пришедший `userId` снимает связь
 * с учётной записью, не пришедшие `subjectIds` — снимают все дисциплины.
 * `?` здесь означал бы «необязательно отправлять», а отправлять нужно
 * всегда, просто иногда `null` и пустой список.
 *
 * `subjectIds` — `id` существующих дисциплин из `GET /api/subjects`;
 * неизвестный `id` — `400`. `userId` — `id` учётки из справочника
 * `GET /api/users/directory`; `400` даёт неизвестный `id`, учётка без роли
 * `teacher` и учётка, уже занятая другой карточкой (связь один к одному).
 */
export type TeacherAdminRequest = TeacherUpsertRequest & {
  userId: number | null;
  subjectIds: number[];
};

/**
 * Учебно-вспомогательный персонал (УВП) — контракт T-27 (docs/API.md,
 * «УВП»). Лаборанты, инженеры, методисты: карточки без степеней, званий,
 * дисциплин и учётных записей.
 *
 * Форма у карточки одна: она целиком помещается в элементе списка,
 * и `GET /api/public/helpers/{id}` отдаёт то же тело. Короткой и полной
 * проекций, как у ППС, здесь нет — потому нет и пары типов «элемент
 * списка / детальная».
 */
export type Helper = {
  /** Идентификатор карточки; учётной записи за ним не стоит никогда. */
  id: number;
  lastName: string;
  firstName: string;
  patronymic: string | null;
  /** Должность — свободная строка, словаря у неё нет. */
  position: string;
  /**
   * Ключ файла аватара — он же уходит обратно в `PUT /api/helpers/{id}`.
   * В отличие от ППС приходит и в списке: форма-то одна (T-44, заявка B-1).
   */
  avatar: string | null;
  /** Готовый адрес для `<img src>`, относительный; без фото — `null`. */
  avatarUrl: string | null;
};

/** Страница карточек УВП. */
export type HelperPage = Page<Helper>;

/**
 * Тело `POST /api/helpers` и `PUT /api/helpers/{id}` — карточка без `id`
 * и без `avatarUrl`: адрес собирает сервер, форма отправляет ключ.
 *
 * `PUT` — полная замена, как у карточек ППС: обязательны `lastName`,
 * `firstName` и `position`, остальное может быть `null`, а не пришедшее
 * поле обнуляется. Ключ несуществующего файла — `400`.
 */
export type HelperRequest = {
  lastName: string;
  firstName: string;
  patronymic: string | null;
  position: string;
  /** Ключ файла из `POST /api/files?category=avatars`; `null` снимает фото. */
  avatar: string | null;
};
