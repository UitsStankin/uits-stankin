import { Link } from 'react-router';
import type { Publication } from '@entities/publication';
import { PUBLICATIONS_ROUTE, publicationEditRoute } from '@shared/config/routes';
import { linkClass, panelClass } from './common';

export function PublicationDetail({ item, canEdit }: { item: Publication; canEdit: boolean }) {
  return (
    <article className={`${panelClass} grid gap-4`}>
      <h1 className="text-3xl font-bold">{item.name}</h1>
      <p>{item.authors.join(', ')}</p>
      <p>{[item.source, item.year, item.volN, item.pages && `с. ${item.pages}`, item.isbn && `ISBN ${item.isbn}`]
        .filter(Boolean).join(' · ')}</p>
      <p className="whitespace-pre-wrap break-words">{item.description}</p>
      <div className="flex flex-wrap gap-4">
        {item.url && <a className={linkClass} href={item.url}>Открыть источник</a>}
        {item.fileUrl && <a className={linkClass} href={item.fileUrl}>Скачать PDF</a>}
        {canEdit && <Link className={linkClass} to={publicationEditRoute(item.id)}>Редактировать</Link>}
      </div>
      {item.tags.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {item.tags.map((tag) => (
            <li key={tag.id}><Link className={linkClass} to={`${PUBLICATIONS_ROUTE}?tagId=${tag.id}`}>{tag.name}</Link></li>
          ))}
        </ul>
      )}
    </article>
  );
}
