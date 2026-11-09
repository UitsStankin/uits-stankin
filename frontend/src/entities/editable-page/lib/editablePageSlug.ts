import type { EditablePageSlug } from '@shared/types';

/**
 * Весь закрытый набор слагов — во время выполнения, а не только в типе.
 *
 * Понадобился с F-45: форма правки живёт по адресу `/admin/pages/{slug}`,
 * и слаг впервые приходит не из кода, а из адреса. Опечатка в адресе
 * обязана показать «раздела нет» без запроса, а не уйти на сервер.
 *
 * `Record`, а не массив: пропущенный или лишний слаг — ошибка компиляции
 * по `EditablePageSlug`, и при появлении четырнадцатого раздела этот
 * список не забудут.
 */
const SLUGS: Record<EditablePageSlug, true> = {
  'fields-of-study': true,
  contacts: true,
  'documents-department': true,
  'documents-university': true,
  'bachelor-edu-plans': true,
  'bachelor-graduate': true,
  'bachelor-practices': true,
  'master-edu-plans': true,
  'master-graduate': true,
  'master-practices': true,
  'scientific-activity-postgraduate': true,
  'home-before': true,
  'home-after': true,
};

/** Слаг из адреса — или `null`, если такого раздела в закрытом наборе нет. */
export function parseEditablePageSlug(raw: string | undefined): EditablePageSlug | null {
  return raw !== undefined && Object.hasOwn(SLUGS, raw) ? (raw as EditablePageSlug) : null;
}
