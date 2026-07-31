/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#101B2D',
          800: '#18263D',
          700: '#223351',
          600: '#2A3B55'
        },
        parchment: '#F5F3EE',
        brass: {
          DEFAULT: '#A67C42',
          light: '#C79A5F',
          dark: '#7E5D30'
        },
        signal: {
          approve: '#2F6B4F',
          reject: '#8C2F39',
          pending: '#A67C42'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
};
