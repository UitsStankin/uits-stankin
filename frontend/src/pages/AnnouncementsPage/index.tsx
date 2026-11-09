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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Объявления кафедры</h1>

      <NewsFeed postType="announcements" route={ANNOUNCEMENTS_ROUTE} />
    </div>
  );
}
