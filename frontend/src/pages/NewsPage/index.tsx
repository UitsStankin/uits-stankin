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
    <div className="flex w-full flex-col gap-8">
      <h1 className="u-page-title">Новости кафедры</h1>

      <NewsFeed postType="news" route={NEWS_ROUTE} />
    </div>
  );
}
