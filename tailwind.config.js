/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Club Receipt design (public/design-concepts/27-club-receipt.html).
      fontFamily: {
        display: ['var(--font-display)', 'Impact', 'Arial Narrow', 'sans-serif'],
        // Older pages still use font-bebas-neue; point it at the same display face.
        'bebas-neue': ['var(--font-display)', 'Impact', 'Arial Narrow', 'sans-serif'],
        body: ['var(--font-space-grotesk)', 'Arial', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#C52224', // receipt red
          light: '#E0474A',
          dark: '#9A1A1C',
        },
        secondary: {
          DEFAULT: '#F7F3DF', // paper
          light: '#FFFBED',
          dark: '#E6DFC2',
        },
        dark: {
          DEFAULT: '#22221E', // ink
          light: '#4A4A42',
          dark: '#11110F',
        },
        light: {
          DEFAULT: '#F7F3DF', // paper
          dark: '#EDE7CC',
        },
        club: {
          yellow: '#F4EB4A',
          blue: '#3155D9',
          'blue-dark': '#193897',
          gold: '#F8BD2B',
          sky: '#C8D6EC',
          paper: '#F7F3DF',
          slip: '#FFFBED',
          ink: '#22221E',
          red: '#C52224',
        },
      },
      boxShadow: {
        'hard-sm': '3px 3px 0 #22221E',
        hard: '6px 6px 0 #22221E',
        'hard-lg': '10px 10px 0 #22221E',
        'hard-red': '5px 5px 0 #C52224',
      },
    },
  },
  plugins: [],
};
