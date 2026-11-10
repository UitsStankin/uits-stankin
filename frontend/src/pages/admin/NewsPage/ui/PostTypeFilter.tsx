import type { PostType } from '@shared/types';
import { LinkFilter, type LinkFilterOption } from '@shared/ui/LinkFilter';

interface PostTypeFilterProps {
  /** Что показано сейчас; `null` — оба типа. */
  current: PostType | null;
  hrefForType: (type: PostType | null) => string;
}

/**
 * Подписи фильтра — во множественном числе: он называет не запись,
 * а набор записей. Поэтому здесь свой список, а не `postTypeLabel`
 * из сущности: та отвечает на вопрос «что это за запись» и даёт
 * «Новость», что для кнопки отбора неверно.
 */
const OPTIONS: readonly LinkFilterOption<PostType | null>[] = [
  { value: null, label: 'Все' },
  { value: 'news', label: 'Новости' },
  { value: 'announcements', label: 'Объявления' },
];

/**
 * Отбор по типу записи. Разметка и доводы «ссылки, а не кнопки»
 * и «отбирает бэкенд» — у `shared/ui/LinkFilter`; здесь только пункты
 * (docs/API.md, «Новости: фильтр по типу записи»).
 */
export function PostTypeFilter({ current, hrefForType }: PostTypeFilterProps) {
  return (
    <LinkFilter label="Тип записи" options={OPTIONS} current={current} hrefFor={hrefForType} />
  );
}
