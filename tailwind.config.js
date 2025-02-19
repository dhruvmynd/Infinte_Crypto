/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        wiggle: 'wiggle 0.3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'translate(-50%, -50%) rotate(0deg)' },
          '25%': { transform: 'translate(-50%, -50%) rotate(-2deg)' },
          '75%': { transform: 'translate(-50%, -50%) rotate(2deg)' },
        },
      },
    },
  },
  plugins: [],
};