import forms from '@tailwindcss/forms';

/**
 * Supernatural Life Church ("SLC Household") design system — see /Brand_Design.md.
 *
 * - `gray` is remapped to the guide's neutral foundation (#F5F5F5 canvas, #E5E5E5 hairlines,
 *   #737373 metadata, #171717 body text), so every existing `gray-*` class picks up the brand
 *   neutrals without per-file edits.
 * - `brand` is the flame-orange family. `brand-400` is the guide's identity flame (#F47F36) used
 *   for focus/active/progress accents; `brand-500` is a deeper ember (#C2410C) used for filled
 *   buttons and orange text, because white-on-#F47F36 is only 2.6:1 and fails WCAG AA.
 * - `accent` is the radiant gold family; `accent-400` is the guide's primary amber (#FBB24A).
 * - `success`/`warning`/`critical`/`info` are the guide's semantic status tokens.
 */

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
        // Neutral foundation (guide: surface-canvas / border-card / text-*).
        gray: {
          50: '#FAFAFA', // table row hover
          100: '#F5F5F5', // surface-canvas
          200: '#E5E5E5', // border-card (hairlines)
          300: '#D4D4D4', // hover borders, checkbox borders
          400: '#A3A3A3', // text-muted (placeholder / disabled)
          500: '#737373', // text-secondary (metadata, timestamps)
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717', // text-primary (body copy)
          950: '#0A0A0A',
        },
        // Flame orange (logo disc → ember).
        brand: {
          50: '#FFF6EF',
          100: '#FFEADB',
          200: '#FDD2B3',
          300: '#F9AE7D',
          400: '#F47F36', // identity flame — accents, focus, progress (not for text/fills with white)
          500: '#C2410C', // ember — filled buttons, links, active text (5.2:1 with white)
          600: '#A8380A', // ember hover (~8% darker)
          700: '#8A2F0B',
          800: '#6B260C',
          900: '#4A1B09',
        },
        // Radiant gold (logo highlight).
        accent: {
          50: '#FFFBEB', // brand-amber-subtle
          100: '#FFF1D6',
          200: '#FFE0AC',
          300: '#FDCB7A',
          400: '#FBB24A', // primary amber — identity marker, focus halo
          500: '#F29A1E',
          600: '#D17E0C',
          700: '#A0590A',
          800: '#844C0E',
          900: '#603A0F',
        },
        flame: {
          orange: '#F47F36',
          red: '#F15E3A',
        },
        success: { DEFAULT: '#15803D', subtle: '#F0FDF4', border: '#BBF7D0' },
        // Warning text uses amber-700 (#B45309): the guide's #D97706 is only 3.1:1 on its own subtle bg.
        warning: { DEFAULT: '#D97706', text: '#B45309', subtle: '#FFFBEB', border: '#FDE68A' },
        critical: { DEFAULT: '#DC2626', subtle: '#FEF2F2', border: '#FECACA' },
        info: { DEFAULT: '#2563EB', subtle: '#EFF6FF', border: '#BFDBFE' },
      },
      fontFamily: {
        // Guide: typography is powered exclusively by Inter.
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Guide type scale (use for new UI; existing text-* classes still work).
        'display-lg': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'display-lg-mobile': ['26px', { lineHeight: '32px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['24px', { lineHeight: '32px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.005em', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        'body-md': ['14px', { lineHeight: '20px' }],
        'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        'label-lg': ['14px', { lineHeight: '20px', letterSpacing: '0.005em', fontWeight: '600' }],
        'label-md': ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-sm': ['11px', { lineHeight: '14px', letterSpacing: '0.02em', fontWeight: '600' }],
      },
      borderRadius: {
        // card 8px · input/button 6px · status tag 4px
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // The guide caps container radii at 8px; keep the larger keys from drifting rounder.
        xl: 'var(--radius)',
        '2xl': 'var(--radius)',
      },
      boxShadow: {
        // Planar elevation model — hairlines first, shadows barely there.
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // level 1: cards
        DEFAULT: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)', // level 2: hover, menus
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)', // level 3: modals
        xl: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.05)',
        focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #FBB24A', // amber halo
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [forms],
};
