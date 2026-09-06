interface ScrollProgressProps {
  /** Доля прочитанного, 0–100. Считает модель, здесь только рисуется. */
  percent: number;
}

/**
 * Полоса прочитанного вдоль верхнего края — она была и в оригинале.
 *
 * Висит **под шапкой**, а не поверх неё, как там. Шапка портала липкая
 * (`sticky top-0` в `widgets/Header`), и полоса на `top-0` перечеркнула бы
 * логотип; `top-header` — ровно нижняя граница шапки, потому что её высота
 * задана тем же токеном.
 *
 * `aria-hidden`: для читающего с экрана это пересказ полосы прокрутки,
 * которая у него и так есть. Позиция чтения у него своя и с прокруткой
 * страницы не связана — объявлять ему проценты незачем.
 */
export function ScrollProgress({ percent }: ScrollProgressProps) {
  return (
    <div
      aria-hidden
      className="fixed left-0 top-header z-fixed h-1 bg-gradient-to-r from-primary to-cyan transition-[width] duration-150 ease-out"
      style={{ width: `${percent}%` }}
    />
  );
}
