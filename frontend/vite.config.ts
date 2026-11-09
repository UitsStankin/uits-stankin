import { loadEnv } from 'vite'
// Не из 'vite': `defineConfig` из 'vitest/config' — тот же самый,
// но знает про секцию `test` ниже и типизирует её.
import { defineConfig } from 'vitest/config'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Третий аргумент — пустой префикс: нужен VITE_API_BASE_URL, а он читается
  // здесь, в конфиге сборки, а не в браузере, где действует фильтр по VITE_.
  const env = loadEnv(mode, process.cwd(), '');

  // Куда проксировать картинки в разработке. Пустой baseURL — это прод-режим
  // (фронт и API за общим nginx), локально там всё равно нужен origin бэкенда.
  const mediaTarget = env.VITE_API_BASE_URL || 'http://localhost:8080';

  return {
    plugins: [
      react(),
      // React Compiler мемоизирует компоненты и хуки сам. Ручные memo, useMemo
      // и useCallback после этого не нужны — более того, вредны: если ручная
      // мемоизация не совпадает с выводом компилятора, он ПОЛНОСТЬЮ пропускает
      // такой компонент («Compilation Skipped»).
      //
      // Его правила линтинга в проекте уже были включены — приходят вместе
      // с eslint-plugin-react-hooks@7 в конфиге recommended. То есть мы за них
      // платили, ничего не получая взамен.
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    server: {
      proxy: {
        /**
         * Картинки новостей — на бэкенд.
         *
         * Контракт отдаёт адрес обложки **относительным** (`/media/news/...`)
         * и обещает, что браузер достроит его от текущего origin (docs/API.md,
         * «Загрузка файлов»). На проде это правда: фронт и API стоят за общим
         * nginx. В разработке — нет: origin у фронта `localhost:5173`,
         * а `/media` раздаёт Spring на `8080`, и `<img>` получил бы от Vite
         * index.html вместо картинки.
         *
         * Проксирование, а не склейка адреса в коде, выбрано потому, что
         * картинки приезжают ещё и **внутри** `content` новости — готовым
         * HTML с `<img src="/media/...">`. Переписать их на клиенте можно
         * только разбором чужой разметки; проксирование чинит оба случая разом
         * и оставляет код ровно таким, как обещает контракт.
         *
         * На отдельно стоящем dev-стенде то же самое делает nginx.
         */
        '/media': {
          target: mediaTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        // Слои FSD, сверху вниз
        '@app': path.resolve(__dirname, './src/app'),
        '@pages': path.resolve(__dirname, './src/pages'),
        '@widgets': path.resolve(__dirname, './src/widgets'),
        '@features': path.resolve(__dirname, './src/features'),
        '@entities': path.resolve(__dirname, './src/entities'),
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
    /**
     * Тесты. Конфиг общий со сборкой намеренно: алиасы FSD, плагины и разбор
     * TypeScript описаны выше ровно один раз. Отдельный конфиг тест-раннера
     * означал бы второй список тех же алиасов — и первый же добавленный
     * пришлось бы чинить дважды, причём второй раз — после падения тестов.
     */
    test: {
      // Страницы рендерятся в DOM, а запросы уходят через XHR: и то, и другое
      // даёт jsdom. Чистым функциям он не мешает.
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      // `describe`/`it`/`expect` импортируются явно. Глобалы экономят строку
      // импорта ценой того, что в файле не видно, откуда взялись имена,
      // — и требуют отдельной записи в `types` tsconfig.
      globals: false,
      env: {
        // То же, что на проде: фронт и API за общим origin. Пустая строка,
        // а не отсутствие переменной, — иначе api-клиент на каждом тесте
        // пишет в консоль предупреждение про незаданный адрес.
        VITE_API_BASE_URL: '',
      },
    },
  };
})
