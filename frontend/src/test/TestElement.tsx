import { createContext, use, type ReactNode } from 'react';

/**
 * Проверяемый элемент — через контекст, а не прямо в описании маршрута:
 * маршруты тестового роутера заданы один раз (`renderWithProviders`),
 * а `rerender` приносит новый элемент, и он должен дойти до экрана.
 */
const TestElementContext = createContext<ReactNode>(null);

export function TestElement({ value, children }: { value: ReactNode; children: ReactNode }) {
  return <TestElementContext value={value}>{children}</TestElementContext>;
}

export function TestOutlet() {
  return use(TestElementContext);
}
