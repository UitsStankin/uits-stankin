import { pluralize } from '@shared/lib';

/**
 * Стаж словами: «15 лет», «1 год», «22 года». `null` остаётся `null` —
 * прочерк на месте незаполненного поля рисует карточка, одинаково
 * для всех своих полей.
 */
export function formatYears(years: number | null): string | null {
  if (years === null) return null;
  return `${years} ${pluralize(years, ['год', 'года', 'лет'])}`;
}
