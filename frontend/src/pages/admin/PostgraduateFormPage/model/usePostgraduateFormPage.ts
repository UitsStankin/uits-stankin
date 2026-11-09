import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { postgraduateQuery } from '@entities/postgraduate';
import { isApiError } from '@shared/api';
import { ADMIN_POSTGRADUATES_ROUTE } from '@shared/config/routes';
import { parseId } from '@shared/lib';

/**
 * Форма записи аспирантуры: разбор адреса, догрузка записи, дорога назад.
 *
 * Два адреса ведут сюда — `/admin/postgraduates/new` и
 * `/admin/postgraduates/{id}`; «новая» — это отсутствие параметра,
 * а не слово в нём (разбор у `useTeacherFormPage`).
 *
 * ### Форма ждёт свежего ответа, а не кэша
 *
 * Отличие от формы карточки ППС, и причина — в `PUT`. Правка — полная
 * замена записи вместе со студентом, и форма, открытая на вчерашних
 * значениях из кэша, при сохранении молча вернула бы всё, что поменяли
 * с тех пор в другой вкладке или другой модератор. Поэтому запись
 * показывается только после ответа, полученного **уже на этой странице**
 * (`isFetchedAfterMount`): кэш, оставшийся от прошлого открытия, форма
 * в начальные значения не берёт.
 *
 * Фоновое обновление после этого форму не трогает: начальные значения
 * берутся один раз, при монтировании редактора, и набранное не пропадёт
 * оттого, что вкладка вернулась из фона.
 */
export function usePostgraduateFormPage() {
  const { id: rawId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /** Адреса `new` у параметра нет: `undefined` — это «заводим новую». */
  const isNew = rawId === undefined;
  const id = parseId(rawId);
  const canFetch = !isNew && id !== null;

  const query = useQuery({
    ...postgraduateQuery(id ?? 0),
    // Битый идентификатор в запрос не уходит — разбор у формы ППС.
    enabled: canFetch,
    // Кэш прошлого открытия — не ответ: см. разбор выше.
    refetchOnMount: 'always',
  });

  const fresh = query.isFetchedAfterMount && !query.isError ? (query.data ?? null) : null;
  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    isNew,
    /** Запись, годная в начальные значения; `null` — новая либо свежий ответ не пришёл. */
    postgraduate: fresh,

    isLoading: canFetch && fresh === null && query.isFetching,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: canFetch && fresh === null && query.isPaused,
    /**
     * Записи нет. Сюда же попадает нечисловой `id` в адресе: для
     * человека это та же самая несуществующая запись.
     */
    isNotFound: !isNew && (id === null || isNotFound),
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** К списку, а не `history.back()` — разбор у формы ППС. */
    goToList: () => void navigate(ADMIN_POSTGRADUATES_ROUTE),
  };
}
