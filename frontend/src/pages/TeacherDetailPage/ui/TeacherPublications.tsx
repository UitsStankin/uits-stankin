import { Link } from 'react-router';
import { PUBLICATIONS_ROUTE, publicationRoute } from '@shared/config/routes';
import Pagination from '@shared/ui/Pagination';
import Loader from '@shared/ui/Loader';
import StatusBlock from '@shared/ui/StatusBlock';
import { RetryButton } from '@shared/ui/StatusAction';
import type { useTeacherPublications } from '../model/useTeacherPublications';

export function TeacherPublications({ state, standalone }: {
  state: ReturnType<typeof useTeacherPublications>;
  standalone: boolean;
}) {
  const { author, query, page, hrefForPage } = state;
  const Heading = standalone ? 'h1' : 'h2';
  return (
    <section className="grid gap-3 rounded-lg bg-white p-4" aria-labelledby="teacher-publications">
      <Heading id="teacher-publications" className="text-2xl font-bold">Публикации преподавателя</Heading>
      {standalone && <p>{author}</p>}
      {query.isPending && <Loader />}
      {query.error && (
        <StatusBlock tone="danger" title="Не удалось загрузить публикации"
          description={query.error.message} action={<RetryButton onClick={query.refetch} />} />
      )}
      {query.data?.totalElements === 0 && <p>Публикации не найдены.</p>}
      {standalone && query.data && query.data.totalElements > 0 && (
        page > query.data.totalPages
          ? <Link className="text-primary underline" to={hrefForPage(1)}>На первую страницу</Link>
          : <Pagination page={page} totalPages={query.data.totalPages} buildHref={hrefForPage} />
      )}
      {query.data && query.data.totalElements > 0 && (
        <ul className="grid gap-2">
          {(standalone ? query.data.content : query.data.content.slice(0, 5)).map((item) => (
            <li key={item.id}>
              <Link className="text-primary underline" to={publicationRoute(item.id)}>{item.name}</Link>
              <p>{item.source} · {item.year}</p>
            </li>
          ))}
        </ul>
      )}
      <Link className="text-primary underline" to={`${PUBLICATIONS_ROUTE}?${new URLSearchParams({ author })}`}>
        Публикации автора в каталоге
      </Link>
    </section>
  );
}
