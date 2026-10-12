import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hocs/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/utils/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'dark-main': '#0D1117',
        'dark-bg': '#161B22',
        'dark-second': '#21262D',
        'dark-third': '#30363D',
        dark: '#161B22',
        'dark-border': '#5B6473',
        'dark-txt': '#C9D1D9',
        'dark-txt-secondary': '#AAB2BB',
        'dark-primary': '#5046e4',
        'dark-accent': '#c7d2fe',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '100%',
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            a: { textUnderlineOffset: '3px' },
            pre: { borderRadius: '0.75rem', fontSize: '0.875em' },
            blockquote: { fontStyle: 'normal', fontWeight: '500' },
          },
        },
      },
    },
  },
  plugins: [typography],
} satisfies Config;
