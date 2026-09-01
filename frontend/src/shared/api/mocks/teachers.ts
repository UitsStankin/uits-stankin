import { http, HttpResponse } from 'msw';

import type { Teacher } from '@shared/types';

import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const TEACHERS_ME = '*/api/teachers/me';

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
