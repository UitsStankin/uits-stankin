import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

import {
  AccountField,
  SubjectsField,
  TeacherCardForm,
  useTeacherAdminForm,
} from '@features/manage-teachers';
import { ADMIN_TEACHERS_ROUTE } from '@shared/config/routes';
import type { Teacher } from '@shared/types';
import Loader from '@shared/ui/Loader';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useTeacherFormPage } from './model/useTeacherFormPage';

/**
 * Форма карточки ППС у модератора — своей страницей, а не окном-панелью.
 *
 * Причина в данных: списочная ручка отдаёт короткую карточку, и форме
 * всё равно нужен свой запрос. У запроса, который может не дойти, должен
 * быть адрес — перезагрузка возвращает на ту же карточку, а не на пустой
 * список; разбор в `shared/config/routes.ts`, у `adminTeacherRoute`.
 *
 * Ссылка «к списку» ведёт на первую страницу раздела, а не «назад»
 * по истории: на форму попадают и по присланному адресу, и после
 * перезагрузки.
 */
export default function TeacherFormPage() {
  const { isNew, card, isLoading, isOffline, isNotFound, isError, errorMessage, refetch, goToList } =
    useTeacherFormPage();

  return (
    <div className="flex flex-col gap-gutter-sm">
      <Link
        to={ADMIN_TEACHERS_ROUTE}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />К списку преподавателей
      </Link>

      <h1 className="text-h4 text-text-heading">
        {isNew ? 'Новая карточка преподавателя' : 'Правка карточки преподавателя'}
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
          title="Карточка не найдена"
          description="Возможно, её удалили, а ссылка осталась."
          action={<ActionLink to={ADMIN_TEACHERS_ROUTE}>К списку преподавателей</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить карточку"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {(isNew || card) && <TeacherEditor card={card} onDone={goToList} />}
    </div>
  );
}

/**
 * Обёртка ради правила хуков: `useTeacherAdminForm` берёт карточку
 * начальными значениями, а хук нельзя позвать условно. Монтируется, когда
 * карточка уже на руках, — с размонтированием умирают и начальные
 * значения, и брошенные правки.
 */
function TeacherEditor({ card, onDone }: { card: Teacher | null; onDone: () => void }) {
  const form = useTeacherAdminForm(card, onDone);

  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <TeacherCardForm
        register={form.register}
        control={form.control}
        onSubmit={form.onSubmit}
        onCancel={onDone}
        fieldErrors={form.fieldErrors}
        formError={form.formError}
        isPending={form.isPending}
        avatarPreviewUrl={form.avatarPreviewUrl}
        avatarError={form.avatarError}
        isUploadingAvatar={form.isUploadingAvatar}
        onAvatarSelect={form.onAvatarSelect}
        onAvatarRemove={form.onAvatarRemove}
        submitLabel={card ? 'Сохранить' : 'Создать'}
        // Картинки в «Образовании» и «Повышении квалификации» — раздел
        // `staff`; в кабинете этого пропса нет, потому что преподавателю
        // раздел закрыт (docs/API.md, «Загрузка файлов»).
        imageCategory="staff"
        beforeActions={
          <>
            <SubjectsField
              subjects={form.subjects}
              value={form.subjectIds}
              onToggle={form.onSubjectToggle}
              isLoading={form.isLoadingSubjects}
              error={form.subjectsError}
            />

            <AccountField
              accounts={form.accounts}
              value={form.userId}
              onChange={form.onUserIdChange}
              isLoading={form.isLoadingAccounts}
              error={form.accountsError}
              hasFailed={form.hasAccountsFailed}
            />
          </>
        }
      />
    </section>
  );
}
