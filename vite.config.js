import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
var __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.svg', 'icon.svg'],
            manifest: {
                name: 'Still Pomodoro',
                short_name: 'Still',
                description: 'A modern pomodoro workspace with local-first persistence and unmistakable session-finished alerts.',
                theme_color: '#f5efe4',
                background_color: '#f5efe4',
                display: 'standalone',
                start_url: '/',
                icons: [
                    {
                        src: '/icon.svg',
                        sizes: '192x192',
                        type: 'image/svg+xml',
                    },
                    {
                        src: '/icon.svg',
                        sizes: '512x512',
                        type: 'image/svg+xml',
                        purpose: 'any maskable',
                    },
                ],
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
            },
            devOptions: {
                enabled: true,
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
});
