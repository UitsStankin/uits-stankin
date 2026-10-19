export type SlashItemId =
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'photo';

export interface SlashItem {
  id: SlashItemId;
  title: string;
  hint: string;
  /** Слова, по которым блок находят, кроме названия. */
  keywords: readonly string[];
}

const ITEMS: readonly SlashItem[] = [
  {
    id: 'heading2',
    title: 'Заголовок',
    hint: 'Крупный заголовок раздела',
    keywords: ['h2', 'heading', 'заголовок', 'раздел'],
  },
  {
    id: 'heading3',
    title: 'Подзаголовок',
    hint: 'Заголовок помельче',
    keywords: ['h3', 'subheading', 'подзаголовок'],
  },
  {
    id: 'bulletList',
    title: 'Список',
    hint: 'Маркированный список',
    keywords: ['list', 'ul', 'список', 'маркер'],
  },
  {
    id: 'orderedList',
    title: 'Нумерованный список',
    hint: 'Пункты с номерами',
    keywords: ['ol', 'номер', 'нумерованный'],
  },
  {
    id: 'blockquote',
    title: 'Цитата',
    hint: 'Выделенная цитата',
    keywords: ['quote', 'цитата'],
  },
  {
    id: 'photo',
    title: 'Фото или карусель',
    hint: 'Одно фото с подписью или несколько подряд',
    keywords: ['photo', 'image', 'gallery', 'фото', 'картинка', 'карусель', 'галерея'],
  },
];

/** Блоки, подходящие под набранное после «/»; пустой запрос — все. */
export function filterSlashItems(query: string, options: { photos: boolean }): SlashItem[] {
  const needle = query.trim().toLowerCase();

  return ITEMS.filter((item) => options.photos || item.id !== 'photo').filter(
    (item) =>
      needle === '' ||
      item.title.toLowerCase().includes(needle) ||
      item.keywords.some((keyword) => keyword.includes(needle)),
  );
}
