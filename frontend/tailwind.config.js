/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vermelho da marca unificado com o app da oficina (#CC1400 "ferrari").
        brand:   { DEFAULT:'#CC1400', dark:'#A01000', deep:'#740C00', light:'#E01500' },
        bg:      { DEFAULT:'#FFFFFF', alt:'#F7F6F3' },
        surface: { DEFAULT:'#FFFFFF', 2:'#F7F6F3', 3:'#EFEDE8' },
        border:  { DEFAULT:'#E2DFD8', md:'#C7C3BA', hi:'#A8AEB6' },
        text:    { DEFAULT:'#14161A', 2:'#23272F', 3:'#3a3d44', muted:'#6B7078', subtle:'#9AA0A8', ghost:'#B6BAC0' },
        ok:      { DEFAULT:'#16803C', mid:'#22C55E', bg:'rgba(22,128,60,0.07)', border:'rgba(22,128,60,0.2)' },
        warn:    { DEFAULT:'#92400E', mid:'#F59E0B', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.22)' },
        crit:    { DEFAULT:'#CC1400', bg:'rgba(204,20,0,0.06)',                  border:'rgba(204,20,0,0.2)' },
        info:    { DEFAULT:'#1D4ED8', bg:'rgba(29,78,216,0.06)',                  border:'rgba(29,78,216,0.18)' },
        dark:    { DEFAULT:'#111111', 2:'#1A1A1A', 3:'#222222' },
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"DM Mono"', '"JetBrains Mono"', 'Menlo', 'monospace'],
        logo: ['"Fredoka"', '"DM Sans"', 'cursive'],
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
