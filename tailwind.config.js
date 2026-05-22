/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        galaxy: {
          900: '#03020a',
          800: '#07051a',
          700: '#0d0b2a',
          600: '#14103d',
          500: '#1e1660',
          400: '#2d2190',
          300: '#4a35c9',
          200: '#7b67e8',
          100: '#c4bcf5',
        },
        nebula: {
          blue: '#3b82f6',
          purple: '#8b5cf6',
          cyan: '#06b6d4',
          pink: '#ec4899',
          violet: '#7c3aed',
        },
        void: '#000208',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"DM Sans"', '"Outfit"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Sora"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(139, 92, 246, 0.3)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.4)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-sm': '0 0 8px rgba(139, 92, 246, 0.2)',
        panel: '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(139, 92, 246, 0.1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'star-twinkle': 'twinkle 4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(139, 92, 246, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.5)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
