import forms from '@tailwindcss/forms';
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
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
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Derived from the Supernatural Life Church logo's flame gradient
        // (red-orange base) — see src/assets/slc-logo.png.
        brand: {
          50: '#FDF3F1',
          100: '#FBDEDB',
          200: '#F6BDB6',
          300: '#F09389',
          400: '#E95949',
          500: '#D12C1A',
          600: '#AC2415',
          700: '#881D11',
          800: '#64150C',
          900: '#400D08',
        },
        // Derived from the logo's gold/amber flame highlight.
        accent: {
          50: '#FEF7EC',
          100: '#FCEACF',
          200: '#F9D59F',
          300: '#F6C06F',
          400: '#F3AF49',
          500: '#F19C1E',
          600: '#D3840D',
          700: '#AD6C0B',
          800: '#865409',
          900: '#603C06',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [forms],
};
