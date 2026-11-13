/** @type {import('tailwindcss').Config} */

// Runtime-themable colors use CSS variables (RGB triplets) defined in src/index.css.
// This allows GL-aligned theme presets to override the palette without recompiling.
const withAlpha = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: withAlpha('--color-ink-950'),
          900: withAlpha('--color-ink-900'),
          850: withAlpha('--color-ink-850'),
          800: withAlpha('--color-ink-800'),
          750: withAlpha('--color-ink-750'),
          700: withAlpha('--color-ink-700'),
          600: withAlpha('--color-ink-600'),
          500: withAlpha('--color-ink-500'),
          400: withAlpha('--color-ink-400'),
          300: withAlpha('--color-ink-300'),
          200: withAlpha('--color-ink-200'),
          100: withAlpha('--color-ink-100'),
          50: withAlpha('--color-ink-50'),
        },
        rose: {
          50: withAlpha('--color-rose-50'),
          100: withAlpha('--color-rose-100'),
          200: withAlpha('--color-rose-200'),
          300: withAlpha('--color-rose-300'),
          400: withAlpha('--color-rose-400'),
          500: withAlpha('--color-rose-500'),
          600: withAlpha('--color-rose-600'),
          700: withAlpha('--color-rose-700'),
          800: withAlpha('--color-rose-800'),
          900: withAlpha('--color-rose-900'),
        },
        lavender: {
          50: withAlpha('--color-lavender-50'),
          100: withAlpha('--color-lavender-100'),
          200: withAlpha('--color-lavender-200'),
          300: withAlpha('--color-lavender-300'),
          400: withAlpha('--color-lavender-400'),
          500: withAlpha('--color-lavender-500'),
          600: withAlpha('--color-lavender-600'),
          700: withAlpha('--color-lavender-700'),
          800: withAlpha('--color-lavender-800'),
          900: withAlpha('--color-lavender-900'),
        },
        magenta: {
          400: '#e040fb',
          500: '#d500f9',
          600: '#bb00f0',
        },
        success: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        error: {
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Named steps replace the ad-hoc `text-[11px]` / `text-[10px]` sizes.
      // Tracking stays a separate utility so eyebrows can tune it.
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem' }], // 11px
        caption: ['0.75rem', { lineHeight: '1.125rem' }], // 12px
        'body-sm': ['0.875rem', { lineHeight: '1.375rem' }], // 14px
        body: ['1rem', { lineHeight: '1.625rem' }], // 16px
        h3: ['1.25rem', { lineHeight: '1.625rem' }],
        h2: ['1.5rem', { lineHeight: '1.875rem' }],
        h1: ['2rem', { lineHeight: '2.375rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 2px 12px rgba(0,0,0,0.3)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgb(var(--color-rose-500) / 0.15)',
        'glow': '0 0 24px rgb(var(--color-rose-500) / 0.15)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-fast': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'hero-zoom': {
          '0%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1.12)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-smooth forwards',
        'fade-in-fast': 'fade-in-fast 0.3s ease-smooth forwards',
        'shimmer': 'shimmer 1.5s infinite linear',
        'slide-up': 'slide-up 0.6s ease-smooth forwards',
        'hero-zoom': 'hero-zoom 16s ease-out forwards',
      },
    },
  },
  plugins: [],
};
