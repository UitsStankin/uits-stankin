import { queryOptions } from '@tanstack/react-query';
import { api } from '@shared/api';
import type { Page } from '@shared/types';
import type { Publication, PublicationInput, ScholarResult, Tag } from '@shared/types/publication.types';

export type { Publication, Tag } from '@shared/types/publication.types';

type Filters = { page: number; author?: string; year?: number; tagId?: number };

const publicPath = '/api/public/publications';
const writePath = '/api/publications';
export const publicationsKey = ['publications'] as const;

export const publicationsQuery = (params: Filters) => queryOptions({
  queryKey: [...publicationsKey, 'list', params],
  queryFn: async ({ signal }) =>
    (await api.get<Page<Publication>>(publicPath, { params, signal })).data,
});

export const publicationQuery = (id: number) => queryOptions({
  queryKey: [...publicationsKey, 'detail', id],
  queryFn: async ({ signal }) =>
    (await api.get<Publication>(`${publicPath}/${id}`, { signal })).data,
});

export const tagsQuery = queryOptions({
  queryKey: [...publicationsKey, 'tags'],
  queryFn: async ({ signal }) => (await api.get<Tag[]>('/api/public/tags', { signal })).data,
});

export const authorsQuery = queryOptions({
  queryKey: [...publicationsKey, 'authors'],
  queryFn: async ({ signal }) => (await api.get<string[]>(`${publicPath}/authors`, { signal })).data,
});

export const scholarQuery = (q: string, page: number) => queryOptions({
  queryKey: ['publication-scholar', q, page],
  enabled: Boolean(q),
  retry: false,
  refetchOnReconnect: false,
  staleTime: 60_000,
  queryFn: async ({ signal }) =>
    (await api.get<ScholarResult[]>(`${writePath}/scholar`, { params: { q, page }, signal })).data,
});

export async function savePublication(id: number | null, body: PublicationInput) {
  const response = id === null
    ? await api.post<Publication>(writePath, body)
    : await api.put<Publication>(`${writePath}/${id}`, body);
  return response.data;
}

export async function deletePublication(id: number) {
  await api.delete(`${writePath}/${id}`);
}

export async function saveTag(id: number | null, name: string) {
  if (id === null) await api.post('/api/tags', { name });
  else await api.put(`/api/tags/${id}`, { name });
}

export async function deleteTag(id: number) {
  await api.delete(`/api/tags/${id}`);
}
