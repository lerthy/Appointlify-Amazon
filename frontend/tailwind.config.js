/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-light': 'var(--primary-light)',
        accent: 'var(--accent)',
        background: 'var(--background)',
        card: 'var(--card-bg)',
        surface: 'var(--surface)',
        muted: 'var(--muted)',
        navy: {
          950: '#0a0f1a',
          900: '#0d1526',
          800: '#111d35',
          700: '#162a4a',
          600: '#1c3660',
          500: '#234478',
        },
        steel: {
          400: '#6b8cae',
          300: '#89a8c8',
          200: '#a8c4de',
          100: '#d1e0ed',
          50:  '#eaf1f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translate(-50%, -10px)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in-down': 'fade-in-down 0.3s ease-out',
      },
      boxShadow: {
        'ghost': '0 1px 3px 0 rgba(10,15,26,0.04), 0 1px 2px -1px rgba(10,15,26,0.06)',
        'ghost-md': '0 4px 12px -2px rgba(10,15,26,0.06), 0 2px 6px -2px rgba(10,15,26,0.04)',
        'ghost-lg': '0 10px 30px -6px rgba(10,15,26,0.08), 0 4px 12px -4px rgba(10,15,26,0.04)',
        'ghost-xl': '0 20px 50px -10px rgba(10,15,26,0.12), 0 8px 20px -8px rgba(10,15,26,0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
};
