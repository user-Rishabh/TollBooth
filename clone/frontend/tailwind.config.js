/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#003A70',
          dark: '#00284e',
          light: '#0a4f8f',
        },
        secondary: {
          DEFAULT: '#D97706',
          dark: '#b45309',
          light: '#f59e0b',
        },
        cream: {
          DEFAULT: '#FFF8E1',
          light: '#fffbf0',
          dark: '#ffecb3',
        },
        dark: {
          DEFAULT: '#212529',
          muted: '#495057',
        }
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
