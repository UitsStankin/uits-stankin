import { Link } from 'react-router';
import { ChevronLeft } from 'lucide-react';

import { CONFERENCES_ROUTE } from '@shared/config/routes';
import StatusBlock from '@shared/ui/StatusBlock';
import { ActionLink, RetryButton } from '@shared/ui/StatusAction';

import { useConferenceItem } from './model/useConferenceItem';
import { ConferenceArticle } from './ui/ConferenceArticle';
import { ConferenceArticleSkeleton } from './ui/ConferenceArticleSkeleton';

/**
 * Одно объявление о конференции. Сборка: состояние из модели, разметка
 * из чистых компонентов.
 *
 * Ссылка «ко всем» ведёт на первую страницу списка, а не «назад»
 * по истории: на страницу попадают и из поиска, и по присланному адресу,
 * и `history.back()` увёл бы такого посетителя с портала совсем.
 * Выбора раздела по записи, как у новостей с F-20, здесь нет —
 * раздел у конференций один.
 */
export default function ConferenceDetailPage() {
  const { conference, isLoading, isOffline, isNotFound, isError, errorMessage, refetch } =
    useConferenceItem();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter-sm">
      <Link
        to={CONFERENCES_ROUTE}
        className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
      >
        <ChevronLeft size={16} aria-hidden />
        Ко всем конференциям
      </Link>

      {isLoading && <ConferenceArticleSkeleton />}

      {isOffline && (
        <StatusBlock
          title="Нет связи с сервером"
          description="Проверьте подключение и повторите попытку."
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {isNotFound && (
        <StatusBlock
          title="Объявление не найдено"
          // Скрытое и несуществующее объявления неразличимы по контракту —
          // и текст не должен подсказывать, что именно из двух случилось.
          description="Возможно, его удалили или сняли с публикации, а ссылка осталась."
          action={<ActionLink to={CONFERENCES_ROUTE}>К списку конференций</ActionLink>}
        />
      )}

      {isError && (
        <StatusBlock
          tone="danger"
          title="Не удалось загрузить объявление"
          description={errorMessage}
          action={<RetryButton onClick={refetch} />}
        />
      )}

      {conference && <ConferenceArticle conference={conference} />}
    </div>
  );
}
