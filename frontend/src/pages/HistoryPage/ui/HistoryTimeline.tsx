import type { HistoryEvent } from '../lib/historyTimeline';
import { HistoryEventCard } from './HistoryEventCard';

interface HistoryTimelineProps {
  events: readonly HistoryEvent[];
}

/**
 * Лента событий: шкала слева, карточки справа. Чистая.
 *
 * `ol`, а не `ul` и не набор `div`: порядок здесь — сама суть страницы,
 * события идут по годам, и списку с порядком это сообщает разметка,
 * а не только глаз.
 *
 * Шкала одна на всю ленту и лежит **под** карточками одним элементом,
 * а не собирается из левых границ: в оригинале она была такой же,
 * а вот точки на ней держались абсолютными отступами, своими на каждый
 * из четырёх брейкпоинтов (`left: 146px`, `left: 144px`, `top: -10px`).
 * Здесь и шкала, и точка стоят от одного края, и подгонять нечего.
 *
 * Обёртка вокруг `ol` нужна именно шкале: внутри списка ей места нет —
 * `ol` содержит только `li`, — а позиционировать её надо от того же
 * прямоугольника, что и точки.
 */
export function HistoryTimeline({ events }: HistoryTimelineProps) {
  return (
    <div className="relative">
      {/* Шкала. Цвет идёт сверху вниз от светлого к тёмному — как
          в оригинале: чем ниже, тем ближе к сегодняшнему дню. */}
      <span
        aria-hidden
        className="absolute bottom-0 left-2 top-0 w-1 rounded-pill bg-gradient-to-b from-gray-400 via-primary to-gray-900"
      />

      <ol className="flex flex-col gap-gutter">
        {events.map((event) => (
          <li key={event.id} className="relative pl-7 md:pl-10">
            {/* Точка события. Обводка цветом фона портала отделяет её
                от шкалы, на которой она стоит. */}
            <span
              aria-hidden
              className="absolute left-2.5 top-7 h-4 w-4 -translate-x-1/2 rounded-pill border-2 border-background-default bg-primary"
            />

            <HistoryEventCard event={event} />
          </li>
        ))}
      </ol>
    </div>
  );
}
