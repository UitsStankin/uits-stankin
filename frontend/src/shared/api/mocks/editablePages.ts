import { http, HttpResponse } from 'msw';

import type { EditablePage, EditablePageRequest, EditablePageSlug } from '@shared/types';

import { pageFromUrl } from './page';
import { problemResponse } from './problemResponse';

/** `*` вместо origin — по той же причине, что и у новостей. */
const PUBLIC_PAGES = '*/api/public/pages/:slug';
const PAGES = '*/api/pages';
const PAGE_ITEM = '*/api/pages/:slug';

/**
 * Тринадцать разделов в порядке `id` и с подписями — как их заводит ченджсет
 * `008-seed-editable-pages`. Порядок не украшение: списочная ручка
 * админки сортирует по `id` (`@PageableDefault(sort = "id")`), и мок
 * с другим порядком показывал бы в браузере не тот список, что стенд.
 *
 * `Record`, а не массив: пропущенный или лишний слаг — ошибка компиляции
 * по `EditablePageSlug`. Порядок записи в объекте JavaScript сохраняет.
 */
const SEED: Record<EditablePageSlug, string> = {
  'fields-of-study': 'Направления подготовки',
  contacts: 'Контакты',
  'documents-department': 'Нормативные документы кафедры',
  'documents-university': 'Нормативные документы университета',
  'bachelor-edu-plans': 'Бакалавриат: учебные планы',
  'bachelor-graduate': 'Бакалавриат: защита ВКР',
  'bachelor-practices': 'Бакалавриат: практики',
  'master-edu-plans': 'Магистратура: учебные планы',
  'master-graduate': 'Магистратура: защита ВКР',
  'master-practices': 'Магистратура: практики',
  'scientific-activity-postgraduate': 'Аспирантура',
  'home-before': 'Главная: блок над новостями',
  'home-after': 'Главная: блок под новостями',
};

/**
 * Редактируемые разделы: публичное чтение по слагу, модераторский список
 * и правка.
 *
 * Текст задаётся по слагу, остальные приходят **пустыми** — ровно так
 * выглядит чистая база: ченджсет заводит все тринадцать разделов
 * с `text: ''`. Умолчание выбрано не для удобства тестов, а потому, что
 * это состояние, в котором портал сегодня и разворачивается. Мок, отдающий
 * выдуманный текст по умолчанию, прятал бы главную без обоих блоков —
 * то самое, что на стенде видно первым.
 *
 * **Мок с состоянием и один на обе половины контракта** (с F-45) — как
 * у новостей: раздел, сохранённый в админке, показывается на своей
 * странице и на главной. Тесту, который что-то сохраняет, нужен свой
 * набор — `server.use(...editablePageHandlers())`.
 *
 * Что мок повторяет из контракта, а что нет:
 *
 * - **закрытый набор** — да: неизвестный слаг даёт `404` и на чтении,
 *   и на правке, а создать раздел нечем;
 * - **`text` хранится как пришёл** — да, без обрезки пробелов и без
 *   превращения пустой строки в `null`: у этого поля свой десериализатор
 *   на сервере, и мок, «чистящий» текст, спрятал бы ровно ту ошибку,
 *   которую контракт описывает отдельным абзацем;
 * - **`updatedAt`** обновляется при сохранении, `createdAt` — нет;
 * - **проверки полей** — нет: пустую подпись ловит схема формы, а отказ
 *   сервера тест заводит точечно — так же устроен мок новостей.
 */
export function editablePageHandlers(texts: Partial<Record<EditablePageSlug, string>> = {}) {
  let pages: EditablePage[] = (Object.keys(SEED) as EditablePageSlug[]).map((slug) => ({
    slug,
    title: SEED[slug],
    text: texts[slug] ?? '',
    // Даты константами, а не `new Date()`: плавающее значение делает
    // падение теста невоспроизводимым — то же правило, что
    // у `timestamp` в `problemResponse`.
    createdAt: '2026-08-01T10:15:30.123456+03:00',
    updatedAt: '2026-08-20T10:15:30.123456+03:00',
  }));

  return [
    http.get(PUBLIC_PAGES, ({ params }) => {
      const page = pages.find((each) => each.slug === params.slug);

      return page
        ? HttpResponse.json(page)
        : notFound(String(params.slug), `/api/public/pages/${String(params.slug)}`);
    }),

    http.get(PAGES, ({ request }) => HttpResponse.json(pageFromUrl(pages, new URL(request.url)))),

    http.put(PAGE_ITEM, async ({ params, request }) => {
      const slug = String(params.slug);
      const body = (await request.json()) as EditablePageRequest;

      const existing = pages.find((each) => each.slug === slug);
      if (!existing) return notFound(slug, `/api/pages/${slug}`);

      const updated: EditablePage = {
        ...existing,
        title: body.title,
        text: body.text,
        updatedAt: new Date().toISOString(),
      };
      pages = pages.map((each) => (each.slug === slug ? updated : each));

      return HttpResponse.json(updated);
    }),
  ];
}

/** Текст — `EditablePageService`: «Раздел {slug} не найден». */
function notFound(slug: string, instance: string) {
  return problemResponse(404, {
    title: 'Not Found',
    detail: `Раздел ${slug} не найден`,
    instance,
  });
}
