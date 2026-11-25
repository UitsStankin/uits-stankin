import { usePublication } from './model/usePublication';
import { PublicationDetail } from './ui/PublicationDetail';
import { CatalogLink, QueryStatus } from './ui/common';

import { useAuth } from '@features/auth';
import { useCatalog } from './model/useCatalog';
import { Catalog } from './ui/Catalog';

export default function PublicationsPage({ manage = false }: { manage?: boolean }) {
  const state = useCatalog();
  const { canEdit } = useAuth();
  return <Catalog state={state} canEdit={canEdit} manage={manage} />;
}

export function PublicationDetailPage() {
  const { invalid, query } = usePublication();
  const { canEdit } = useAuth();
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <CatalogLink />
      {invalid ? <p>Публикация не найдена.</p> : (
        <QueryStatus pending={query.isPending} error={query.error} retry={query.refetch} />
      )}
      {query.data && <PublicationDetail item={query.data} canEdit={canEdit} />}
    </div>
  );
}
