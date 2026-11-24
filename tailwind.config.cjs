/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: { colors: { nothing: { red: '#D71921', black: '#000000', graphite: '#111111' } } } },
  plugins: [],
}
