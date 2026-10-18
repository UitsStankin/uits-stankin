const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

/** День и месяц из календарной даты `ГГГГ-ММ-ДД` — без разбора через `Date`, чтобы не зависеть от пояса. */
export function dayAndMonth(isoDate: string | null): { day: number; month: string } | null {
  const match = isoDate === null ? null : /^\d{4}-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match === null) return null;

  const month = MONTHS_GENITIVE[Number(match[1]) - 1];
  return month === undefined ? null : { day: Number(match[2]), month };
}

/** Первые строки Markdown без служебных символов — для короткой подписи. */
export function plainText(markdown: string, maxLines = 3): string {
  return markdown
    .replace(/[#*_>`]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .join(' · ');
}
