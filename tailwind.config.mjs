import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./src/**/*.{astro,html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans:  ['Inter',          ...defaultTheme.fontFamily.sans],
        serif: ['Georgia',        ...defaultTheme.fontFamily.serif],
        mono:  ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body':     theme('colors.slate.700'),
            '--tw-prose-headings': theme('colors.slate.900'),
            '--tw-prose-links':    theme('colors.brand.600'),
            maxWidth:    '68ch',
            fontSize:    '1.125rem',
            lineHeight:  '1.8',
            fontFamily:  'Georgia, serif',
            'h2': {
              fontSize:   '1.5rem',
              fontWeight: '700',
              fontFamily: 'Inter, sans-serif',
              marginTop:  '2em',
            },
            'h3': {
              fontSize:   '1.25rem',
              fontWeight: '600',
              fontFamily: 'Inter, sans-serif',
            },
            'a': {
              color:                  theme('colors.brand.600'),
              textDecorationThickness:'1px',
              textUnderlineOffset:    '2px',
            },
            'code': {
              fontFamily: 'JetBrains Mono, monospace',
              fontSize:   '0.875em',
            },
            'img': { borderRadius: '8px' },
          },
        },
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
