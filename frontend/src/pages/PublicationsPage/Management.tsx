import { useLocation } from 'react-router';

import type { Publication } from '@entities/publication';
import { usePublication, usePublicationEditor } from './model/usePublication';
import { useScholar } from './model/useScholar';
import { useTags } from './model/useTags';
import { CatalogLink, QueryStatus } from './ui/common';
import { PublicationForm, type Draft } from './ui/PublicationForm';
import { Scholar } from './ui/Scholar';
import { Tags } from './ui/Tags';

export function PublicationEditorPage() {
  const { id, invalid, query } = usePublication();
  const { search } = useLocation();
  if (invalid) return <div><CatalogLink /><p>Публикация не найдена.</p></div>;
  if (id !== null && !query.data) {
    return <QueryStatus pending={query.isPending} error={query.error} retry={query.refetch} />;
  }
  const params = new URLSearchParams(search);
  const year = Number(params.get('year'));
  const draft = {
    name: params.get('title')?.slice(0, 200),
    url: params.get('url') ?? undefined,
    year: Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() + 1 ? year : undefined,
  };
  return <PublicationEditor key={id ?? search} item={query.data} draft={draft} />;
}

function PublicationEditor({ item, draft }: { item?: Publication; draft: Draft }) {
  const state = usePublicationEditor(item?.id ?? null, item?.file ?? null);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <CatalogLink />
      <h1 className="text-3xl font-bold">{item ? 'Редактирование публикации' : 'Новая публикация'}</h1>
      <PublicationForm item={item} draft={draft} state={state} />
    </div>
  );
}

export function PublicationTagsPage() {
  const state = useTags();
  return <Tags state={state} />;
}

export function PublicationScholarPage() {
  const state = useScholar();
  return <Scholar state={state} />;
}
