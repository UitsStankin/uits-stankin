import { LinkFilter, type LinkFilterOption } from '@shared/ui/LinkFilter';

import type { ArchiveView } from '../model/useTeachersAdmin';

interface ArchiveFilterProps {
  current: ArchiveView;
  hrefForView: (view: ArchiveView) => string;
}

/** Действующие — первыми: это умолчание раздела (разбор у `ArchiveView`). */
const OPTIONS: readonly LinkFilterOption<ArchiveView>[] = [
  { value: 'active', label: 'Действующие' },
  { value: 'archived', label: 'В архиве' },
  { value: 'all', label: 'Все' },
];

/** Отбор карточек ППС по архиву. Разметка — у `shared/ui/LinkFilter`. */
export function ArchiveFilter({ current, hrefForView }: ArchiveFilterProps) {
  return (
    <LinkFilter
      label="Состояние карточки"
      options={OPTIONS}
      current={current}
      hrefFor={hrefForView}
    />
  );
}
