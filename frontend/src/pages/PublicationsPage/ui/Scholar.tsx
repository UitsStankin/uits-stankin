import { Link } from 'react-router';
import { isApiError } from '@shared/api';
import { PUBLICATION_NEW_ROUTE } from '@shared/config/routes';
import type { useScholar } from '../model/useScholar';
import { buttonClass, CatalogLink, inputClass, linkClass, panelClass, QueryStatus } from './common';

function externalLink(url: string | null) {
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

export function Scholar({ state }: { state: ReturnType<typeof useScholar> }) {
  const { q, page, inputError, results, submit, setPage } = state;
  const retryAfter = isApiError(results.error) && results.error.status === 429 ? results.error.retryAfter : null;
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <CatalogLink />
      <h1 className="text-3xl font-bold">Поиск в Google Scholar</h1>
      <form className={`${panelClass} grid gap-3`} onSubmit={submit}>
        <label>Имя автора<input className={inputClass} name="q" required maxLength={200} /></label>
        {inputError && <p role="alert">{inputError}</p>}
        <button className={buttonClass} disabled={results.isFetching}>Найти</button>
      </form>
      {q && (
        <>
          <QueryStatus pending={results.isPending} error={results.error} retry={results.refetch} />
          {retryAfter !== null && <p>Повторите запрос через {retryAfter} с.</p>}
          {results.data?.length === 0 && <p>На этой странице ничего не найдено.</p>}
          <ul className="grid gap-3">
            {results.data?.map((item, index) => {
              const url = externalLink(item.link);
              const pdfUrl = externalLink(item.pdfUrl);
              const draft = new URLSearchParams({ title: item.title });
              if (url && url.length <= 200) draft.set('url', url);
              if (item.year) draft.set('year', String(item.year));
              return (
                <li key={`${item.id ?? item.title}-${index}`} className={`${panelClass} grid gap-2`}>
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  {item.publicationInfo && <p>{item.publicationInfo}</p>}
                  {item.snippet && <p>{item.snippet}</p>}
                  {item.citedBy !== null && <p>Цитирований: {item.citedBy}</p>}
                  <div className="flex flex-wrap gap-4">
                    {url && <a className={linkClass} href={url}>Источник</a>}
                    {pdfUrl && <a className={linkClass} href={pdfUrl}>PDF</a>}
                    <Link className={linkClass} to={`${PUBLICATION_NEW_ROUTE}?${draft}`}>Использовать в новой публикации</Link>
                  </div>
                </li>
              );
            })}
          </ul>
          <nav aria-label="Страницы Google Scholar" className="flex flex-wrap items-center gap-3">
            <button className={buttonClass} disabled={page === 0 || results.isFetching}
              onClick={() => setPage(page - 1)}>Предыдущая</button>
            <span>Страница {page + 1} из 3</span>
            <button className={buttonClass} disabled={page === 2 || results.isFetching || !results.data?.length}
              onClick={() => setPage(page + 1)}>Следующая</button>
          </nav>
        </>
      )}
    </div>
  );
}
