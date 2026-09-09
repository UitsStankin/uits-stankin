import EditableSection from '@widgets/EditableSection';
import Pagination from '@shared/ui/Pagination';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { usePostgraduateList } from './model/usePostgraduateList';
import { usePostgraduateSearch } from './model/usePostgraduateSearch';
import { PostgraduateSearch } from './ui/PostgraduateSearch';
import { PostgraduateTable } from './ui/PostgraduateTable';
import { PostgraduateTableSkeleton } from './ui/PostgraduateTableSkeleton';

/**
 * Аспирантура: общая информация. Сборка — редактируемый раздел сверху,
 * таблица аспирантов под ним, как в оригинале.
 *
 * Страница смешанная, вторая такая после контактов: текст приходит
 * с бэкенда разделом `scientific-activity-postgraduate`, таблица —
 * своим запросом, а вёрстка вокруг них написана руками. Ровно об этом
 * предупреждала оговорка блока 3 бэклога: редактируемая часть готова
 * с F-23, своей осталась обёртка.
 *
 * Раздел и таблица **не связаны запросами**: раздел молчит про аспирантов,
 * таблица — про текст. Поэтому и состояния у них раздельные — сбой одного
 * запроса не гасит то, что успешно приехало вторым. Общий скелет
 * на страницу выглядел бы честнее ровно до первой пятисотки.
 *
 * Ширина `max-w-6xl`, как у списков ППС и УВП, а не `max-w-4xl` разделов:
 * шесть колонок таблицы в комфортной для чтения текста ширине уезжают
 * в прокрутку уже на ноутбуке.
 */
export default function PostgraduatePage() {
  const {
    postgraduates,
    page,
    totalPages,
    search,
    foundCount,
    firstRowNumber,
    isLoading,
    isOffline,
    isSwitching,
    isError,
    errorMessage,
    refetch,
    isEmpty,
    isNotFound,
    isOutOfRange,
    hrefForPage,
    hrefForAll,
  } = usePostgraduateList();

  // Поле и список читают один и тот же `?q=`, но с разной скоростью:
  // список — то, что уже в адресе, поле — то, что набирают прямо сейчас.
  const { text, setText, clear } = usePostgraduateSearch();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Аспирантура</h1>

      <EditableSection slug="scientific-activity-postgraduate" />

      {/*
        В оригинале этот заголовок был `h3` — прямо под `h1` и без `h2`
        между ними: по заголовкам страница читалась с дыркой. Уровень
        восстановлен, размер оставлен тем же, каким его видит глаз
        (`text-h5`, как у секций карточки ППС).
      */}
      <section className="flex flex-col gap-gutter">
        <h2 className="text-h5 text-text-heading">Аспиранты, руководители и специальности</h2>

        {/* Поля нет ровно в одном случае — искать не в чем: раздел пуст
            целиком. При сбое и обрыве связи оно остаётся: набранное
            переживёт «Повторить», а не потеряется вместе с ошибкой. */}
        {!isEmpty && (
          <PostgraduateSearch
            value={text}
            onChange={setText}
            onClear={clear}
            foundCount={foundCount}
          />
        )}

        {isLoading && <PostgraduateTableSkeleton />}

        {isOffline && (
          <StatusBlock
            title="Нет связи с сервером"
            description="Проверьте подключение и повторите попытку."
            action={<RetryButton onClick={refetch} />}
          />
        )}

        {isError && (
          <StatusBlock
            tone="danger"
            title="Не удалось загрузить список аспирантов"
            description={errorMessage}
            action={<RetryButton onClick={refetch} />}
          />
        )}

        {isEmpty && (
          <StatusBlock
            title="Аспирантов пока нет"
            description="Записи появятся здесь, как только их заведут."
          />
        )}

        {/* Пустая выдача поиска — не пустой раздел: записи есть, просто
            не эти. Запрос повторяется в тексте, потому что к моменту
            прочтения он уже неочевиден — поле выше, а глаз внизу. */}
        {isNotFound && (
          <StatusBlock
            title="Ничего не найдено"
            description={`По запросу «${search}» аспирантов нет. Проверьте написание или поищите по другому полю — фамилии, теме, специальности, году, руководителю.`}
            action={<ActionLink to={hrefForAll}>Показать всех</ActionLink>}
          />
        )}

        {/* Страница за пределами данных — не ошибка: контракт отвечает на неё
            `200` с пустым `content`. Пустая таблица без объяснения выглядела бы
            так, будто аспиранты кончились совсем. */}
        {isOutOfRange && (
          <StatusBlock
            title="Такой страницы нет"
            description={`Всего страниц: ${totalPages}.`}
            action={<ActionLink to={hrefForPage(1)}>К первой странице</ActionLink>}
          />
        )}

        {postgraduates.length > 0 && (
          <>
            <PostgraduateTable
              postgraduates={postgraduates}
              firstRowNumber={firstRowNumber}
              isSwitching={isSwitching}
            />
            <Pagination page={page} totalPages={totalPages} buildHref={hrefForPage} />
          </>
        )}
      </section>
    </div>
  );
}
