/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0f1117',
        'bg-secondary': '#1a1d27',
        'bg-card': '#1e2130',
        'accent-green': '#22c55e',
        'accent-blue': '#3b82f6',
        'accent-red': '#ef4444',
        'accent-orange': '#f97316',
        'accent-yellow': '#eab308',
        'text-primary': '#f1f5f9',
        'text-secondary': '#94a3b8',
        'border-color': '#2d3148',
      },
    },
  },
  plugins: [],
}
