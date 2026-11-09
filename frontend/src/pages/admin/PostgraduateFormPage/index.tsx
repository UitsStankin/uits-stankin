import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import { PostgraduateForm, usePostgraduateForm } from '@features/manage-postgraduates';
import { ADMIN_POSTGRADUATES_ROUTE } from '@shared/config/routes';
import type { PostgraduateDetails } from '@shared/types';
import Loader from '@shared/ui/Loader';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { usePostgraduateFormPage } from './model/usePostgraduateFormPage';

/**
 * Форма записи аспирантуры — своей страницей, а не окном-панелью
 * (разбор у `adminPostgraduateRoute`).
 *
 * Ссылка «к списку» ведёт на первую страницу раздела, а не «назад»
 * по истории: на форму попадают и по присланному адресу, и после
 * перезагрузки.
 */
export default function PostgraduateFormPage() {
  const {
    isNew,
    postgraduate,
    isLoading,
    isOffline,
    isNotFound,
    isError,
    errorMessage,
    refetch,
    goToList,
  } = usePostgraduateFormPage();

  return (
    <div className="flex flex-col gap-gutter-sm">
      <Link
        to={ADMIN_POSTGRADUATES_ROUTE}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />К списку аспирантов
      </Link>

      <h1 className="text-h4 text-text-heading">
        {isNew ? 'Новая запись аспирантуры' : 'Правка записи аспирантуры'}
      </h1>

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
          title="Запись не найдена"
          description="Возможно, её удалили, а ссылка осталась."
          action={<ActionLink to={ADMIN_POSTGRADUATES_ROUTE}>К списку аспирантов</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить запись"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {/*
        Ключ — номер записи: переход с одной записи на другую по адресу
        не размонтирует страницу, а начальные значения формы берутся при
        монтировании. Без ключа форма показала бы поля прошлой записи
        и сохранила бы их в новую (то же, что чинили в F-46).
      */}
      {(isNew || postgraduate) && (
        <PostgraduateEditor
          key={postgraduate?.id ?? 'new'}
          postgraduate={postgraduate}
          onDone={goToList}
        />
      )}
    </div>
  );
}

/**
 * Обёртка ради правила хуков: `usePostgraduateForm` берёт запись
 * начальными значениями, а хук нельзя позвать условно. Монтируется, когда
 * запись уже на руках, — с размонтированием умирают и начальные значения,
 * и брошенные правки.
 */
function PostgraduateEditor({
  postgraduate,
  onDone,
}: {
  postgraduate: PostgraduateDetails | null;
  onDone: () => void;
}) {
  const form = usePostgraduateForm(postgraduate, onDone);

  return (
    <section className="max-w-2xl rounded bg-white p-6 shadow-sm">
      <PostgraduateForm
        register={form.register}
        control={form.control}
        onSubmit={form.onSubmit}
        onCancel={onDone}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        teachers={form.teachers}
        isLoadingTeachers={form.isLoadingTeachers}
        hasTeachersFailed={form.hasTeachersFailed}
        submitLabel={postgraduate ? 'Сохранить' : 'Создать'}
      />
    </section>
  );
}
