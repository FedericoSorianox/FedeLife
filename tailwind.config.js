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
        primary: '#87ccd8',
        secondary: '#f1f1f1',
        accent: '#27ae60',
        expense: '#e74c3c',
        income: '#27ae60',
        balance: '#3498db',
        transfer: '#f39c12',
      },
    },
  },
  plugins: [],
}
