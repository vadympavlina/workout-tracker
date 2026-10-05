/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        elevated: 'rgb(var(--c-elevated) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        subtle: 'rgb(var(--c-subtle) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        'accent-strong': 'rgb(var(--c-accent-strong) / <alpha-value>)',
        positive: 'rgb(var(--c-positive) / <alpha-value>)',
        negative: 'rgb(var(--c-negative) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        // Fixed metric colours (Apple-Fitness-style rings): identity never changes with the accent.
        move: 'rgb(var(--c-move) / <alpha-value>)',
        volume: 'rgb(var(--c-volume) / <alpha-value>)',
        sets: 'rgb(var(--c-sets) / <alpha-value>)',
        body: 'rgb(var(--c-body) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Geist Variable"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '24px',
        ctl: '16px',
      },
      boxShadow: {
        card: 'inset 0 1px 0 0 rgb(255 255 255 / 0.05), 0 12px 32px -16px rgb(0 0 0 / 0.8)',
        glow: '0 8px 28px -6px rgb(var(--c-accent) / 0.45)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'pop': { '0%': { transform: 'scale(0.6)', opacity: 0 }, '60%': { transform: 'scale(1.12)', opacity: 1 }, '100%': { transform: 'scale(1)' } },
        'shimmer': { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'rise': { '0%': { transform: 'translateY(0) scale(1)', opacity: 1 }, '100%': { transform: 'translateY(-60px) scale(0.6)', opacity: 0 } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgb(var(--c-accent) / 0.45)' }, '100%': { boxShadow: '0 0 0 14px rgb(var(--c-accent) / 0)' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'slide-up': 'slide-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'sheet-up': 'sheet-up 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        pop: 'pop 420ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        shimmer: 'shimmer 1.6s linear infinite',
        rise: 'rise 1.4s ease-out forwards',
        'pulse-ring': 'pulse-ring 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
};
