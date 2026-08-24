import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
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
})
