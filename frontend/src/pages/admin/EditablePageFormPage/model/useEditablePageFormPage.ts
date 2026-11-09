import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { editablePageQuery, parseEditablePageSlug } from '@entities/editable-page';
import { isApiError } from '@shared/api';
import { ADMIN_PAGES_ROUTE } from '@shared/config/routes';

/**
 * Форма раздела: разбор адреса, чтение раздела, дорога назад.
 *
 * Раздел читается **публичной** ручкой (`GET /api/public/pages/{slug}`) —
 * той же, что у страницы на сайте. Модераторской ручки одного раздела
 * в контракте нет, скрытых разделов не бывает, а DTO тот же. Заодно форма
 * и сайт делят ключ кэша: открыть форму после страницы раздела можно
 * без ожидания.
 *
 * Слаг из адреса сверяется с закрытым набором до запроса: опечатка обязана
 * показать «раздела нет», а не уйти на сервер.
 */
export function useEditablePageFormPage() {
  const { slug: rawSlug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const slug = parseEditablePageSlug(rawSlug);

  const query = useQuery({
    // Ключ-заглушка нужен только потому, что хуки не бывают условными:
    // при негодном слаге запрос выключен.
    ...editablePageQuery(slug ?? 'contacts'),
    enabled: slug !== null,
  });

  const isNotFound = isApiError(query.error) && query.error.status === 404;

  return {
    /**
     * Загруженный раздел; `null` — ещё не доехал или адрес негодный.
     *
     * При негодном слаге — `null` даже с данными в кэше: ключ-заглушка
     * указывает на настоящий раздел, и открытые раньше «Контакты» иначе
     * подставились бы в форму по адресу с опечаткой.
     */
    section: slug === null ? null : (query.data ?? null),

    isLoading: slug !== null && query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && query.data === undefined,
    /**
     * Раздела нет. Сюда попадают и негодный слаг в адресе, и `404`
     * по настоящему слагу — второе значит, что на стенде не прошла
     * миграция, но для человека это тот же несуществующий раздел.
     */
    isNotFound: slug === null || isNotFound,
    isError: query.isError && !isNotFound,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /** После сохранения и по «Отмене» — к списку, а не `history.back()`. */
    goToList: () => void navigate(ADMIN_PAGES_ROUTE),
  };
}
