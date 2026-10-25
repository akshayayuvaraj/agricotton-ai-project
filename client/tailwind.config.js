/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        field: {
          50: '#f4fbf5',
          100: '#e7f7eb',
          200: '#cfeecf',
          300: '#a5e0ad',
          400: '#73c86b',
          500: '#4aa85a',
          600: '#358645',
          700: '#296c38',
          800: '#22582f',
          900: '#1d4929',
        },
        soil: {
          50: '#f8f3ee',
          100: '#f1e7db',
          200: '#e1cfaf',
          300: '#d1b07a',
          400: '#c08b4c',
          500: '#ab6d2a',
          600: '#8d5624',
        },
      },
      boxShadow: {
        soft: '0 10px 25px rgba(18, 68, 40, 0.08)',
      },
    },
  },
  plugins: [],
};
