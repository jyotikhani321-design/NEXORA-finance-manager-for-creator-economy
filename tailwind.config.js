/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090B',      // Obsidian Black
        cardBg: '#18181B',          // Zinc Dark Gray
        cardBgSecondary: '#27272A', // Zinc Medium Gray
        accentGold: '#D4AF37',      // Champagne Gold
        accentGoldMuted: '#C5A880', // Soft bronze gold
        borderGray: '#27272A',      // Classy border
        borderGrayLight: '#3F3F46', // Highlight border
        mutedText: '#A1A1AA',       // Zinc-400 text
        whiteText: '#F4F4F6',       // Zinc-50 off-white
      },
      fontFamily: {
        serif: ['Cambria', 'Georgia', 'serif'],
        sans: ['Inter', 'Calibri', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
