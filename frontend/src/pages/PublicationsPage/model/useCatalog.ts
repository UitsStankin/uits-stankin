import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router';
import { authorsQuery, publicationsQuery, tagsQuery } from '@entities/publication';
import { pageHref, parseId, parsePage } from '@shared/lib';
import type { FormEvent } from 'react';

export function useCatalog() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get('page'));
  const author = params.get('author') ?? '';
  const year = parseId(params.get('year') ?? undefined);
  const tagId = parseId(params.get('tagId') ?? undefined);
  const catalog = useQuery(publicationsQuery({
    page: page - 1,
    author: author || undefined,
    year: year ?? undefined,
    tagId: tagId ?? undefined,
  }));
  const authors = useQuery(authorsQuery);
  const tags = useQuery(tagsQuery);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const filters = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const name of ['author', 'year', 'tagId']) {
      const value = String(filters.get(name) ?? '').trim();
      if (value) next.set(name, value);
    }
    setParams(next);
  }

  const hrefForPage = (number: number) => pageHref(pathname, number, {
    author: author || null,
    year: year === null ? null : String(year),
    tagId: tagId === null ? null : String(tagId),
  });

  return { page, author, year, tagId, catalog, authors, tags, applyFilters, hrefForPage };
}
