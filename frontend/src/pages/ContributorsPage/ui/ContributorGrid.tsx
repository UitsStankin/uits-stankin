import type { Contributor } from '../lib/contributors';
import { ContributorCard } from './ContributorCard';

interface ContributorGridProps {
  contributors: readonly Contributor[];
}

/**
 * Сетка карточек. Чистая: получает готовый список.
 *
 * **Сетка вместо карусели оригинала.** Там шестнадцать человек лежали
 * в горизонтальной ленте с прокруткой, между двумя кнопками `<` и `>`,
 * и на экран попадало пятеро — при том, что кроме списка на странице
 * ничего нет и место под него свободно всё. Прокрутка была ещё
 * и недоступной: кнопки назывались `<` и `>` буквально, диктор так их
 * и читал, а с клавиатуры ленту было не сдвинуть — фокусироваться внутри
 * не на чем.
 *
 * Собственная анимация прокрутки (`requestAnimationFrame` c `easeOutExpo`
 * на 800 мс) не перенесена вместе с кнопками — и без них она была лишней:
 * у той же ленты стояло `scroll-behavior: smooth`, то есть плавностей
 * было две и они спорили. `scroll-snap-type: x mandatory` там же
 * не работал вовсе — `scroll-snap-align` не задан ни одной карточке.
 *
 * `ul`, а не `ol`: порядок в списке есть — руководитель первым, дальше
 * по ролям, — но он не смысловой, как годы у истории, и обещать
 * читателю нумерацию незачем.
 */
export function ContributorGrid({ contributors }: ContributorGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {contributors.map((contributor) => (
        <li key={contributor.name}>
          <ContributorCard contributor={contributor} />
        </li>
      ))}
    </ul>
  );
}
