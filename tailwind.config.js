/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Driven by CSS variables (RGB triplets) so light/dark stay in sync.
        bg: 'rgb(var(--bg) / <alpha-value>)',
        'bg-elevated': 'rgb(var(--bg-elevated) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        content: 'rgb(var(--content) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        positive: 'rgb(var(--positive) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        // Category palette (also exposed as CSS vars for charts/treemap).
        'cat-system': 'rgb(var(--cat-system) / <alpha-value>)',
        'cat-apps': 'rgb(var(--cat-apps) / <alpha-value>)',
        'cat-user': 'rgb(var(--cat-user) / <alpha-value>)',
        'cat-docker': 'rgb(var(--cat-docker) / <alpha-value>)',
        'cat-dev': 'rgb(var(--cat-dev) / <alpha-value>)',
        'cat-media': 'rgb(var(--cat-media) / <alpha-value>)',
        'cat-temp': 'rgb(var(--cat-temp) / <alpha-value>)',
        'cat-other': 'rgb(var(--cat-other) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      fontSize: {
        // Strict type scale
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem' }],
        base: ['0.9375rem', { lineHeight: '1.5rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.3125rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.625rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
        '3xl': ['2.0625rem', { lineHeight: '2.4rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.75rem', { lineHeight: '3rem', letterSpacing: '-0.03em' }]
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px'
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        popover: 'var(--shadow-popover)',
        glow: 'var(--shadow-glow)'
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' }
        }
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite'
      }
    }
  },
  plugins: []
}
