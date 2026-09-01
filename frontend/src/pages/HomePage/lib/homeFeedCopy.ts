import { ANNOUNCEMENTS_ROUTE, NEWS_ROUTE } from '@shared/config/routes';
import type { PostType } from '@shared/types';

interface HomeFeedCopy {
  /** Заголовок секции. `h2`: единственный `h1` главной приходит из `home-before`. */
  title: string;
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
 * Подписи секций главной — по разделу.
 *
 * «Последние новости» и «Последние объявления» — заголовки из оригинала:
 * главная показывает витрину, а не раздел целиком, и «Новости кафедры»
 * обещали бы здесь список, которого на главной нет.
 *
 * Таблица своя, а не общая с `widgets/NewsFeed`, хотя четыре строки
 * совпадают дословно. Общий словарь на два места должен был бы знать
 * и о ленте с пагинацией, и о витрине со ссылкой «ко всем», — тот же размен,
 * по которому у главной свой запрос, а не общий хук с лентой.
 */
export const HOME_FEED_COPY: Record<PostType, HomeFeedCopy> = {
  news: {
    title: 'Последние новости',
    loading: 'Загрузка новостей',
    errorTitle: 'Не удалось загрузить новости',
    emptyTitle: 'Новостей пока нет',
    emptyDescription: 'Как только на кафедре что-то появится, это будет здесь.',
    allLabel: 'Все новости',
    allHref: NEWS_ROUTE,
  },
  announcements: {
    title: 'Последние объявления',
    loading: 'Загрузка объявлений',
    errorTitle: 'Не удалось загрузить объявления',
    emptyTitle: 'Объявлений пока нет',
    emptyDescription: 'Как только на кафедре что-то объявят, это будет здесь.',
    allLabel: 'Все объявления',
    allHref: ANNOUNCEMENTS_ROUTE,
  },
};
