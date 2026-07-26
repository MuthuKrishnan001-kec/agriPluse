/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0B1220',
        panel: '#101A2C',
        panel2: '#0E1626',
        border: '#22304A',
        muted: '#7C8AA5',
        ink: '#E8ECF4',
        amber: '#F5A623',
        teal: '#3FD0C9',
        rose: '#E8607A',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
