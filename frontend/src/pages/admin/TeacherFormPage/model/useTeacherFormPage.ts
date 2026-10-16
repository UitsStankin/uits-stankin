import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { teacherQuery } from '@entities/teacher';
import { isApiError } from '@shared/api';
import { ADMIN_TEACHERS_ROUTE } from '@shared/config/routes';
import { parseId } from '@shared/lib';

/**
 * Форма карточки ППС: разбор адреса, догрузка карточки, дорога назад.
 *
 * Два адреса ведут сюда — `/admin/teachers/new` и `/admin/teachers/{id}`.
 * У первого параметра нет вовсе, и это единственный признак «новая»:
 * отдельным словом в `:id` (`'new'`) он был бы неотличим от опечатки
 * в адресе, а опечатка обязана показать «карточка не найдена», а не
 * пустую форму создания.
 *
 * Карточка догружается **детальной** ручкой, даже если модератор пришёл
 * из списка: списочная отдаёт короткую проекцию — без контактов, стажей,
 * дисциплин, ключа фото и связи с учётной записью. Подсадить её в форму
 * значило бы открыть форму с пустыми полями, которые через мгновение
 * заполнятся, — а модератор к этому моменту успел бы начать печатать.
 *
 * Ручка публичная: своей у модератора в контракте нет, а карточка одна
 * и та же.
 */
export function useTeacherFormPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /** Адреса `new` у параметра нет: `undefined` — это «заводим новую». */
  const isNew = rawId === undefined;
  const id = parseId(rawId);

  const query = useQuery({
    ...teacherQuery(id ?? 0),
    // Битый идентификатор в запрос не уходит: на «abc» бэкенд ответил бы
    // `400`, и человек увидел бы «ошибка сервера» вместо «нет такой
    // карточки». Ключ всё равно нужен — хуки не бывают условными.
    enabled: !isNew && id !== null,
  });

  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    isNew,
    /** Загруженная карточка; `null` — новая либо ещё не доехала. */
    card: query.data ?? null,

    isLoading: !isNew && id !== null && query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    /**
     * Карточки нет. Сюда же попадает нечисловой `id` в адресе: для
     * человека это та же самая несуществующая карточка.
     */
    isNotFound: !isNew && (id === null || isNotFound),
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /**
     * Куда уходить после сохранения и по «Отмене» — к списку, а не
     * `history.back()`: на форму попадают и по присланному адресу,
     * и после перезагрузки, и «назад» увёл бы тогда неизвестно куда.
     */
    goToList: () => void navigate(ADMIN_TEACHERS_ROUTE),
  };
}
