import { Inbox, WifiOff } from 'lucide-react';

import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

import type { HomeListState } from '../model/useHomeContent';

interface SectionStatusProps {
  state: Pick<
    HomeListState<unknown>,
    'isLoading' | 'isOffline' | 'isError' | 'errorMessage' | 'isEmpty' | 'refetch'
  >;
  loading: string;
  errorTitle: string;
  emptyTitle: string;
  emptyDescription?: string;
}

/**
 * Состояние выдачи вместо её содержимого: загрузка, обрыв связи, сбой, пустота.
 * Ничего не рисует, пока есть что показать.
 */
export function SectionStatus({
  state,
  loading,
  errorTitle,
  emptyTitle,
  emptyDescription,
}: SectionStatusProps) {
  if (state.isLoading) {
    return (
      <p role="status" className="u-status">
        {loading}
      </p>
    );
  }

  if (state.isOffline) {
    return (
      <StatusBlock
        icon={WifiOff}
        title="Нет связи с сервером"
        description="Проверьте подключение и повторите попытку."
        action={<RetryButton onClick={state.refetch} />}
      />
    );
  }

  if (state.isError) {
    return (
      <StatusBlock
        tone="danger"
        title={errorTitle}
        description={state.errorMessage}
        action={<RetryButton onClick={state.refetch} />}
      />
    );
  }

  if (state.isEmpty) {
    return <StatusBlock icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return null;
}
