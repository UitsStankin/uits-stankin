import { Link } from 'react-router';
import { isApiError } from '@shared/api';
import { PUBLICATIONS_ROUTE } from '@shared/config/routes';
import Loader from '@shared/ui/Loader';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';

export const inputClass = 'w-full rounded border border-gray-400 bg-white px-3 py-2';
export const buttonClass = 'w-fit rounded bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50';
export const linkClass = 'text-primary underline';
export const panelClass = 'rounded-lg bg-white p-4 shadow-sm';

export function CatalogLink() {
  return <Link className={linkClass} to={PUBLICATIONS_ROUTE}>К каталогу публикаций</Link>;
}

export function QueryStatus({ pending, error, retry }: {
  pending: boolean;
  error: Error | null;
  retry: () => void;
}) {
  if (pending) return <Loader />;
  if (!error) return null;
  const missing = isApiError(error) && error.status === 404;
  return (
    <StatusBlock
      tone="danger"
      title={missing ? 'Запись не найдена' : 'Не удалось загрузить данные'}
      description={error.message}
      action={missing ? <CatalogLink /> : <RetryButton onClick={retry} />}
    />
  );
}

export function MutationError({ error }: { error: Error | null }) {
  if (!error) return null;
  const fields = isApiError(error) ? Object.values(error.errors ?? {}).flat() : [];
  return <p role="alert" className="text-red-700">{fields.length ? fields.join('. ') : error.message}</p>;
}
