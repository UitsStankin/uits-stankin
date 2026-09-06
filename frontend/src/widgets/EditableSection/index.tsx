import Markdown from '@shared/ui/Markdown';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';
import type { EditablePageSlug } from '@shared/types';

import { useEditableSection } from './model/useEditableSection';
import { EditableSectionSkeleton } from './ui/EditableSectionSkeleton';

interface EditableSectionProps {
  slug: EditablePageSlug;
}

/**
 * Редактируемый раздел — карточка, содержимое которой лежит Markdown'ом
 * в базе и правится модератором, вместе со всеми своими состояниями:
 * загрузка, потеря связи, сбой, незаполненный раздел.
 *
 * ### Почему виджет, а не кусок страницы
 *
 * До F-32 это жило внутри `pages/EditablePagePage` и было верно: раздел был
 * всем содержимым той страницы, а девять её адресов отличались только
 * слагом. У контактов раздел — уже не вся страница, а колонка рядом
 * с картой, и та же четвёрка состояний понадобилась второй раз;
 * с аспирантурой (F-34) — понадобится третий. Слой `pages` не импортирует
 * из `pages`, так что выбор был между копией разбора состояний в каждой
 * странице и общим виджетом.
 *
 * Правило «абстракция на два места дороже дубля» (`useHomeContent`) здесь
 * не спорит: мест три, они уже названы в бэклоге, и расходиться им нельзя —
 * незаполненный раздел обязан объясняться одними словами везде, иначе
 * посетитель читает про один и тот же портал разное.
 *
 * ### Что осталось снаружи
 *
 * Заголовок. У страниц F-23 он свой на каждый адрес, у контактов —
 * заголовок всей страницы, а не колонки. Виджет рисует содержимое,
 * называет раздел вызывающий.
 *
 * Фрагмент, а не обёртка: состояния встают прямыми детьми в колонку
 * вызывающего и получают её `gap`. Лишний `div` между ними ломал бы
 * и отступы, и `flex` пропорции.
 *
 * `text` — исходник Markdown, поэтому показывается через
 * `shared/ui/Markdown` (`react-markdown` без `rehype-raw`) — вместе
 * с закрытыми там ловушками: сырой HTML выводится текстом, широкая таблица
 * прокручивается внутри себя, внутренние ссылки уходят в роутер.
 * `dangerouslySetInnerHTML`, которым показан `content` новости,
 * здесь неприменим: тот HTML бэкенд санитизирует, этот Markdown — нет.
 */
export default function EditableSection({ slug }: EditableSectionProps) {
  const { text, isLoading, isOffline, isError, errorMessage, isEmpty, refetch } =
    useEditableSection(slug);

  return (
    <>
      {isLoading && <EditableSectionSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {/* Сюда попадает и `404` от не доехавшей миграции: для посетителя это
          тот же сбой сервера, отдельной страницы «не найдено» у разделов
          нет намеренно (`model/useEditableSection.ts`). */}
      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить раздел"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isEmpty && (
        <StatusBlock
          title="Раздел пока не заполнен"
          description="Содержимое появится здесь, как только его добавят."
        />
      )}

      {text !== null && (
        <section className="rounded bg-white p-6 shadow-sm md:p-8">
          <Markdown text={text} />
        </section>
      )}
    </>
  );
}
