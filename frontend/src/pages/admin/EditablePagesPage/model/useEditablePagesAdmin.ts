import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';

import { editablePagesListQuery } from '@entities/editable-page';
import { ADMIN_PAGES_ROUTE } from '@shared/config/routes';
import { PAGE_PARAM, pageHref, parsePage } from '@shared/lib';

/**
 * Список разделов сайта в админке: что показано. Разметка об этом ничего
 * не знает.
 *
 * Проще соседних разделов: ни сортировки, ни окна, ни удаления. Порядок
 * у ручки один — по `id`, то есть в порядке сида, где разделы сгруппированы
 * так же, как в меню сайта; сортировка по подписи разбросала бы бакалавриат
 * и магистратуру по алфавиту. Правка — своей страницей, по ссылке из строки.
 *
 * Номер страницы в адресе всё же есть: ответ контракта — страница, и разделов
 * может стать больше двадцати новым ченджсетом, не спрашивая фронт.
 */
export function useEditablePagesAdmin() {
  const [searchParams] = useSearchParams();

  const page = parsePage(searchParams.get(PAGE_PARAM));

  // В адресе счёт страниц с единицы, в запросе — с нуля. Пересчёт ровно здесь.
  const query = useQuery(editablePagesListQuery({ page: page - 1 }));

  const data = query.data;
  const totalPages = data?.totalPages ?? 0;

  return {
    sections: data ? [...data.content] : [],
    page,
    totalPages,

    /** Первая загрузка: показывать скелет. */
    isLoading: query.isLoading,
    /** Запрос приостановлен: нет сети либо вкладка в фоне, показать нечего. */
    isOffline: query.isPaused && data === undefined,
    /** На экране прошлая страница, пока едет следующая: таблица притушена. */
    isSwitching: query.isPlaceholderData && query.isFetching,
    isError: query.isError,
    errorMessage: query.error?.message ?? null,
    refetch: () => void query.refetch(),

    /**
     * Разделов нет вовсе. На живом стенде так не бывает: тринадцать
     * разделов заводит миграция, и пустой список означает, что она
     * не прошла, — это не «модератор ещё ничего не завёл».
     */
    isEmpty: query.isSuccess && data !== undefined && data.totalElements === 0,
    /** Страница за пределами данных: контракт отвечает `200` с пустым `content`. */
    isOutOfRange: query.isSuccess && totalPages > 0 && page > totalPages,

    hrefForPage: (target: number) => pageHref(ADMIN_PAGES_ROUTE, target),
  };
}
