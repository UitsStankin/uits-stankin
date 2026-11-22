import EditLink from '@shared/ui/EditLink';
import Markdown from '@shared/ui/Markdown';

import type { HomeBlockState } from '../model/useHomeContent';

interface HomeBlockProps {
  block: HomeBlockState;
  /** Как назвать блок модератору, когда он пуст: «Блок над лентой». */
  name: string;
  /** Куда форме блока вернуться после сохранения. */
  returnTo: string;
}

/**
 * Редактируемый блок главной — `home-before` или `home-after`.
 *
 * Чистый: получает разобранное состояние и рисует его. Решение «рисовать
 * или нет» принято в модели, здесь только исполняется.
 *
 * Пустой блок посетителю не рисуется **вовсе** — ни карточки, ни отступа.
 * Белый прямоугольник с надписью «раздел пока не заполнен» на главной
 * сообщал бы посетителю о внутренней кухне портала то, что ему знать
 * незачем; у страницы, в отличие от раздела из F-23, собственного адреса
 * у блока нет, и пустое место здесь честнее подписи.
 *
 * **Модератору** пустой блок показан пунктирной рамкой со ссылкой
 * «Заполнить» (F-52): иначе на чистой базе, где пусты оба блока, с главной
 * было бы нечем попасть в их правку, а само существование блоков — неочевидно.
 * Рамка, а не белая карточка: она не притворяется содержимым и не выглядит
 * так, как увидит её посетитель.
 *
 * Карточка та же, что у статьи новости (`bg-white`, `shadow-sm`, те же
 * отступы): фон портала серый, и текст, положенный прямо на него,
 * выглядел бы потерянным куском вёрстки.
 */
export function HomeBlock({ block, name, returnTo }: HomeBlockProps) {
  const { text, isEmpty, editHref } = block;

  if (text !== null) {
    return (
      <>
        {/* Строкой над карточкой — так же, как у редактируемого раздела
            (`widgets/EditableSection`). */}
        {editHref && (
          <div className="flex justify-end">
            <EditLink to={editHref} returnTo={returnTo}>
              Править блок
            </EditLink>
          </div>
        )}

        <section className="rounded bg-white p-6 shadow-sm md:p-8">
          <Markdown text={text} />
        </section>
      </>
    );
  }

  if (isEmpty && editHref) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded border border-dashed border-gray-300 px-6 py-4 text-base text-text-muted">
        <p>{name} не заполнен — посетители его не видят.</p>

        <EditLink to={editHref} returnTo={returnTo}>
          Заполнить
        </EditLink>
      </section>
    );
  }

  return null;
}
