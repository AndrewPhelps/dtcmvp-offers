/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': 'var(--color-bg-primary)',
        'bg-secondary': 'var(--color-bg-secondary)',
        'bg-card': 'var(--color-bg-card)',
        'bg-hover': 'var(--color-bg-hover)',
        'bg-tertiary': 'var(--color-bg-tertiary)',
        'bg-input': 'var(--color-bg-input)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        'text-muted': 'var(--color-text-muted)',
        'accent-green': 'var(--color-accent-green)',
        'accent-blue': 'var(--color-accent-blue)',
        'accent-orange': 'var(--color-accent-orange)',
        'border': 'var(--color-border)',
        'error': 'var(--color-error)',
      },
      fontFamily: {
        'grotesk': ['var(--font-space-grotesk)', 'sans-serif'],
        'mono': ['var(--font-space-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
