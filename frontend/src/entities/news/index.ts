/**
 * Публичный вход в сущность «новость»: снаружи берут отсюда,
 * а не из `api/ui/lib` напрямую.
 *
 * Сущность знает только чтение — списки и одну запись, публичные
 * и модераторский. Создание, правку и удаление приносит фича админки
 * (`features/manage-news`); лежат они там, а не здесь: `entities`
 * описывает предметную область, действия пользователя — дело `features`.
 *
 * `newsKeys` наружу вышел с F-43: после `POST`, `PUT` и `DELETE` фиче
 * админки нужно сбросить кэш, и сбросить его надо целиком — правка одной
 * записи меняет и админский список, и публичную ленту, и открытую статью.
 * Ровно ради такого выбора иерархия ключей и заведена.
 */
export { newsListQuery, newsItemQuery, allNewsListQuery, newsKeys } from './api/newsQueries';
export { findCachedNews } from './lib/cachedNews';
export { postTypeLabel, authorLabel, POST_TYPES } from './lib/newsPresenters';
export { NewsCard } from './ui/NewsCard';
export { NewsCardSkeleton } from './ui/NewsCardSkeleton';
