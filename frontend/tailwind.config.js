/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand green. 600 is the working shade - it clears 5.2:1 on white,
        // so white button labels and green body links both pass AA.
        primary: {
          50: '#f1f8f4',
          100: '#dcefe4',
          200: '#bbdfca',
          300: '#8fc8a8',
          400: '#5faa83',
          500: '#3a8f65',
          600: '#2a7a56',
          700: '#216248',
          800: '#1c4f3b',
          900: '#174131',
        },
        // Warm sand, used sparingly: the logo accent, a highlighted word.
        // Green and sand is a far quieter pairing than green and magenta.
        secondary: {
          50: '#fdf8ef',
          100: '#f9edd7',
          200: '#f1d9ae',
          300: '#e6bf7d',
          400: '#d9a452',
          500: '#c88d35',
          600: '#ab722a',
          700: '#895826',
          800: '#6f4724',
          900: '#5b3b20',
        },
        islamic: {
          green: '#2a7a56',
          gold: '#c88d35',
          navy: '#174131',
        }
      },
      fontFamily: {
        arabic: ['"Amiri"', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}