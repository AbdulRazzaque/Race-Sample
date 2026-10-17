import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0F2642',
          800: '#173B65', // Primary navy
          700: '#204C7E',
          600: '#285783', // Secondary blue
          500: '#3571A8',
          100: '#E9EFF6',
          50: '#F2F6FA',
        },
        brand: {
          navy: '#173B65',
          blue: '#285783',
          red: '#E53935',
          darkRed: '#B71C1C',
          bg: '#F5F7FA',
          card: '#FFFFFF',
          text: '#1F2937',
          muted: '#64748B',
          border: '#D9E0E8',
        },
        status: {
          posText: '#047857',
          posBg: '#ECFDF5',
          posBorder: '#A7F3D0',
          negText: '#475569',
          negBg: '#F1F5F9',
          negBorder: '#CBD5E1',
          accentRed: '#E53935',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'sans-serif'],
        arabic: ['Cairo', 'Amiri', 'Traditional Arabic', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        elevated: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
