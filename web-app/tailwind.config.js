/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          600: '#2563eb', // blue-600
          700: '#1d4ed8', // blue-700
        },
        secondary: {
          600: '#16a34a', // green-600
          700: '#15803d', // green-700
        },
      },
    },
  },
  plugins: [],
}

