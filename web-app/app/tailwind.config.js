/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#FF5A5E', // Primary จริง (ตรงกับเว็บ)
          dark: '#E84D51',
          soft: '#FFE7E8',
        },
        surface: {
          0: '#F6F7F9',
          1: '#FFFFFF',
          2: '#F1F2F5',
        },
        ink: {
          DEFAULT: '#1A1C1E',
          soft: '#6B7280',
          mute: '#9CA3AF',
        },
        line: '#E8EAED',
        subject: {
          english: '#E6F1FB',
          'english-ink': '#185FA5',
          thai: '#FBEAF0',
          'thai-ink': '#993556',
          math: '#FBEEDC',
          'math-ink': '#9A5B0B',
          science: '#EEEDFE',
          'science-ink': '#534AB7',
        },
        live: '#E24B4A',
        premium: '#7F77DD',
        success: '#1D9E75',
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [],
}
