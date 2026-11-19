import { http, HttpResponse } from 'msw';
import type { Publication, PublicationInput, ScholarResult, Tag } from '@shared/types/publication.types';
import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';

const catalog = '*/api/public/publications';
const moderator = '*/api/publications';

export function makePublication(overrides: Partial<Publication> = {}): Publication {
  return {
    id: 1,
    name: 'Методы упаковки в задачах раскроя',
    authors: ['Чеканин Владимир Алексеевич'],
    description: 'Исследование методов оптимизации раскроя.',
    year: 2024,
    source: 'Вестник МГТУ «Станкин»',
    url: null,
    file: null,
    fileUrl: null,
    pages: '45–52',
    volN: null,
    isbn: null,
    tags: [{ id: 1, name: 'Оптимизация' }],
    ...overrides,
  };
}

const scholarExample: ScholarResult = {
  id: 'packing',
  title: 'Оптимизация ортогональной упаковки',
  link: 'https://example.org/packing',
  snippet: 'Алгоритмы решения задачи ортогональной упаковки.',
  publicationInfo: 'Прикладная информатика, 2022',
  year: 2022,
  citedBy: null,
  pdfUrl: null,
};

export function publicationHandlers(seed: Publication[] = [makePublication()]) {
  const items = new Map(seed.map((item) => [item.id, item]));
  const tags = new Map<number, Tag>([[1, { id: 1, name: 'Оптимизация' }]]);
  let nextItem = Math.max(0, ...items.keys()) + 1;
  let nextTag = 2;
  const missing = () => problemResponse(404, { title: 'Not Found', detail: 'Запись не найдена', instance: '/api/public/publications' });

  async function writeItem(request: Request, id: number, status: number) {
    const { tagIds, ...body } = await request.json() as PublicationInput;
    const selectedTags = tagIds.map((tagId) => tags.get(tagId));
    if (selectedTags.some((tag) => !tag)) return problemResponse(400, { title: 'Bad Request', detail: 'Неизвестный тег', instance: '/api/publications' });
    const item = {
      ...body, id, tags: selectedTags.filter((tag) => tag !== undefined),
      fileUrl: body.file ? `/media/${body.file}` : null,
    };
    items.set(id, item);
    return HttpResponse.json(item, { status });
  }

  async function writeTag(request: Request, id: number, status: number) {
    const { name } = await request.json() as { name: string };
    const trimmed = name.trim();
    if ([...tags.values()].some((tag) => tag.id !== id && tag.name.toLowerCase() === trimmed.toLowerCase())) {
      return problemResponse(400, { title: 'Bad Request', detail: 'Такой тег уже существует', instance: '/api/tags', errors: { name: ['Такой тег уже существует'] } });
    }
    const tag = { id, name: trimmed };
    tags.set(id, tag);
    for (const item of items.values()) {
      items.set(item.id, { ...item, tags: item.tags.map((old) => old.id === id ? tag : old) });
    }
    return HttpResponse.json(tag, { status });
  }

  return [
    http.get(catalog, ({ request }) => {
      const url = new URL(request.url);
      const author = url.searchParams.get('author')?.toLowerCase();
      const year = url.searchParams.get('year');
      const tagId = url.searchParams.get('tagId');
      const filtered = [...items.values()].filter((item) =>
        (!author || item.authors.some((name) => name.toLowerCase().includes(author))) &&
        (!year || item.year === Number(year)) &&
        (!tagId || item.tags.some(({ id }) => id === Number(tagId))),
      ).sort((left, right) => right.year - left.year || right.id - left.id);
      return HttpResponse.json(pageFromUrl(filtered, url));
    }),
    http.get(`${catalog}/authors`, () => HttpResponse.json(
      [...new Set([...items.values()].flatMap((item) => item.authors))].sort(),
    )),
    http.get(`${catalog}/:id`, ({ params }) => {
      const item = items.get(Number(params.id));
      return item ? HttpResponse.json(item) : missing();
    }),
    http.post(moderator, ({ request }) => writeItem(request, nextItem++, 201)),
    http.put(`${moderator}/:id`, ({ request, params }) => {
      const id = Number(params.id);
      return items.has(id) ? writeItem(request, id, 200) : missing();
    }),
    http.delete(`${moderator}/:id`, ({ params }) =>
      items.delete(Number(params.id)) ? new HttpResponse(null, { status: 204 }) : missing()),
    http.get('*/api/public/tags', () => HttpResponse.json(
      [...tags.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru')),
    )),
    http.post('*/api/tags', ({ request }) => writeTag(request, nextTag++, 201)),
    http.put('*/api/tags/:id', ({ request, params }) => {
      const id = Number(params.id);
      return tags.has(id) ? writeTag(request, id, 200) : missing();
    }),
    http.delete('*/api/tags/:id', ({ params }) => {
      const id = Number(params.id);
      if (!tags.delete(id)) return missing();
      for (const item of items.values()) {
        items.set(item.id, { ...item, tags: item.tags.filter((tag) => tag.id !== id) });
      }
      return new HttpResponse(null, { status: 204 });
    }),
    http.get(`${moderator}/scholar`, ({ request }) => {
      const { searchParams } = new URL(request.url);
      const page = Number(searchParams.get('page'));
      if (!searchParams.get('q')?.trim() || !Number.isInteger(page) || page < 0 || page > 2) {
        return problemResponse(400, { title: 'Bad Request', detail: 'Проверьте запрос и номер страницы', instance: '/api/publications/scholar' });
      }
      return HttpResponse.json(page === 0 ? [scholarExample] : []);
    }),
  ];
}
