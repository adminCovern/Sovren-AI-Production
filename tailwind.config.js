/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SOVREN AI Neural War Terminal Color Palette
        neural: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        executive: {
          // CEO - Authority Red
          ceo: '#dc2626',
          'ceo-glow': '#fca5a5',
          // CFO - Financial Gold
          cfo: '#d97706',
          'cfo-glow': '#fcd34d',
          // CTO - Tech Blue
          cto: '#2563eb',
          'cto-glow': '#93c5fd',
          // CMO - Creative Purple
          cmo: '#9333ea',
          'cmo-glow': '#c4b5fd',
          // COO - Operational Green
          coo: '#059669',
          'coo-glow': '#6ee7b7',
          // CHRO - Human Teal
          chro: '#0891b2',
          'chro-glow': '#67e8f9',
          // CLO - Legal Gray
          clo: '#4b5563',
          'clo-glow': '#d1d5db',
          // CSO - Strategic Orange
          cso: '#ea580c',
          'cso-glow': '#fdba74',
        },
        hologram: {
          primary: '#06b6d4',
          secondary: '#8b5cf6',
          accent: '#f59e0b',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          glow: 'rgba(6, 182, 212, 0.3)',
        },
        approval: {
          pending: '#f59e0b',
          approved: '#10b981',
          denied: '#ef4444',
          escalated: '#8b5cf6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'neural-flow': 'neural-flow 3s linear infinite',
        'orbital-rotation': 'orbital-rotation 10s linear infinite',
        'hologram-flicker': 'hologram-flicker 0.1s ease-in-out infinite',
        'executive-breathe': 'executive-breathe 4s ease-in-out infinite',
        'voice-wave': 'voice-wave 1s ease-in-out infinite',
        'approval-orbit': 'approval-orbit 8s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            boxShadow: '0 0 20px currentColor',
          },
          '50%': {
            opacity: '0.8',
            boxShadow: '0 0 40px currentColor',
          },
        },
        'neural-flow': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0',
          },
          '50%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateX(100%)',
            opacity: '0',
          },
        },
        'orbital-rotation': {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
        'hologram-flicker': {
          '0%, 100%': {
            opacity: '0.9',
          },
          '50%': {
            opacity: '1',
          },
        },
        'executive-breathe': {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.02)',
          },
        },
        'voice-wave': {
          '0%, 100%': {
            transform: 'scaleY(1)',
          },
          '50%': {
            transform: 'scaleY(1.5)',
          },
        },
        'approval-orbit': {
          '0%': {
            transform: 'rotate(0deg) translateX(100px) rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg) translateX(100px) rotate(-360deg)',
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'neural-glow': '0 0 20px rgba(6, 182, 212, 0.5)',
        'executive-glow': '0 0 30px currentColor',
        'hologram': '0 0 40px rgba(139, 92, 246, 0.3)',
        'approval-urgent': '0 0 50px rgba(245, 158, 11, 0.6)',
      },
      backgroundImage: {
        'neural-gradient': 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
        'executive-gradient': 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)',
        'hologram-gradient': 'linear-gradient(45deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
