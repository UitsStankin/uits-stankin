import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import { EditablePageForm, useEditablePageForm } from '@features/manage-editable-pages';
import { ADMIN_PAGES_ROUTE } from '@shared/config/routes';
import type { EditablePage } from '@shared/types';
import Loader from '@shared/ui/Loader';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useEditablePageFormPage } from './model/useEditablePageFormPage';

/**
 * Правка редактируемого раздела — своей страницей, а не окном-панелью:
 * разбор в `shared/config/routes.ts`, у `adminEditablePageRoute`.
 *
 * Ссылка «к списку» ведёт на список, а не «назад» по истории: на форму
 * попадают и по присланному адресу, и после перезагрузки.
 */
export default function EditablePageFormPage() {
  const { section, isLoading, isOffline, isNotFound, isError, errorMessage, refetch, goToList } =
    useEditablePageFormPage();

  return (
    <div className="flex flex-col gap-gutter-sm">
      <Link
        to={ADMIN_PAGES_ROUTE}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />К списку разделов
      </Link>

      <h1 className="text-h4 text-text-heading">Правка раздела</h1>

      {isLoading && <Loader />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isNotFound && (
        <StatusBlock
          title="Такого раздела нет"
          description="Набор разделов постоянный, и раздела с таким адресом в нём нет. Если адрес верный, на стенде не прошла миграция разделов."
          action={<ActionLink to={ADMIN_PAGES_ROUTE}>К списку разделов</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить раздел"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {section && <SectionEditor section={section} onDone={goToList} />}
    </div>
  );
}

/**
 * Обёртка ради правила хуков: `useEditablePageForm` берёт раздел начальными
 * значениями, а хук нельзя позвать условно. Монтируется, когда раздел уже
 * на руках, — с размонтированием умирают и начальные значения, и брошенные
 * правки.
 */
function SectionEditor({ section, onDone }: { section: EditablePage; onDone: () => void }) {
  const form = useEditablePageForm(section, onDone);

  return (
    <>
      <div className="flex max-w-prose flex-col gap-2 text-base text-text-muted">
        <p>
          <span className="font-bold text-text-heading">{section.title ?? 'Без подписи'}</span>
          {' · '}
          <code className="font-mono text-sm">{section.slug}</code>
        </p>

        {/* Обе оговорки — про то, чего от формы не ждут: подпись здесь
            не заголовок страницы (docs/API.md), а пустой текст не прячет
            раздел, а объявляет его незаполненным. */}
        <p>
          Подпись видна только в списке разделов: заголовок страницы на сайте задаёт меню. Пустой
          текст на сайте показывается надписью «Раздел пока не заполнен», а блоки главной в этом
          случае не показываются вовсе.
        </p>
      </div>

      {/* Ширина — как у страницы раздела на сайте (`max-w-4xl`): предпросмотр
          обязан переносить строки и таблицы там же, где их перенесёт сайт. */}
      <section className="w-full max-w-4xl rounded bg-white p-6 shadow-sm">
        <EditablePageForm
          register={form.register}
          control={form.control}
          onSubmit={form.onSubmit}
          onCancel={onDone}
          fieldErrors={form.fieldErrors}
          formError={form.formError}
          isPending={form.isPending}
        />
      </section>
    </>
  );
}
