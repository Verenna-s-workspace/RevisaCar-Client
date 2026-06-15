/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand:   { DEFAULT:'#CC1400', dark:'#A81100', deep:'#6B0900', light:'#FF3320' },
        bg:      { DEFAULT:'#F5F4F1', alt:'#FAFAF8' },
        surface: { DEFAULT:'#FFFFFF', 2:'#F8F7F4', 3:'#F0EEE9' },
        border:  { DEFAULT:'#E8E5DE', md:'#D8D4CB', hi:'#C8C3B8' },
        text:    { DEFAULT:'#18171A', 2:'#38363A', 3:'#5E5B60', muted:'#817E84', subtle:'#A09DA4', ghost:'#C8C5CC' },
        ok:      { DEFAULT:'#166534', mid:'#16A34A', bg:'rgba(22,101,52,0.07)', border:'rgba(22,101,52,0.18)' },
        warn:    { DEFAULT:'#92400E', mid:'#D97706', bg:'rgba(146,64,14,0.07)',  border:'rgba(146,64,14,0.18)' },
        crit:    { DEFAULT:'#CC1400', bg:'rgba(204,20,0,0.055)',                 border:'rgba(204,20,0,0.18)' },
        info:    { DEFAULT:'#1D4ED8', bg:'rgba(29,78,216,0.06)',                 border:'rgba(29,78,216,0.18)' },
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        logo: ['"Fredoka"', 'cursive'],
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
