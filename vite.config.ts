import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import solidSvg from "vite-plugin-solid-svg";
import { VitePWA } from 'vite-plugin-pwa';

import packageJson from './package.json';

export default defineConfig({
  base: `/${packageJson.name}/`,

  plugins: [
    solid(),
    solidSvg({
      svgo: { enabled: true },
    }),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/*'],
      manifest: {
        name: 'UK Police Crime Map',
        short_name: packageJson.name,
        description: packageJson.description,
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: `/${packageJson.name}/`,
        icons: [
          {
            src: 'icons/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),

  ],
})
