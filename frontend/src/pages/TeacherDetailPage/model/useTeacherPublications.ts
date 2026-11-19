import { useQuery } from '@tanstack/react-query';
import { useLocation, useSearchParams } from 'react-router';
import { publicationsQuery } from '@entities/publication';
import { teacherFullName } from '@entities/teacher';
import { pageHref, parsePage } from '@shared/lib';

export function useTeacherPublications(teacher: Parameters<typeof teacherFullName>[0], standalone: boolean) {
  const author = teacherFullName(teacher);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const page = standalone ? parsePage(params.get('page')) : 1;
  const query = useQuery(publicationsQuery({ page: page - 1, author }));
  const hrefForPage = (number: number) => pageHref(pathname, number);
  return { author, query, page, hrefForPage };
}
