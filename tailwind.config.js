export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                canvas: '#f5efe4',
                ink: '#1d261f',
                mist: '#ece1d1',
                blush: '#c8745d',
                brass: '#8f6f3d',
                pine: '#294238',
                dusk: '#3b4b44',
            },
            boxShadow: {
                editorial: '0 20px 70px rgba(31, 34, 24, 0.12)',
                glow: '0 18px 40px rgba(200, 116, 93, 0.16)',
            },
            backgroundImage: {
                grain: "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.65), transparent 28%), radial-gradient(circle at 80% 10%, rgba(200,116,93,0.16), transparent 24%), radial-gradient(circle at 50% 120%, rgba(41,66,56,0.18), transparent 40%)",
            },
            fontFamily: {
                display: ['Fraunces', 'serif'],
                sans: ['"Plus Jakarta Sans"', 'sans-serif'],
            },
            animation: {
                drift: 'drift 16s ease-in-out infinite',
                appear: 'appear 700ms ease-out both',
            },
            keyframes: {
                drift: {
                    '0%, 100%': { transform: 'translate3d(0,0,0)' },
                    '50%': { transform: 'translate3d(0,-10px,0)' },
                },
                appear: {
                    from: { opacity: '0', transform: 'translateY(12px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
        },
    },
    plugins: [],
};
