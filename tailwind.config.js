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
        'space-grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
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
        },
        maroon: {
          DEFAULT: '#8B1E24', // brand deep red
          dark: '#6E171C',
        },
        bone: {
          DEFAULT: '#F5F2DC', // brand bone white
          dark: '#E9E4C8',
        },
        charcoal: {
          DEFAULT: '#2C2C2C',
          dark: '#1F1F1F',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(23, 23, 23, 0.06), 0 4px 12px rgba(23, 23, 23, 0.06)',
        'card-hover':
          '0 2px 4px rgba(23, 23, 23, 0.08), 0 12px 28px rgba(23, 23, 23, 0.14)',
        drawer: '-8px 0 32px rgba(23, 23, 23, 0.18)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'badge-pop': {
          '0%': { transform: 'scale(0.4)' },
          '60%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        'badge-pop': 'badge-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
