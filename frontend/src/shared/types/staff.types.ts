/**
 * Преподаватели (ППС) — контракт T-26 (docs/API.md, «Преподаватели»).
 *
 * Карточка живёт отдельно от учётной записи: ФИО и фото хранятся в ней
 * самой, а не в профиле пользователя. Учётной записи у преподавателя
 * может не быть вовсе — поэтому здесь нет ни `userId`, ни полей учётки.
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
 * Админский CRUD (F-44) шлёт то же тело плюс `subjectIds` — расширение
 * заведём там же, вместе с формой, которая его отправит.
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
