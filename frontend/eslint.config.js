import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // public/ отдаётся как есть и содержит сгенерированные файлы —
  // mockServiceWorker.js создаётся командой `msw init` и правится только ею.
  globalIgnores(['dist', 'public']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // exhaustive-deps написано до React Compiler и про него не знает.
      // Оно требует оборачивать функции в useCallback, чтобы массив
      // зависимостей эффекта не менялся, — но компилятор делает это сам.
      // В его выводе видно, что и функция, и сам массив берутся из кэша:
      //
      //   if ($[3] === Symbol.for("react.memo_cache_sentinel")) {
      //     t4 = [cancel];
      //   }
      //   useEffect(t3, t4);
      //
      // То есть предупреждения правила — ложные, а вечные ложные
      // предупреждения приучают не читать вывод линтера.
      'react-hooks/exhaustive-deps': 'off',

      // Вместо него компиляторное правило: проверяет, что зависимости
      // эффекта действительно мемоизированы.
      'react-hooks/memoized-effect-dependencies': 'error',
    },
  },
])
