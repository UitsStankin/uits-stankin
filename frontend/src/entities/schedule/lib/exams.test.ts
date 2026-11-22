import { describe, expect, it } from 'vitest';

import { makeExam } from '@shared/api/mocks';

import { calendarDay, parseIsoDate } from './calendarDay';
import {
  examDays,
  examGroups,
  formatConsultation,
  formatExamDay,
  formatExamTimeRange,
} from './exams';

describe('parseIsoDate', () => {
  it('разбирает ISO-дату в день', () => {
    expect(parseIsoDate('2025-05-15')).toBe(calendarDay(2025, 5, 15));
  });

  it('несуществующая дата и чужой формат дают null, а не соседний день', () => {
    expect(parseIsoDate('2025-02-30')).toBeNull();
    expect(parseIsoDate('15.05.2025')).toBeNull();
    expect(parseIsoDate('2025-5-15')).toBeNull();
  });
});

describe('examDays', () => {
  it('сводит экзамены разных преподавателей в дни, по порядку дат', () => {
    const days = examDays([
      {
        teacherId: 1,
        teacherName: 'Абрамов Никита Сергеевич',
        exams: [
          makeExam({ id: 1, date: '2027-01-15', timeStart: '10:20' }),
          makeExam({ id: 2, date: '2027-01-11' }),
        ],
      },
      {
        teacherId: 2,
        teacherName: 'Андреева Ольга Викторовна',
        exams: [makeExam({ id: 3, date: '2027-01-15', timeStart: '08:30' })],
      },
    ]);

    expect(days.map((day) => day.day)).toEqual([
      calendarDay(2027, 1, 11),
      calendarDay(2027, 1, 15),
    ]);
    // Внутри дня — по времени начала, а не по порядку в ответе.
    expect(days[1].exams.map((exam) => [exam.id, exam.teacherName])).toEqual([
      [3, 'Андреева Ольга Викторовна'],
      [1, 'Абрамов Никита Сергеевич'],
    ]);
  });

  it('в одно время — по преподавателю, чтобы порядок не зависел от ответа', () => {
    const days = examDays([
      { teacherId: 2, teacherName: 'Борисов', exams: [makeExam({ id: 1 })] },
      { teacherId: 1, teacherName: 'Аксёнов', exams: [makeExam({ id: 2 })] },
    ]);

    expect(days[0].exams.map((exam) => exam.teacherName)).toEqual(['Аксёнов', 'Борисов']);
  });

  it('пропускает экзамен с неразборчивой датой, не роняя остальные', () => {
    const days = examDays([
      {
        teacherId: 1,
        teacherName: 'Абрамов',
        exams: [makeExam({ id: 1, date: '15.01' }), makeExam({ id: 2 })],
      },
    ]);

    expect(days).toHaveLength(1);
    expect(days[0].exams.map((exam) => exam.id)).toEqual([2]);
  });

  it('пустой ответ — пустой список дней', () => {
    expect(examDays([])).toEqual([]);
  });
});

describe('examGroups', () => {
  it('раскладывает поток на коды и отсеивает повторы без учёта регистра', () => {
    const groups = examGroups([
      {
        teacherId: 1,
        teacherName: 'Абрамов',
        exams: [
          makeExam({ id: 1, group: 'ИДБ-21-10, ИДБ-21-9' }),
          makeExam({ id: 2, group: 'идб-21-10' }),
          makeExam({ id: 3, group: 'ИДМ-25-01,' }),
        ],
      },
    ]);

    // Естественный порядок: 9 раньше 10; пустой хвост после запятой — не группа.
    expect(groups).toEqual(['ИДБ-21-9', 'ИДБ-21-10', 'ИДМ-25-01']);
  });
});

describe('форматирование экзамена', () => {
  it('время — ЧЧ:ММ, даже если пришли секунды', () => {
    expect(formatExamTimeRange({ timeStart: '08:30', timeEnd: '14:00' })).toBe('08:30–14:00');
    expect(formatExamTimeRange({ timeStart: '16:00:00', timeEnd: '21:10:00' })).toBe('16:00–21:10');
  });

  it('день — с днём недели с заглавной и годом', () => {
    expect(formatExamDay(calendarDay(2025, 5, 15))).toBe('Четверг, 15 мая 2025 г.');
  });

  it('консультация того же года — без года, другого — с годом', () => {
    expect(
      formatConsultation({ date: '2025-05-14', time: '16:00', cabinet: '308' }, '2025-05-15'),
    ).toBe('14 мая, 16:00, ауд. 308');
    expect(
      formatConsultation({ date: '2024-12-28', time: '12:20', cabinet: '209' }, '2025-01-09'),
    ).toBe('28 декабря 2024 г., 12:20, ауд. 209');
  });
});
