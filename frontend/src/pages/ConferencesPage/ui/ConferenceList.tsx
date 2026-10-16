import { ConferenceCard } from '@entities/conference';
import { cn } from '@shared/lib';
import type { Conference } from '@shared/types';

interface ConferenceListProps {
  conferences: readonly Conference[];
  hrefForConference: (id: number) => string;
  /** Едет следующая страница: список притушен и не кликается. */
  isSwitching?: boolean;
}

/**
 * Список карточек. Чистый: получает готовый список и функцию адреса.
 *
 * Одна колонка, как у ленты новостей, и по той же причине: заголовки
 * объявлений разной длины, и в сетке карточки в ряду выравнивались бы
 * по самой высокой.
 */
export function ConferenceList({
  conferences,
  hrefForConference,
  isSwitching = false,
}: ConferenceListProps) {
  return (
    <ul
      className={cn(
        'flex flex-col gap-gutter-sm transition-opacity',
        // Клики блокируются вместе с притушиванием: без этого можно успеть
        // открыть карточку, которая уже уехала с экрана.
        isSwitching && 'pointer-events-none opacity-50',
      )}
      // Диктору сообщается, что список сейчас обновляется, — иначе он
      // прочитает старые заголовки как актуальные.
      aria-busy={isSwitching}
    >
      {conferences.map((conference) => (
        <li key={conference.id}>
          <ConferenceCard conference={conference} href={hrefForConference(conference.id)} />
        </li>
      ))}
    </ul>
  );
}
