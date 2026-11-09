import Markdown from '@shared/ui/Markdown';

import type { HistoryEvent } from '../lib/historyTimeline';

interface HistoryEventCardProps {
  event: HistoryEvent;
}

/**
 * Одно событие ленты. Чистая: всё приходит пропсом, состояния нет.
 *
 * Карточка та же, что у блоков главной и статьи новости (`bg-white`,
 * `rounded`, `shadow-sm`, те же отступы). В оригинале у неё были ещё
 * подъём на восемь пикселей при наведении и тень в 60 пикселей — эффект
 * для кликабельного элемента, а карточка никуда не ведёт: нажать на неё
 * можно, и ничего не произойдёт.
 *
 * Полоска слева осталась — она отделяет карточку от шкалы и повторена
 * цветом точки на ней.
 */
export function HistoryEventCard({ event }: HistoryEventCardProps) {
  const { period, title, icon: Icon, text, photo, highlights } = event;

  return (
    <article className="rounded border-l-4 border-primary bg-white p-5 shadow-sm md:p-8">
      <header className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-secondary text-primary">
          <Icon size={20} aria-hidden />
        </span>

        <div className="flex flex-col items-start gap-2">
          {/* Год — тот самый маркер, что в оригинале висел на шкале
              отдельной плашкой. Там он держался четырьмя медиазапросами
              с подобранными пикселями (`left: 225px`, `top: -80px`),
              и на планшете плашка наезжала на карточку. Внутри заголовка
              он не разъезжается вовсе. */}
          <p className="rounded-pill bg-primary px-3 py-0.5 text-sm font-bolder text-white">
            {period}
          </p>
          <h2 className="text-h5 text-text-heading md:text-h4">{title}</h2>
        </div>
      </header>

      {text && <Markdown text={text} className="mt-5" />}

      {photo && (
        // Размеры проставлены, чтобы место под снимок было занято до его
        // загрузки: без них лента дёргается, когда картинка доезжает.
        // `lazy` — обе фотографии лежат ниже сгиба.
        <img
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          loading="lazy"
          className="mt-5 h-auto w-full rounded"
        />
      )}

      {highlights && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className="rounded-pill bg-secondary px-3 py-1 text-sm font-medium text-text-heading"
            >
              {highlight}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
