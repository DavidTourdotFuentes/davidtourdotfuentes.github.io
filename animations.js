tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: {
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
                }
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui'],
            },
            animation: {
                'fade-in': 'fadeIn 0.8s ease-out forwards',
                'fade-in-fast': 'fadeIn 0.4s ease-out forwards',
                'slide-up': 'slideUp 0.8s ease-out forwards',
                'slide-right': 'slideRight 0.8s ease-out forwards',
                'scale-in': 'scaleIn 0.6s ease-out forwards',
                'scale-in-fast': 'scaleIn 0.3s ease-out forwards',
                'wave': 'wave 3s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'border-pulse': 'borderPulse 3s ease-in-out infinite',
                'text-glow': 'textGlow 3s ease-in-out infinite',
                'cursor-pulse': 'cursorPulse 2s ease-in-out infinite',
                'fade-out': 'fadeOut 0.3s ease-out forwards',
                'scale-out': 'scaleOut 0.3s ease-out forwards'
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(100px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                },
                slideRight: {
                    '0%': { transform: 'translateX(-30px)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                scaleIn: {
                    '0%': { transform: 'scale(0.95)', opacity: '0' },
                    '100%': { transform: 'scale(1)', opacity: '1' },
                },
                wave: {
                    '0%, 100%': { transform: 'rotate(0deg)' },
                    '25%': { transform: 'rotate(5deg)' },
                    '75%': { transform: 'rotate(-5deg)' },
                },
                pulse: {
                    '0%, 100%': { 'border-color': '#334155' },
                    '50%': { 'border-color': '#38bdf8' },
                },
                borderPulse: {
                    '0%, 100%': { 'border-color': '#334155' },
                    '50%': { 'border-color': '#38bdf8' },
                },
                textGlow: {
                    '0%, 100%': { 'text-shadow': '0 0 0 rgba(56, 189, 248, 0)' },
                    '50%': { 'text-shadow': '0 0 10px rgba(56, 189, 248, 0.5)' },
                },
                cursorPulse: {
                    '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
                    '50%': { transform: 'scale(1.5)', opacity: '0.3' },
                },
                fadeOut: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' },
                },
                scaleOut: {
                    '0%': { transform: 'scale(1)', opacity: '1' },
                    '100%': { transform: 'scale(0.95)', opacity: '0' },
                }
            }
        }
    }
}