/**
 * Индикатор загрузки для Suspense-границ.
 *
 * Перенесён без изменений из app/routes/index.tsx: конфиг роутинга
 * не должен объявлять компоненты (react-refresh/only-export-components),
 * а место переиспользуемого примитива — в shared/ui.
 */
export default function Loader() {
  return <div className="loader">Загрузка...</div>;
}
