/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Tudo por token (claro/escuro em src/index.css).
        brand:   { DEFAULT:'var(--tint)', dark:'var(--brand-dark)', deep:'var(--brand-deep)', light:'var(--brand-light)' },
        bg:      { DEFAULT:'var(--bg)', alt:'var(--card-2)' },
        surface: { DEFAULT:'var(--card)', 2:'var(--card-2)', 3:'var(--fill)' },
        border:  { DEFAULT:'var(--sep)', md:'var(--sep)', hi:'var(--text-3)' },
        text:    { DEFAULT:'var(--text)', 2:'var(--text)', 3:'var(--text-2)', muted:'var(--text-2)', subtle:'var(--text-3)', ghost:'var(--text-3)' },
        ok:      { DEFAULT:'var(--green)', mid:'var(--green)', bg:'var(--green-soft)', border:'var(--green-soft)' },
        warn:    { DEFAULT:'var(--orange)', mid:'var(--orange)', bg:'var(--orange-soft)', border:'var(--orange-soft)' },
        crit:    { DEFAULT:'var(--red)', bg:'var(--red-soft)', border:'var(--red-soft)' },
        info:    { DEFAULT:'var(--blue)', bg:'var(--blue-soft)', border:'var(--blue-soft)' },
        fill:    { DEFAULT:'var(--fill)' },
        sep:     { DEFAULT:'var(--sep)' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"DM Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
        logo: ['"Fredoka"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xs:'4px', sm:'8px', md:'12px', lg:'16px', xl:'22px', '2xl':'28px' },
      boxShadow: {
        xs:    '0 1px 2px rgba(0,0,0,0.06)',
        sm:    '0 1px 6px rgba(0,0,0,0.07),0 1px 2px rgba(0,0,0,0.04)',
        md:    '0 4px 16px rgba(0,0,0,0.08),0 2px 4px rgba(0,0,0,0.04)',
        lg:    '0 8px 32px rgba(0,0,0,0.10),0 4px 8px rgba(0,0,0,0.05)',
        xl:    '0 16px 48px rgba(0,0,0,0.13),0 8px 16px rgba(0,0,0,0.06)',
        brand: '0 4px 20px rgba(204,20,0,0.30),0 2px 6px rgba(204,20,0,0.15)',
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
        xs:    ['0.72rem', { lineHeight: '1.1rem' }],
        sm:    ['0.82rem', { lineHeight: '1.3rem' }],
        base:  ['0.93rem', { lineHeight: '1.5rem' }],
        lg:    ['1.05rem', { lineHeight: '1.5rem' }],
        xl:    ['1.2rem',  { lineHeight: '1.4rem' }],
        '2xl': ['1.4rem',  { lineHeight: '1.3rem' }],
        '3xl': ['1.7rem',  { lineHeight: '1.2rem' }],
      },
    },
  },
  plugins: [],
};
