import { cn } from '@shared/lib';
import { DEFAULT_AVATAR_URL } from '@shared/config/avatar';

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
}

/**
 * Карточка учётной записи. Чистая: ничего не помнит и не запрашивает,
 * всё приходит пропсами из сборки страницы.
 *
 * Только чтение — и это не упрощение, а состояние контракта: ручки правки
 * профиля нет, аватар записывать некуда (матрица паритета, п. 21). Кнопку
 * «Редактировать» из оригинала не переношу: она открывала бы форму,
 * которой некуда отправлять.
 */
export function ProfileCard({ username, fullName, email, avatarUrl, roles }: ProfileCardProps) {
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
          <Field label="Имя пользователя" value={username} />
          <Field label="Фамилия Имя" value={fullName} />
          <Field label="Электронная почта" value={email} />

          <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
            <dt className={labelClass}>Уровень доступа</dt>
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
    </section>
  );
}

const labelClass = 'shrink-0 text-sm text-text-muted sm:w-44';

/**
 * Одна пара «подпись — значение». Пустое значение показывается прочерком:
 * пропущенная строка выглядела бы как отсутствие такого поля вовсе.
 */
function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <dt className={labelClass}>{label}</dt>
      <dd className={cn('min-w-0 break-words text-base', value ? 'text-text-heading' : 'text-text-muted')}>
        {value || '—'}
      </dd>
    </div>
  );
}
