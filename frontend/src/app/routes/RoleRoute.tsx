import type { ReactNode } from 'react';

import { useAuth } from '@features/auth';
import { HOME_ROUTE } from '@shared/config/routes';
import type { AdminAccess } from '@shared/types';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

import ProtectedRoute from './protectedRoute';

interface RoleRouteProps {
  /** `moderator` — хватит модератора, `admin` — только суперпользователь. */
  access: AdminAccess;
  children: ReactNode;
}

/**
 * Пускает внутрь только тех, у кого хватает роли.
 *
 * Стоит **поверх** `ProtectedRoute`, а не вместо него: тот отвечает
 * на вопрос «вошёл ли», этот — «хватает ли прав», и вопросы разные.
 * Слитые в один компонент, они дали бы копию логики ожидания профиля
 * и возврата на форму входа — то есть второе место, где её однажды
 * поправят не так.
 *
 * Не хватило прав — экран отказа, а не переход на логин. Уводить туда
 * **вошедшего** пользователя значило бы предложить ему войти ещё раз,
 * тем же самым аккаунтом, с которым он только что получил отказ:
 * форма входа не сообщает ничего, а после успешного входа вернула бы
 * его на ту же закрытую страницу. Преподаватель, ткнувший в чужую
 * ссылку на админку, должен прочитать, что раздел не для него.
 */
export default function RoleRoute({ access, children }: RoleRouteProps) {
  return (
    <ProtectedRoute>
      <RoleGate access={access}>{children}</RoleGate>
    </ProtectedRoute>
  );
}

/**
 * Проверка роли. Отдельным компонентом, потому что смотреть на профиль
 * можно только после того, как `ProtectedRoute` дождался его загрузки:
 * до этого прав нет ни у кого, и любой вошедший увидел бы отказ
 * на каждом обновлении страницы.
 */
function RoleGate({ access, children }: RoleRouteProps) {
  const { canEdit, isAdmin } = useAuth();

  // Админ проходит и там, где достаточно модератора: он может всё,
  // что может модератор (docs/API.md, «Роли»).
  const allowed = access === 'admin' ? isAdmin : canEdit;

  if (!allowed) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-gutter">
        <StatusBlock
          tone="danger"
          title="Недостаточно прав"
          description={
            access === 'admin'
              ? 'Этот раздел доступен только администратору портала.'
              : 'Этот раздел доступен администратору и модератору портала.'
          }
          action={<ActionLink to={HOME_ROUTE}>На главную</ActionLink>}
        />
      </div>
    );
  }

  return <>{children}</>;
}
