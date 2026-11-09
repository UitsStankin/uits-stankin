import { Link } from 'react-router';

import { teacherRoute } from '@shared/config/routes';
import { cn } from '@shared/lib';
import type { Postgraduate } from '@shared/types';

interface PostgraduateTableProps {
  postgraduates: readonly Postgraduate[];
  /**
   * Номер первой строки страницы. Счёт сквозной по списку: на второй
   * странице колонка «№» продолжается с двадцать первого.
   */
  firstRowNumber: number;
  /** Едет следующая страница: таблица притушена. */
  isSwitching?: boolean;
}

/**
 * Таблица аспирантов. Чистая: получает готовую страницу записей.
 *
 * Колонки и их порядок — из оригинала (`postgraduate-info.component.ts`):
 * номер, аспирант, тема, специальность, год поступления, руководитель.
 * Таблица здесь уместнее сетки карточек, которой показаны ППС и УВП:
 * значения короткие и однотипные, и читают их **сравнивая по колонке** —
 * кто у какого руководителя, кто с какого года.
 *
 * ### Что не перенесено из оригинала
 *
 * `ngx-datatable` — вместе со всей библиотекой. Из её возможностей
 * страница пользовалась одной, шаблоном колонки с номером; сортировку
 * по клику она там же и отключала (`sortable: false` у номера, а порядок
 * остальных задавал бэкенд). Обычная `<table>` даёт то же самое, читается
 * диктором как таблица без единой ARIA-подпорки и не тянет в бандл
 * компонент с виртуализацией ради двадцати строк.
 *
 * ### Разметка
 *
 * Имя аспиранта — `<th scope="row">`, а не ячейка: в строке это то, чему
 * принадлежат остальные значения, и диктор проговаривает его при переходе
 * между ячейками, вместо «столбец три, значение». Номер остаётся `<td>`
 * именно поэтому — заголовком строки он был бы формально верен и бесполезен.
 */
export function PostgraduateTable({
  postgraduates,
  firstRowNumber,
  isSwitching = false,
}: PostgraduateTableProps) {
  return (
    <div className="rounded bg-white p-4 shadow-sm md:p-6">
      {/*
        Прокрутка внутри карточки, а не сжатие колонок, — то же решение,
        что у таблиц в тексте разделов (`shared/ui/Markdown`): шесть колонок
        на телефоне либо едут вбок внутри себя, либо распирают документ
        целиком, унося вместе с собой шапку, меню и подвал.

        `tabIndex` и `role` — не украшение: прокручиваемую область,
        до которой нельзя добраться с клавиатуры, увидит только тот, у кого
        есть мышь или тачскрин. Фокусируемой её делает `tabIndex`, а имя
        и роль нужны, чтобы диктор объявил, куда попал фокус, — иначе
        он читает «группа» без единого слова о том, что это.
      */}
      <div
        role="region"
        aria-label="Аспиранты кафедры"
        tabIndex={0}
        className="overflow-x-auto"
      >
        <table
          // min-w держит колонки читаемыми: без него браузер сжимает
          // тему диссертации до столбика по слову на строку.
          className={cn(
            'w-full min-w-[56rem] text-base transition-opacity',
            isSwitching && 'opacity-50',
          )}
          // Диктору сообщается, что таблица обновляется, иначе он прочитает
          // строки прошлой страницы как актуальные.
          aria-busy={isSwitching}
        >
          <thead>
            <tr className="border-b border-default text-left align-bottom text-text-heading">
              <th scope="col" className="w-12 px-3 py-2.5 font-bold">
                №
              </th>
              <th scope="col" className="w-56 px-3 py-2.5 font-bold">
                Аспирант
              </th>
              <th scope="col" className="px-3 py-2.5 font-bold">
                Тема диссертации
              </th>
              <th scope="col" className="w-28 px-3 py-2.5 font-bold">
                Специальность
              </th>
              <th scope="col" className="w-32 px-3 py-2.5 font-bold">
                Год поступления
              </th>
              <th scope="col" className="w-56 px-3 py-2.5 font-bold">
                Руководитель
              </th>
            </tr>
          </thead>

          <tbody>
            {postgraduates.map((postgraduate, index) => (
              <tr
                key={postgraduate.id}
                className="border-b border-default align-top last:border-b-0"
              >
                {/* tabular-nums: без него номера разной ширины, и колонка
                    рябит при перелистывании. */}
                <td className="px-3 py-3 tabular-nums text-text-muted">
                  {firstRowNumber + index}
                </td>

                <th scope="row" className="px-3 py-3 text-left font-medium text-text-heading">
                  {postgraduate.studentName}
                </th>

                <td className="px-3 py-3">
                  <EmptyAware value={postgraduate.diplomaTheme} fallback="не указана" />
                </td>

                <td className="px-3 py-3 tabular-nums">
                  <EmptyAware value={postgraduate.speciality} fallback="не указана" />
                </td>

                <td className="px-3 py-3 tabular-nums">{postgraduate.admissionYear}</td>

                <td className="px-3 py-3">
                  <Supervisor
                    teacherId={postgraduate.teacherId}
                    teacherName={postgraduate.teacherName}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Незаполненное поле — словами, а не прочерком.
 *
 * Специальность и тема в базе необязательны, и пустыми они приезжают
 * не в одном экзотическом случае, а у каждого первокурсника, тему которого
 * ещё не утвердили. Прочерк на этом месте диктор читает как «тире» либо
 * молчит вовсе, и строка звучит так, будто ячейку забыли.
 */
function EmptyAware({ value, fallback }: { value: string | null; fallback: string }) {
  if (value === null) return <span className="text-text-muted">{fallback}</span>;

  return <>{value}</>;
}

/**
 * Научный руководитель — ссылкой на его карточку ППС.
 *
 * Ссылки в оригинале не было, и не потому, что её не хотели: старый ответ
 * нёс одно `full_name` вложенным объектом, вести по имени было некуда.
 * Новый контракт отдаёт `teacherId` — тот же идентификатор, по которому
 * открывается публичная карточка, — и не связать две страницы портала,
 * зная это, значило бы потерять готовое.
 *
 * «Не назначен» — формулировка самого контракта: `teacherId` и `teacherName`
 * приходят `null` **оба сразу**, и подпись рисует интерфейс (docs/API.md,
 * «Аспирантура»). Случай не редкий: удаление карточки ППС обнуляет
 * руководителя у всех его аспирантов, а не удаляет записи.
 */
function Supervisor({
  teacherId,
  teacherName,
}: {
  teacherId: number | null;
  teacherName: string | null;
}) {
  if (teacherId === null || teacherName === null) {
    return <span className="text-text-muted">не назначен</span>;
  }

  return (
    <Link to={teacherRoute(teacherId)} className="text-primary hover:underline">
      {teacherName}
    </Link>
  );
}
