/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0810',
          900: '#12101a',
          850: '#181523',
          800: '#1e1a2c',
          750: '#252135',
          700: '#2d2840',
          600: '#3a3450',
          500: '#4a4360',
          400: '#6b6385',
          300: '#9089a8',
          200: '#b8b2cc',
          100: '#d8d4e4',
          50: '#f0eef6',
        },
        rose: {
          50: '#fdf2f6',
          100: '#fce7ef',
          200: '#fbcfe1',
          300: '#f8a8c9',
          400: '#f275a8',
          500: '#e84d8a',
          600: '#d12e6f',
          700: '#b01f57',
          800: '#8f1a47',
          900: '#75173c',
        },
        lavender: {
          50: '#f6f3ff',
          100: '#ede8ff',
          200: '#dccfff',
          300: '#c4adff',
          400: '#a884ff',
          500: '#9362f0',
          600: '#7d44db',
          700: '#6733ba',
          800: '#552a99',
          900: '#46257d',
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
        'card-hover': '0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(232,77,138,0.15)',
        'glow': '0 0 24px rgba(232,77,138,0.15)',
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
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-smooth forwards',
        'fade-in-fast': 'fade-in-fast 0.3s ease-smooth forwards',
        'shimmer': 'shimmer 1.5s infinite linear',
        'slide-up': 'slide-up 0.6s ease-smooth forwards',
      },
    },
  },
  plugins: [],
};
