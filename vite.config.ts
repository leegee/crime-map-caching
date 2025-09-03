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
          { src: 'icons/apple-icon-180.png', sizes: '180x180', type: 'image/png' },
          { src: 'icons/manifest-icon-192.maskable.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/manifest-icon-512.maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        "screenshots": [
          {
            "src": "screenshots/screenshot_desktop.png",
            "sizes": "1792x978",
            "type": "image/png",
            "form_factor": "wide"
          },
          {
            "src": "screenshots/mobile_map.png",
            "sizes": "354x640",
            "type": "image/png"
          },
          {
            "src": "screenshots/mobile_menu.png",
            "sizes": "357x640",
            "type": "image/png"
          }
        ]
      },
    }),

  ],
})
