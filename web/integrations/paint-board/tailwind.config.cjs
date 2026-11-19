const upstream = require("./vendor/tailwind.config.cjs");

module.exports = {
    ...upstream,
    content: { relative: true, files: ["./index.html", "./vendor/src/**/*.{jsx,js,ts,tsx}", "./adapter/**/*.{ts,tsx}"] },
    theme: {
        ...upstream.theme,
        extend: {
            ...upstream.theme.extend,
            colors: {
                slate: {
                    50: "var(--studio-surface-raised)",
                    100: "var(--studio-page)",
                    200: "var(--studio-surface-hover)",
                    300: "var(--studio-line-strong)",
                    400: "var(--studio-muted)",
                    500: "var(--studio-muted)",
                    600: "var(--studio-text)",
                    700: "var(--studio-text)",
                    800: "var(--studio-ink)",
                    900: "var(--studio-ink)",
                },
            },
        },
    },
    daisyui: { themes: ["emerald"], logs: false },
};
