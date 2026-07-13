/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#050B1C',
          secondary: '#0B1228',
          card: '#111A33',
          elevated: '#16213E',
        },
        accent: {
          primary: '#00A8FF',
          secondary: '#00E5FF',
          ai: '#8B5CF6',
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
