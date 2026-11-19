import Loader from '@shared/ui/Loader';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

export const linkClass = 'text-primary underline';
export const buttonClass = 'rounded bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50';
export const inputClass = 'w-full rounded border border-default bg-white px-3 py-2';

export function LoadStatus({ pending, error, retry }: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending) return <Loader />;
  if (!error) return null;
  return <StatusBlock tone="danger" title="Не удалось загрузить ведомости"
    description={error.message} action={<RetryButton onClick={retry} />} />;
}
