import EditableSection from '@widgets/EditableSection';
import type { EditablePageSlug } from '@shared/types';

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
 * (`app/routes/index.tsx`).
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/pages/{slug}` открыта всем.
 *
 * Содержимое и все его состояния — в `widgets/EditableSection`: с F-32
 * тот же раздел встал колонкой на страницу контактов, и разбор состояний
 * переехал туда, где им могут пользоваться оба. Странице осталось
 * назвать раздел и дать ему слаг.
 */
export default function EditablePagePage({ slug, heading }: EditablePagePageProps) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">{heading}</h1>

      <EditableSection slug={slug} />
    </div>
  );
}
