import forms from '@tailwindcss/forms';
import typography from '@tailwindcss/typography';
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // === ЦВЕТА ===
      colors: {
        // Gray scale из $gray-100...$gray-900
        gray: {
          100: '#f3f7f9',
          200: '#ebf3f8',
          300: '#dce6ed',
          400: '#ccdfea',
          500: '#a7c1d2',
          600: '#7d9eb5',
          700: '#486f88',
          800: '#343a40',
          900: '#00174c', // Ваш тёмно-синий "black"
        },
        // Brand colors
        blue: '#11a1fd',
        indigo: '#5a75f9',
        purple: '#6f42c1',
        pink: '#e83e8c',
        red: '#f46363',
        orange: '#ff9842',
        yellow: '#FFC833',
        green: '#00c569',
        teal: '#2ED477',
        cyan: '#5dcebc',
        // Theme colors (Bootstrap-style)
        primary: '#11a1fd',    // $blue
        secondary: '#e4eef5',  // $secondary
        success: '#00c569',    // $green
        info: '#5a75f9',       // $indigo
        warning: '#ff9842',    // $orange
        danger: '#f46363',     // $red
        light: '#f3f7f9',      // $gray-100
        dark: '#343a40',       // $gray-800
        // Фон и текст
        background: {
          default: '#f3f7f9',  // $body-bg
        },
        text: {
          default: '#486f88',  // $body-color
          heading: '#00174c',  // $headings-color
          muted: '#7d9eb5',    // $text-muted
        },
      },

      // === ШРИФТЫ ===
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        // $font-size-base: 0.875rem (14px)
        sm: ['0.765rem', { lineHeight: '1.25' }],  // $font-size-sm
        base: ['0.875rem', { lineHeight: '1.5' }],  // $font-size-base
        lg: ['1.094rem', { lineHeight: '2' }],      // $font-size-lg
        // Headings ($font-size-base * multiplier)
        h1: ['2.188rem', { lineHeight: '1.2', fontWeight: '600' }], // 0.875 * 2.5
        h2: ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }],  // 0.875 * 2
        h3: ['1.531rem', { lineHeight: '1.2', fontWeight: '600' }], // 0.875 * 1.75
        h4: ['1.313rem', { lineHeight: '1.2', fontWeight: '600' }], // 0.875 * 1.5
        h5: ['1.05rem', { lineHeight: '1.2', fontWeight: '600' }],  // 0.875 * 1.2
        h6: ['0.875rem', { lineHeight: '1.2', fontWeight: '600' }], // 0.875 * 1
      },
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        bold: '600',
        bolder: '700',
      },

      // === BREAKPOINTS ===
      // Ваши: xs:0, sm:576, md:768, lg:992, xl:1200, xxl:1440
      screens: {
        xs: '0px',
        sm: '576px',
        md: '768px',
        lg: '992px',
        xl: '1200px',
        xxl: '1440px',
      },

      // === ОТСТУПЫ И РАЗМЕРЫ ===
      spacing: {
        // Layout variables
        'header': '4.375rem',    // 70px - $header-nav-height
        'sidebar': '17.5rem',    // 280px - $side-nav-width
        'sidebar-collapsed': '4rem', // 64px - $side-nav-collapse-width
        'sidebar-folded': '5rem',    // 80px - $side-nav-folded
        'gutter': '1.5625rem',   // 25px - $layout-content-gutter
        'gutter-sm': '0.9375rem',// 15px - $layout-content-gutter-sm
        'footer': '4.0625rem',   // 65px - $footer-height
      },

      // === ГРАНИЦЫ ===
      borderRadius: {
        DEFAULT: '0.375rem',  // 6px - $border-radius
        lg: '0.5rem',         // 8px - $border-radius-lg
        sm: '0.2rem',         // 3px - $border-radius-sm
        pill: '50rem',        // $rounded-pill
      },
      borderWidth: {
        DEFAULT: '1px',
        2: '2px', // Для инпутов/кнопок ($input-btn-border-width)
      },
      borderColor: {
        DEFAULT: '#edf4f9', // $border-color
      },

      // === ТЕНИ ===
      boxShadow: {
        DEFAULT: '0 0.5rem 1rem rgba(0, 0, 0, 0.15)',      // $box-shadow
        sm: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',     // $box-shadow-sm
        lg: '0 1rem 3rem rgba(0, 0, 0, 0.175)',            // $box-shadow-lg
        inner: 'inset 0 1px 2px rgba(0, 0, 0, 0.075)',     // $box-shadow-inset
      },

      // === Z-INDEX ===
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        modalBackdrop: '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
      },

      // === АНИМАЦИИ ===
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },

      // === ТАБЛИЦЫ ===
      // Для .markdown-content table
      table: {
        borderColor: '#ddd',
        stripedBg: 'rgba(72, 111, 136, 0.05)', // $gray-700 с прозрачностью
        hoverBg: 'rgba(204, 223, 234, 0.15)',  // $gray-400 с прозрачностью
      },
    },
  },
  plugins: [
    forms,
    typography, 
  ],
}