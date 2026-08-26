/// <reference types="vite/client" />

/**
 * Переменные окружения, известные приложению.
 *
 * Объявление сливается с `ImportMetaEnv` от Vite, а не заменяет его.
 * Без него `import.meta.env.VITE_API_BASE_URL` имеет тип `any`: в базовом
 * интерфейсе стоит индексная сигнатура, и опечатка в имени переменной
 * молча вернула бы `undefined` вместо ошибки компиляции.
 */
interface ImportMetaEnv {
  /**
   * Origin бэкенда без хвостового слеша; пустая строка — тот же origin,
   * что у фронта.
   *
   * Тип честно допускает `undefined`: `.env` лежит в репозитории, но его
   * можно удалить или переименовать, и тогда переменной не будет. Пусть
   * об этом спорит компилятор, а не браузер в рантайме.
   */
  readonly VITE_API_BASE_URL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
