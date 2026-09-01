import { NEWS_ROUTE } from '@shared/config/routes';
import NewsFeed from '@widgets/NewsFeed';

/**
 * Новости кафедры. Заголовок и раздел — здесь, всё остальное делает лента
 * (`widgets/NewsFeed`): она же стоит на объявлениях, и состояний у неё шесть.
 *
 * Страница публичная и намеренно не за `ProtectedRoute`: ручка
 * `GET /api/public/news` открыта всем, и лента — то, ради чего на портал
 * заходят без входа.
 *
 * Заголовок «Новости кафедры», а не «Новости и объявления», как было
 * до F-20: раздел показывает только `postType: news` — объявления уехали
 * на свою страницу. Отбор делает бэкенд параметром запроса; фильтровать
 * ответ на клиенте нельзя ни в каком виде — счётчики страниц считает база,
 * и отбор после выдачи ломает пагинацию, а не чинит список.
 */
export default function NewsPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Новости кафедры</h1>

      <NewsFeed postType="news" route={NEWS_ROUTE} />
    </div>
  );
}
