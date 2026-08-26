import { useState } from 'react';

import { getToken } from '@shared/api';
import type { Profile } from '@shared/types';

/**
 * Временная заглушка сессии. Настоящий хук — F-12: профиль поедет
 * из `GET /api/users/profile` через `useQuery(['profile'])`, вход и выход —
 * мутациями. До тех пор здесь ровно столько, сколько нужно шапке
 * и защищённым роутам, чтобы собираться и рендериться.
 *
 * Чего здесь больше нет: фальшивого «анонимного профиля» с флагом
 * `isAnonymous`. В контракте Spring неавторизованный пользователь профиля
 * не получает вовсе — `/profile` отвечает `401` (см. `shared/types/auth.types.ts`).
 * Поэтому «не вошёл» — это `profile === null`, и проверку нельзя забыть:
 * TypeScript не даст обратиться к полю, не разобрав `null`.
 *
 * Заодно уехали `login` и `logout`: они изображали запрос к несуществующим
 * ручкам, их никто не вызывал, а настоящие всё равно будут написаны заново
 * в F-12 — против контракта, а не против выдумки.
 */

/** Права выданы модераторские, иначе не увидеть пункт «Админ-панель». */
const DEMO_PROFILE: Profile = {
  id: 1,
  username: 'demo_user',
  firstName: 'Demo',
  lastName: 'User',
  email: 'demo@example.com',
  avatar: null,
  teacher: false,
  moderator: true,
  superuser: false,
};

export function useAuth() {
  // Токен читается через хранилище из shared/api, а не из localStorage
  // напрямую: ключ и место хранения — его забота, и в день появления
  // refresh-ручки (T-30) поменяются там же.
  //
  // Ленивый инициализатор, а не эффект: читать нечего, кроме одного
  // синхронного значения, а setState внутри эффекта вызывает лишний
  // каскадный рендер — на это ругается правило React Compiler.
  const [profile] = useState<Profile | null>(() => (getToken() ? DEMO_PROFILE : null));

  return {
    profile,
    isAuthenticated: profile !== null,
    /** Модератор или суперпользователь: управление новостями и файлами. */
    canEdit: profile !== null && (profile.moderator || profile.superuser),
  };
}
