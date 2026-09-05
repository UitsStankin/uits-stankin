import { z } from 'zod';

import type { Profile, ProfileUpdateRequest } from '@shared/types';

/**
 * Проверки формы профиля — ровно те, что на бэкенде: у имени и фамилии
 * предельная длина в 150 символов, и больше ничего. Правил сверх серверных
 * нет намеренно, по тому же правилу, что у карточки ППС: форма не должна
 * запрещать то, что сервер разрешает.
 *
 * В частности, `min(1)` здесь нет и быть не может: контракт объявляет оба
 * поля необязательными и пустое значение принимает — очистка имени
 * это разрешённая операция, а не недозаполненная форма. Логин у учётной
 * записи есть всегда, и безымянный профиль ничего не ломает.
 *
 * Ключа аватара среди полей нет: он живёт не в форме, а в состоянии
 * загрузки (`useProfileForm`), и в тело запроса попадает на границе —
 * в `formValuesToRequest`.
 */
export const profileSchema = z.object({
  lastName: z.string().trim().max(150, 'Не длиннее 150 символов'),
  firstName: z.string().trim().max(150, 'Не длиннее 150 символов'),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

/**
 * Поля, которые форма умеет подсветить, — по ним раскладывается словарь
 * `errors` из ответа сервера. Имена совпадают с контрактом один в один,
 * поэтому серверная валидация ложится на те же поля, что и своя.
 *
 * `avatar` в списке нет: у него не текстовое поле, и негодный ключ бэкенд
 * шлёт без словаря — одним `detail`.
 */
export const PROFILE_FIELDS = ['lastName', 'firstName'] as const;

/** Профиль → значения формы: `null` контракта становится пустой строкой. */
export function profileToFormValues(profile: Profile): ProfileFormValues {
  return {
    lastName: profile.lastName ?? '',
    firstName: profile.firstName ?? '',
  };
}

/**
 * Значения формы → тело `PUT`. Ключ аватара приходит отдельным аргументом:
 * в полях формы его нет.
 *
 * Все три поля отправляются всегда, включая нетронутые: `PUT` — полная
 * замена, и не прислать поле значит его очистить.
 *
 * Пустые строки становятся `null` здесь, на границе запроса. Контракт
 * считает `""` равносильным `null` и сам бы справился, но тело запроса,
 * в котором незаполненное поле выглядит как незаполненное, читается
 * в сетевой вкладке без сверки с документацией.
 */
export function formValuesToRequest(
  values: ProfileFormValues,
  avatar: string | null,
): ProfileUpdateRequest {
  return {
    lastName: emptyToNull(values.lastName),
    firstName: emptyToNull(values.firstName),
    avatar,
  };
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}
