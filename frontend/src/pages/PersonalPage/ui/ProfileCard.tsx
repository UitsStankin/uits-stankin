import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';
import { cn } from '@shared/lib';

import { DefinitionField, definitionLabelClass } from './DefinitionField';

interface ProfileCardProps {
  /** Логин — единственное поле имени, которое гарантированно непустое. */
  username: string;
  /** «Фамилия Имя» либо прочерк. */
  fullName: string;
  email: string | null;
  /** Путь к аватару; `null` — покажем заглушку. */
  avatarUrl: string | null;
  /** Подписи ролей: их может быть несколько. */
  roles: readonly string[];
  /** Показать форму вместо карточки. */
  onEdit: () => void;
}

/**
 * Карточка учётной записи — режим чтения. Чистая: ничего не помнит
 * и не запрашивает, данные и обработчик приходят пропсами из сборки
 * страницы.
 *
 * Кнопка «Редактировать» из оригинала вернулась вместе с ручкой правки
 * (T-33, F-27): до неё форме некуда было отправлять, и кнопки здесь
 * не было вовсе. Правятся не все показанные поля — логин, почта и роли
 * остаются за администратором, — и об этом говорит сама форма,
 * а не карточка: пока на кнопку не нажали, ограничение ни при чём.
 */
export function ProfileCard({
  username,
  fullName,
  email,
  avatarUrl,
  roles,
  onEdit,
}: ProfileCardProps) {
  return (
    <section className="rounded bg-white p-6 shadow-sm">
      <header className="border-b border-default pb-4">
        <h2 className="text-h5 text-text-heading">Информация об аккаунте</h2>
        <p className="mt-1 text-sm text-text-muted">
          Здесь находится информация об авторизованном пользователе
        </p>
      </header>

      <div className="mt-5 flex flex-col gap-6 sm:flex-row">
        <img
          src={avatarUrl ?? DEFAULT_AVATAR_URL}
          alt=""
          // Аватар декоративный: всё, что он мог бы сообщить, стоит рядом
          // текстом — диктору его читать незачем.
          aria-hidden
          className="h-28 w-28 shrink-0 self-center rounded-full object-cover sm:self-start"
        />

        {/* Список определений, а не таблица: это пары «подпись — значение»,
            и диктор прочитает их парами. */}
        <dl className="flex min-w-0 flex-1 flex-col gap-4">
          <DefinitionField label="Имя пользователя" value={username} />
          <DefinitionField label="Фамилия Имя" value={fullName} />
          <DefinitionField label="Электронная почта" value={email} />

          <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
            <dt className={definitionLabelClass}>Уровень доступа</dt>
            <dd className="flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <span
                  key={role}
                  className="rounded-pill bg-secondary px-2.5 py-0.5 text-sm font-bold text-text-heading"
                >
                  {role}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </div>

      {/* Кнопка внизу и первичным стилем — как у карточки преподавателя
          ниже по странице: две соседние карточки с одинаковым действием,
          разложенным по-разному, читаются как два разных действия. */}
      <div className="mt-5">
        <button
          type="button"
          onClick={onEdit}
          className={cn(
            'rounded bg-primary px-4 py-2.5 text-base font-bold text-white transition',
            'hover:brightness-95',
          )}
        >
          Редактировать
        </button>
      </div>
    </section>
  );
}
