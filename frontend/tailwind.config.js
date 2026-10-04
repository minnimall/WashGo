/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],

    theme: {
        extend: {
            keyframes: {
                fadeSlide: {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(15px) scale(0.98)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0) scale(1)',
                    },
                },

                shake: {
                    '0%, 100%': {
                        transform: 'translateX(0)',
                    },
                    '25%': {
                        transform: 'translateX(-5px)',
                    },
                    '75%': {
                        transform: 'translateX(5px)',
                    },
                },
            },

            animation: {
                fadeSlide: 'fadeSlide 0.45s ease-out',
                shake: 'shake 0.3s ease-in-out',
            },
        },
    },

    plugins: [],
}