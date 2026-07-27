/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        earth: '#0f172a',    // slate-900 (Main dark text/elements)
        soil: '#0f172a',     // slate-900 (Dark sidebar background)
        soil2: '#1e293b',    // slate-800 (Dark sidebar hover/accents)
        furrow: '#334155',   // slate-700
        border: '#e2e8f0',   // slate-200 (Soft borders)
        muted: '#64748b',    // slate-500 (Muted text)
        linen: '#f8fafc',    // slate-50 (Clean soft-gray background)
        wheat: '#34d399',    // emerald-400 (Secondary/light green)
        crop: '#10b981',     // emerald-500 (Vibrant brand green)
        accent: '#059669',   // emerald-600 (Primary action)
        moss: '#047857',     // emerald-700 (Darker green for hover)
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'], // Updated display font to Plus Jakarta Sans for premium feel
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(15, 23, 42, 0.05)', // Subtle modern shadow
        md: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
}
