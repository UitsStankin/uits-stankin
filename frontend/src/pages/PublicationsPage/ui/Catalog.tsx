import { Link } from 'react-router';
import {
  PUBLICATION_MANAGE_ROUTE, PUBLICATION_NEW_ROUTE,
  PUBLICATION_SCHOLAR_ROUTE, PUBLICATION_TAGS_ROUTE, publicationEditRoute, publicationRoute,
} from '@shared/config/routes';
import Pagination from '@shared/ui/Pagination';
import type { useCatalog } from '../model/useCatalog';
import { CatalogLink, buttonClass, inputClass, linkClass, panelClass, QueryStatus } from './common';

export function Catalog({ state, canEdit, manage }: {
  state: ReturnType<typeof useCatalog>;
  canEdit: boolean;
  manage: boolean;
}) {
  const { page, author, year, tagId, catalog, authors, tags, applyFilters, hrefForPage } = state;
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-5">
      {manage && <CatalogLink />}
      <h1 className="text-3xl font-bold">{manage ? 'Управление публикациями' : 'Научные публикации'}</h1>
      {canEdit && (
        <nav aria-label="Управление публикациями" className="flex flex-wrap gap-4">
          {!manage && <Link className={linkClass} to={PUBLICATION_MANAGE_ROUTE}>Управление публикациями</Link>}
          <Link className={linkClass} to={PUBLICATION_NEW_ROUTE}>Добавить публикацию</Link>
          <Link className={linkClass} to={PUBLICATION_TAGS_ROUTE}>Управление тегами</Link>
          <Link className={linkClass} to={PUBLICATION_SCHOLAR_ROUTE}>Поиск в Google Scholar</Link>
        </nav>
      )}
      <form key={JSON.stringify([author, year, tagId])} onSubmit={applyFilters}
        className={`${panelClass} grid gap-3 sm:grid-cols-3`}>
        <label>Автор
          <input className={inputClass} name="author" list="publication-authors" defaultValue={author} />
          <datalist id="publication-authors">
            {authors.data?.map((name) => <option key={name} value={name} />)}
          </datalist>
        </label>
        <label>Год
          <input className={inputClass} name="year" type="number" min="1" defaultValue={year ?? ''} />
        </label>
        <label>Тег
          <select className={inputClass} name="tagId" defaultValue={tagId ?? ''}>
            <option value="">Все теги</option>
            {tagId && !tags.data?.some((tag) => tag.id === tagId) && <option value={tagId}>Тег №{tagId}</option>}
            {tags.data?.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
          </select>
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
          <button className={buttonClass}>Применить</button>
          <Link className={linkClass} to=".">Сбросить</Link>
        </div>
      </form>
      {authors.error && <QueryStatus pending={false} error={authors.error} retry={authors.refetch} />}
      {tags.error && <QueryStatus pending={false} error={tags.error} retry={tags.refetch} />}
      <QueryStatus pending={catalog.isPending} error={catalog.error} retry={catalog.refetch} />
      {catalog.data && (
        <>
          {catalog.data.content.length === 0 && (
            <p>{catalog.data.totalElements ? 'На этой странице нет публикаций.' : 'Публикации не найдены.'}</p>
          )}
          <ul className="grid gap-3">
            {catalog.data.content.map((item) => (
              <li key={item.id} className={panelClass}>
                <h2 className="text-xl font-semibold"><Link className={linkClass} to={publicationRoute(item.id)}>{item.name}</Link></h2>
                <p>{item.authors.join(', ')}</p>
                <p>{item.source} · {item.year}</p>
                {item.tags.length > 0 && <p className="text-text-muted">{item.tags.map((tag) => tag.name).join(' · ')}</p>}
                {manage && <Link className={linkClass} to={publicationEditRoute(item.id)}>Редактировать</Link>}
              </li>
            ))}
          </ul>
          {page > catalog.data.totalPages && catalog.data.totalElements > 0
            ? <Link className={linkClass} to={hrefForPage(1)}>На первую страницу</Link>
            : <Pagination page={page} totalPages={catalog.data.totalPages} buildHref={hrefForPage} />}
        </>
      )}
    </div>
  );
}
