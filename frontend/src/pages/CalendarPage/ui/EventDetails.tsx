import { EVENT_STATUS_LABELS, formatEventPeriod } from '@entities/event';
import { accountName } from '@shared/lib';
import Modal from '@shared/ui/Modal';
import type { UserEvent } from '@shared/types';

interface EventDetailsProps {
  event: UserEvent;
  onClose: () => void;
}

/**
 * Событие целиком — по клику в календаре. Чистое.
 *
 * В оригинале то же самое показывала всплывающая подсказка при наведении,
 * а клик открывал сразу правку. Подсказки по наведению нет на телефоне
 * и нет с клавиатуры, поэтому здесь всё — по клику, в боковой панели,
 * а правка приедет в ту же панель с F-60.
 *
 * Частота напоминаний не показывается: напоминаний в портале нет
 * (ARCHITECTURE.md §8, п. 14), и строка «каждую неделю» обещала бы то,
 * чего не случится.
 */
export function EventDetails({ event, onClose }: EventDetailsProps) {
  return (
    <Modal title={event.name} onClose={onClose}>
      <dl className="flex flex-col gap-4 text-base">
        <Field term="Когда">{formatEventPeriod(event)}</Field>

        <Field term="Статус">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            {EVENT_STATUS_LABELS[event.status]}
          </span>
        </Field>

        {event.description && (
          <Field term="Описание">
            {/* Простой текст, не HTML: переносы строк из формы сохраняются. */}
            <span className="whitespace-pre-line">{event.description}</span>
          </Field>
        )}

        <Field term="Создал">{accountName(event.owner)}</Field>

        <Field term="Назначено">
          {event.assignedUsers.length === 0 ? (
            <span className="text-text-muted">Никому</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {event.assignedUsers.map((person) => (
                <li key={person.id}>{accountName(person)}</li>
              ))}
            </ul>
          )}
        </Field>
      </dl>
    </Modal>
  );
}

function Field({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-text-muted">{term}</dt>
      <dd className="text-text-default">{children}</dd>
    </div>
  );
}
