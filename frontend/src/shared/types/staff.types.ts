/**
 * Преподаватели (ППС) — `TeacherResponseDto`.
 *
 * Карточка склеена из двух таблиц: `employee_teacher` даёт должность,
 * степень и стаж, `users_user` — имя, почту и аватар. Отсюда `userId`
 * рядом с `id`: это разные идентификаторы, и `id` карточки не годится
 * для ручек, работающих с пользователем.
 */

import type { Page } from './api.types';

/** Карточка преподавателя — элемент `GET /api/public/teachers`. */
export type Teacher = {
  /** Идентификатор карточки преподавателя. */
  id: number;
  /** Идентификатор учётной записи. У карточки есть всегда. */
  userId: number;

  // Поля учётной записи: заполнены не у всех.
  firstName: string | null;
  lastName: string | null;
  /** Путь к файлу аватара; `null`, если не загружен. */
  avatar: string | null;
  email: string | null;

  /** Учёная степень, например «к.т.н.». Свободная строка. */
  degree: string | null;
  /** Учёное звание, например «доцент». Свободная строка. */
  rank: string | null;
  position: string | null;
  /** Биография, свободный текст. */
  bio: string | null;
  phoneNumber: string | null;
  education: string | null;
  qualification: string | null;
  /** Стаж работы по специальности, полных лет. */
  professionalExperience: number | null;
};

/** Страница карточек преподавателей. */
export type TeacherPage = Page<Teacher>;

/*
 * Чего в сегодняшнем DTO нет, хотя на действующем сайте это показано
 * (матрица паритета, п. 7 — модуль помечен 🟡 именно из-за этого):
 *
 * - `patronymic` — отчество; в карточке ППС оно есть везде;
 * - `messenger` — контакт помимо телефона и почты;
 * - `experience` — общий стаж, отдельно от стажа по специальности;
 * - `subjects` — дисциплины, связь многие-ко-многим;
 * - `examScheduleGraduation` / `examScheduleNonGraduation` — ссылки на PDF
 *   с расписанием экзаменов для выпускных и невыпускных курсов.
 *
 * Дописывать их сюда заранее нельзя: тип обязан описывать то, что ручка
 * отдаёт сегодня, иначе `teacher.patronymic` молча окажется `undefined`
 * и вылезет пустой строкой в карточке. Появятся на бэкенде — добавим здесь.
 */
