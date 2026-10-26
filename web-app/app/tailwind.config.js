import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Noto Sans Thai"', 'system-ui', 'sans-serif'],
      },
      colors: {
        /* ── โทเคนแบรนด์เดิม (คงไว้ให้โค้ดเดิมทำงานได้ระหว่างย้ายไป shadcn) ── */
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

        /* ── โทเคน shadcn (อ้าง CSS variable ใน index.css — map เข้าสีแบรนด์) ── */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        card: '16px',
        pill: '999px',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
