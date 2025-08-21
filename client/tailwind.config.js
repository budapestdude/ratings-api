/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        fide: {
          blue: '#002147',
          gold: '#FFD700',
          light: '#E8F1F8',
          gray: '#8B8B8B',
        }
      }
    },
  },
  plugins: [],
}