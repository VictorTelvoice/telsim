/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './contexts/**/*.{js,ts,jsx,tsx}', './hooks/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}', './screens/**/*.{js,ts,jsx,tsx}', './types/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#1d4ed8',
        'primary-dark': '#1e40af',
        'background-light': '#F8FAFC',
        'background-dark': '#0f172a',
        'surface-light': '#FFFFFF',
        'surface-dark': '#1e293b',
        'emerald-brand': '#10B981',
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        button: '0 10px 25px -5px rgba(29, 78, 216, 0.4)',
        glow: '0 0 50px -10px rgba(16, 185, 129, 0.4)',
      },
      animation: {
        scanner: 'scanner 3s linear infinite',
        'float-slow': 'float 6s ease-in-out infinite',
        'float-medium': 'float 4s ease-in-out infinite',
        'reveal-number': 'revealNumber 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideIn: 'slideIn 0.32s cubic-bezier(0.34,1.1,0.64,1) both',
      },
      keyframes: {
        scanner: {
          '0%': { transform: 'translateX(-100%) skewX(-15deg)' },
          '100%': { transform: 'translateX(250%) skewX(-15deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)', opacity: '0.6' },
          '50%': { transform: 'translateY(-15px) scale(1.1)', opacity: '1' },
        },
        revealNumber: {
          '0%': { transform: 'translateY(20px)', opacity: '0', filter: 'blur(10px)' },
          '100%': { transform: 'translateY(0)', opacity: '1', filter: 'blur(0)' },
        },
        slideIn: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
