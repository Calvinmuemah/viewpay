/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        darkBg: '#0f172a', // Slate 900
        darkCard: '#1e293b', // Slate 800
        primaryNeon: '#38bdf8', // Sky 400
        secondaryNeon: '#818cf8', // Indigo 400
        accentGreen: '#34d399', // Emerald 400
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
