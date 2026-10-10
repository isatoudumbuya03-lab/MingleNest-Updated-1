/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)', muted: 'var(--muted)', forest: 'var(--forest)', sage: 'var(--sage)', cream: 'var(--cream)', surface: 'var(--surface)', line: 'var(--line)',
      },
      fontFamily: { display: ['Fraunces', 'Georgia', 'serif'], sans: ['DM Sans', 'sans-serif'] },
      boxShadow: { soft: '0 4px 15px rgba(80, 48, 37, .08)' },
      borderRadius: { soft: '0.875rem' },
    },
  },
  plugins: [],
}
