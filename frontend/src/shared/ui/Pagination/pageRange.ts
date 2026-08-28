/** Слот пагинатора: либо номер страницы, либо многоточие вместо пропуска. */
export type PageSlot = number | 'gap';

/**
 * Какие номера показывать в пагинаторе.
 *
 * Вынесено из компонента отдельной чистой функцией: это единственное место
 * во всём пагинаторе, где есть что проверять, — на глаз ошибка вида
 * «на последней странице пропало три номера» не видна, а на функции
 * с номерами на входе и списком на выходе видна сразу.
 *
 * Ширина полосы постоянная — `2 * siblings + 5` слотов: первая, многоточие,
 * соседи вокруг текущей, многоточие, последняя. Постоянство важнее полноты:
 * прыгающая при перелистывании ширина утаскивает кнопки из-под курсора.
 *
 * Счёт **с единицы**, в отличие от `page` в контракте: это номера
 * для человека, а не параметр запроса. Пересчёт — один, в модели страницы.
 */
export function pageRange(current: number, total: number, siblings = 1): PageSlot[] {
  const maxSlots = siblings * 2 + 5;

  // Полоса помещается целиком — многоточия только запутали бы.
  if (total <= maxSlots) return range(1, total);

  const left = Math.max(current - siblings, 1);
  const right = Math.min(current + siblings, total);

  // Многоточие ставится, только когда оно прячет больше одной страницы:
  // иначе «1 … 3» занимает столько же места, сколько честное «1 2 3».
  const hasLeftGap = left > 2;
  const hasRightGap = right < total - 1;

  if (!hasLeftGap && hasRightGap) return [...range(1, maxSlots - 2), 'gap', total];
  if (hasLeftGap && !hasRightGap) return [1, 'gap', ...range(total - maxSlots + 3, total)];

  return [1, 'gap', ...range(left, right), 'gap', total];
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(to - from + 1, 0) }, (_, index) => from + index);
}
