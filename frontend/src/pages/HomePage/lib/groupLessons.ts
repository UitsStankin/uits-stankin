import type { FoundLesson } from '@entities/schedule';

export function groupByDiscipline(lessons: readonly FoundLesson[]): FoundLesson[][] {
  const groups = new Map<string, FoundLesson[]>();

  for (const lesson of lessons) {
    const key = [lesson.name, lesson.type, lesson.group, lesson.byTeacher ? '' : lesson.teacher].join('|');
    groups.set(key, [...(groups.get(key) ?? []), lesson]);
  }

  return Array.from(groups.values());
}
