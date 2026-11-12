import type { ReactNode } from 'react';
import { Pencil } from 'lucide-react';
import { Link } from 'react-router';

import type { ReturnToState } from '@shared/config/routes';

interface EditLinkProps {
  /** Адрес формы правки. */
  to: string;
  /** Куда форме вернуться после сохранения и по «Отмене» — обычно текущий адрес. */
  returnTo: string;
  children: ReactNode;
}

/**
 * Ссылка-карандаш с публичной страницы на форму правки её содержимого.
 *
 * Чистая: решение «показывать или нет» принимает вызывающий по `canEdit`,
 * здесь только ссылка и адрес возврата в состоянии перехода —
 * разбор, почему там, а не в адресе, у `ReturnToState`.
 *
 * Ссылка, а не кнопка: она ведёт на страницу со своим адресом, и её
 * естественно открыть в новой вкладке. Вид тихий, как у «К списку
 * разделов» в админке: посетитель её не видит вовсе, а модератору она
 * нужна изредка и не должна спорить с содержимым.
 */
export default function EditLink({ to, returnTo, children }: EditLinkProps) {
  const state: ReturnToState = { returnTo };

  return (
    <Link
      to={to}
      state={state}
      className="inline-flex w-fit items-center gap-1 text-base text-text-muted transition-colors hover:text-primary"
    >
      <Pencil size={16} aria-hidden />
      {children}
    </Link>
  );
}
