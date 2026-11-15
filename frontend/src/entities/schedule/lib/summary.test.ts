import { describe, expect, it } from 'vitest';

import { makeLesson } from '@shared/api/mocks';
import type { TeacherSchedule } from '@shared/types';

import { lessonSlots, summaryLessons, summaryTeachers } from './summary';

const schedules: TeacherSchedule[] = [
  {
    teacherId: 3,
    teacherName: 'Абрамов Александр Сергеевич',
    lessons: [makeLesson({ id: 1, classTime: 3 }), makeLesson({ id: 2, classTime: 1 })],
  },
  { teacherId: 5, teacherName: 'Без Пар', lessons: [] },
  {
    teacherId: 7,
    teacherName: 'Чеканин Владимир Алексеевич',
    lessons: [makeLesson({ id: 3, classTime: 1 })],
  },
];

describe('summaryLessons', () => {
  it('расплющивает пары всех преподавателей в порядке ответа и подписывает, чьи они', () => {
    const lessons = summaryLessons(schedules);

    expect(lessons.map((lesson) => [lesson.id, lesson.teacherId, lesson.teacherName])).toEqual([
      [1, 3, 'Абрамов Александр Сергеевич'],
      [2, 3, 'Абрамов Александр Сергеевич'],
      [3, 7, 'Чеканин Владимир Алексеевич'],
    ]);
  });

  it('отбирает выбранных преподавателей; неизвестный id просто не даёт пар', () => {
    expect(summaryLessons(schedules, [7, 99]).map((lesson) => lesson.id)).toEqual([3]);
    expect(summaryLessons(schedules, [99])).toEqual([]);
  });
});

describe('summaryTeachers', () => {
  it('перечисляет преподавателей с парами в порядке ответа, пустых пропускает', () => {
    expect(summaryTeachers(schedules)).toEqual([
      { id: 3, name: 'Абрамов Александр Сергеевич' },
      { id: 7, name: 'Чеканин Владимир Алексеевич' },
    ]);
  });
});

describe('lessonSlots', () => {
  it('раскладывает пары по номерам по возрастанию, внутри номера сохраняя порядок входа', () => {
    const slots = lessonSlots(summaryLessons(schedules));

    expect(slots.map((slot) => [slot.classTime, slot.lessons.map((lesson) => lesson.id)])).toEqual(
      [
        [1, [2, 3]],
        [3, [1]],
      ],
    );
  });

  it('пустой день — пустой список, без номеров-заглушек', () => {
    expect(lessonSlots([])).toEqual([]);
  });
});
