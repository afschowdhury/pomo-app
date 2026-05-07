declare const _default: {
    content: string[];
    theme: {
        extend: {
            colors: {
                canvas: string;
                ink: string;
                mist: string;
                blush: string;
                brass: string;
                pine: string;
                dusk: string;
            };
            boxShadow: {
                editorial: string;
                glow: string;
            };
            backgroundImage: {
                grain: string;
            };
            fontFamily: {
                display: [string, string];
                sans: [string, string];
            };
            animation: {
                drift: string;
                appear: string;
            };
            keyframes: {
                drift: {
                    '0%, 100%': {
                        transform: string;
                    };
                    '50%': {
                        transform: string;
                    };
                };
                appear: {
                    from: {
                        opacity: string;
                        transform: string;
                    };
                    to: {
                        opacity: string;
                        transform: string;
                    };
                };
            };
        };
    };
    plugins: never[];
};
export default _default;
