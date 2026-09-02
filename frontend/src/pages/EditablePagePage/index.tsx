import Markdown from '@shared/ui/Markdown';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';
import type { EditablePageSlug } from '@shared/types';

import { useEditablePageContent } from './model/useEditablePageContent';
import { EditablePageSkeleton } from './ui/EditablePageSkeleton';

interface EditablePagePageProps {
  slug: EditablePageSlug;
  /**
   * Заголовок страницы. Именно проп, а не `title` из ответа: контракт
   * называет то поле подписью раздела для списка в админ-панели и прямо
   * запрещает рисовать его над текстом — заголовок публичной страницы
   * рисовал фронт и в старом портале (docs/API.md, «Редактируемые
   * страницы»). К тому же в перенесённых строках `title` бывает `null`.
   */
  heading: string;
}

/**
 * Редактируемый раздел — страница, всё содержимое которой лежит Markdown'ом
 * в базе и правится модератором: направления подготовки, нормативные
 * документы, учебные планы, защита ВКР, практики.
 *
 * Одна страница на девять адресов: разделы отличаются только слагом
 * и заголовком, оба приходят пропами из таблицы роутов
 * (`app/routes/index.tsx`). Сборка: состояние из модели, разметка
 * из чистых компонентов.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/pages/{slug}` открыта всем.
 *
 * `text` — исходник Markdown, поэтому показывается через
 * `shared/ui/Markdown` (`react-markdown` без `rehype-raw`) — вместе
 * с закрытыми там ловушками: сырой HTML выводится текстом, широкая таблица
 * прокручивается внутри себя, внутренние ссылки уходят в роутер.
 * `dangerouslySetInnerHTML`, которым показан `content` новости,
 * здесь неприменим: тот HTML бэкенд санитизирует, этот Markdown — нет.
 */
export default function EditablePagePage({ slug, heading }: EditablePagePageProps) {
  const { text, isLoading, isOffline, isError, errorMessage, isEmpty, refetch } =
    useEditablePageContent(slug);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">{heading}</h1>

      {isLoading && <EditablePageSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {/* Сюда попадает и `404` от не доехавшей миграции: для посетителя это
          тот же сбой сервера, отдельной страницы «не найдено» у разделов
          нет намеренно (`model/useEditablePageContent.ts`). */}
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
    </div>
  );
}
