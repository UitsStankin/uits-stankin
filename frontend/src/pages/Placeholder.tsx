/**
 * ВРЕМЕННАЯ заглушка вместо ещё не перенесённой страницы.
 *
 * Удаляется вместе с последним роутом, который её использует,
 * по мере переноса страниц со старого Angular-портала.
 */
export default function Placeholder({ title }: { title: string }) {
  return <div className="p-4">{title}</div>;
}
