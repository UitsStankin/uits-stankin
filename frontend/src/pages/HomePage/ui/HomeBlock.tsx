import Markdown from '@shared/ui/Markdown';

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
 */
export function HomeBlock({ text }: HomeBlockProps) {
  if (text === null) return null;

  return (
    <section className="u-wrap u-block">
      <div className="u-prose-block">
        <Markdown text={text} />
      </div>
    </section>
  );
}
