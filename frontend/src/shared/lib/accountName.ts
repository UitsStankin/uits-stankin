import type { UserDirectoryEntry } from '@shared/types';

/**
 * Подпись учётной записи: «Фамилия Имя», а без них — хотя бы номер учётки.
 *
 * ФИО у учётки необязательно — обе строки бывают `null`, — и пустая
 * подпись в выпадающем списке или в списке назначенных выглядела бы
 * как ошибка вёрстки.
 *
 * Общая, потому что учётка в форме `{ id, lastName, firstName }` приходит
 * в двух местах: справочник для формы карточки ППС и владелец с назначенными
 * у события календаря. Две копии разошлись бы на первой правке подписи.
 */
export function accountName(account: UserDirectoryEntry): string {
  const name = [account.lastName, account.firstName].filter(Boolean).join(' ');

  return name === '' ? `Учётная запись № ${String(account.id)}` : name;
}
