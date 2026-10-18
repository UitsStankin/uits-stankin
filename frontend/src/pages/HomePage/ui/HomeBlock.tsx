import { lazy, Suspense } from 'react';

const Markdown = lazy(() => import('@shared/ui/Markdown'));

interface HomeBlockProps {
  /** Готовый Markdown или `null` — тогда блока не будет вовсе. */
  text: string | null;
}

/**
 * Редактируемый блок главной — `home-before` или `home-after`.
 *
 * Чистый: получает готовый текст и рисует его. Решение «рисовать или нет»
 * принято в модели, здесь только исполняется.
 *
 * Пустой блок не рисуется **вовсе** — ни карточки, ни отступа: пустой
 * прямоугольник с надписью «раздел пока не заполнен» сообщал бы посетителю
 * о внутренней кухне портала то, что ему знать незачем.
 *
 * Разборщик Markdown грузится отдельным куском и только когда в блоке есть
 * текст: на чистой базе главная обходится без него.
 */
export function HomeBlock({ text }: HomeBlockProps) {
  if (text === null) return null;

  return (
    <section className="u-wrap u-block">
      <div className="u-prose-block">
        <Suspense fallback={null}>
          <Markdown text={text} />
        </Suspense>
      </div>
    </section>
  );
}
