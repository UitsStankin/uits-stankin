import { ANNOUNCEMENTS_ROUTE } from '@shared/config/routes';
import NewsFeed from '@widgets/NewsFeed';

/**
 * Объявления кафедры. Отличается от новостей ровно двумя строками —
 * заголовком и разделом; лента у них общая (`widgets/NewsFeed`).
 *
 * Отдельная страница, а не вкладка на `/about/news`: отдельным пунктом меню
 * объявления были и в старом портале, и свой адрес нужен уже для того, чтобы
 * с главной было куда вести ссылку «Все объявления».
 *
 * Карточки ведут на `/about/news/{id}` — адрес записи один на оба раздела,
 * разбор в `shared/config/routes.ts`.
 */
export default function AnnouncementsPage() {
  return (
    <div className="flex w-full flex-col gap-8">
      <h1 className="u-page-title">Объявления кафедры</h1>

      <NewsFeed postType="announcements" route={ANNOUNCEMENTS_ROUTE} />
    </div>
  );
}
