import { ANNOUNCEMENTS_ROUTE, NEWS_ROUTE } from '@shared/config/routes';
import type { PostType } from '@shared/types';

interface HomeFeedCopy {
  /** Что диктор говорит вместо серых прямоугольников скелета. */
  loading: string;
  errorTitle: string;
  emptyTitle: string;
  emptyDescription: string;
  /** Ссылка «ко всем» под секцией. */
  allLabel: string;
  allHref: string;
}

/**
 * Подписи состояний ленты на главной — по разделу.
 *
 * Падеж и род в «Новостей пока нет» и «Объявлений пока нет» отличаются не
 * подставленным словом, а формой, поэтому шаблоном их не собрать — таблица.
 * Своя, а не общая с `widgets/NewsFeed`: общий словарь должен был бы знать
 * и о ленте с пагинацией, и о витрине со ссылкой «ко всем».
 */
export const HOME_FEED_COPY: Record<PostType, HomeFeedCopy> = {
  news: {
    loading: 'Загрузка новостей',
    errorTitle: 'Не удалось загрузить новости',
    emptyTitle: 'Новостей пока нет',
    emptyDescription: 'Новости кафедры появятся здесь.',
    allLabel: 'Все новости',
    allHref: NEWS_ROUTE,
  },
  announcements: {
    loading: 'Загрузка объявлений',
    errorTitle: 'Не удалось загрузить объявления',
    emptyTitle: 'Объявлений пока нет',
    emptyDescription: 'Объявления кафедры появятся здесь.',
    allLabel: 'Все объявления',
    allHref: ANNOUNCEMENTS_ROUTE,
  },
};
