/**
 * Словари степеней и званий ППС — подписи к кодам контракта T-26.
 *
 * Бэкенд отдаёт коды (`CANDIDATE_TECH`, `READER`), подписи рисует фронт —
 * тот же приём, что с `postType` у новостей. Живут в `shared`, а не в
 * сущности: заведены для формы личного кабинета (F-16), но те же подписи
 * нужны публичному списку и карточке ППС (F-21) — так записано в бэклоге.
 *
 * Порядок кодов — порядок таблицы docs/API.md, он же порядок в селектах
 * формы: пары «кандидат — доктор» по наукам, педагогические в конце.
 */

import type { TeacherDegree, TeacherRank } from '@shared/types';

export const DEGREE_CODES = [
  'CANDIDATE_TECH',
  'DOCTOR_TECH',
  'CANDIDATE_PHYS_MATH',
  'DOCTOR_PHYS_MATH',
  'CANDIDATE_ECONOM',
  'DOCTOR_ECONOM',
  'CANDIDATE_PED',
] as const satisfies readonly TeacherDegree[];

export const RANK_CODES = ['READER', 'PROFESSOR'] as const satisfies readonly TeacherRank[];

export const DEGREE_LABELS: Record<TeacherDegree, string> = {
  CANDIDATE_TECH: 'кандидат технических наук',
  DOCTOR_TECH: 'доктор технических наук',
  CANDIDATE_PHYS_MATH: 'кандидат физико-математических наук',
  DOCTOR_PHYS_MATH: 'доктор физико-математических наук',
  CANDIDATE_ECONOM: 'кандидат экономических наук',
  DOCTOR_ECONOM: 'доктор экономических наук',
  CANDIDATE_PED: 'кандидат педагогических наук',
};

export const RANK_LABELS: Record<TeacherRank, string> = {
  // Код неудачный, но исторический: в старой базе лежит именно `READER`,
  // и совпадение кодов позволило перенести колонку без преобразований.
  READER: 'доцент',
  PROFESSOR: 'профессор',
};

/**
 * Подпись степени. `null` остаётся `null` — чем заполнить пустое место,
 * решает карточка, и решает одинаково для всех своих полей.
 *
 * Незнакомый код возвращается как есть, а не подменяется ближайшим
 * осмысленным: словарь закрытый, но enum на бэкенде может вырасти раньше,
 * чем сюда доедет обновлённый тип. Сырой код на экране — заметный сигнал
 * дописать словарь; правдоподобная чужая подпись была бы враньём.
 */
export function degreeLabel(degree: TeacherDegree | null): string | null {
  if (degree === null) return null;
  return DEGREE_LABELS[degree] ?? degree;
}

/** Подпись звания — правила те же, что у степени. */
export function rankLabel(rank: TeacherRank | null): string | null {
  if (rank === null) return null;
  return RANK_LABELS[rank] ?? rank;
}
