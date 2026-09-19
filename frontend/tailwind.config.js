/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#090d16',
          panel: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          header: '#0b1329',
          accent: '#3b82f6',
          alert: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          muted: '#64748b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
};
