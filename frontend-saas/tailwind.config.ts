import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        metronic: {
          primary: "#3699FF",
          "primary-light": "#E1F0FF",
          success: "#1BC5BD",
          "success-light": "#C9F7F5",
          info: "#8950FC",
          "info-light": "#EEE5FF",
          warning: "#FFA800",
          "warning-light": "#FFF4DE",
          danger: "#F64E60",
          "danger-light": "#FFE2E5",
          dark: "#181C32",
          body: "#EEF0F8",
          aside: "#1e1e2d",
          "aside-hover": "#1b1b28",
          gray: {
            100: "#F3F6F9",
            200: "#EBEDF3",
            300: "#E4E6EF",
            400: "#D1D3E0",
            500: "#B5B5C3",
            600: "#7E8299",
            700: "#5E6278",
            800: "#3F4254",
            900: "#181C32"
          }
        }
      },
      boxShadow: {
        'card': '0px 0px 30px 0px rgba(82, 63, 105, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3rem', { lineHeight: '1.1', fontWeight: '700' }],
        'display-lg': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'heading-md': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'body-sm': ['0.875rem', { lineHeight: '1.6' }],
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '12px',
      },
      backgroundImage: {
        'glass': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
        'glass-dark': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};
export default config;
