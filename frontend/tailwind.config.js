/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: '#16110D',
        soil: '#1F1813',
        soil2: '#2A2017',
        furrow: '#3B2E22',
        border: '#4F3A2A',
        muted: '#8E7A63',
        linen: '#F7EFD9',
        wheat: '#C79B41',
        crop: '#5A7F3D',
        accent: '#D96C2B',
        moss: '#7B8E4A',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Fraunces"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 18px 45px rgba(10, 8, 6, 0.24)',
      },
    },
  },
  plugins: [],
}
