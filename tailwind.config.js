/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'bebas-neue': ['var(--font-bebas-neue)'],
      },
      colors: {
        primary: {
          DEFAULT: '#B91C1C', // crimson red
          light: '#EF4444',
          dark: '#7F1D1D',
        },
        secondary: {
          DEFAULT: '#F5F5DC', // warm cream
          light: '#FFFBEB',
          dark: '#E7E5D0',
        },
        dark: {
          DEFAULT: '#171717', // black
          light: '#404040',
          dark: '#0A0A0A',
        },
        light: {
          DEFAULT: '#FFFFFF', // white
          dark: '#F3F4F6',
        }
      },
    },
  },
  plugins: [],
};
