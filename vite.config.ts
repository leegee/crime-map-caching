import { defineConfig, type PreviewServer, type ViteDevServer } from 'vite'
import solid from 'vite-plugin-solid'
import solidSvg from "vite-plugin-solid-svg";
import { VitePWA } from 'vite-plugin-pwa';
import qr from "qrcode-terminal";

import packageJson from './package.json';

function qrCodePlugin() {
  return {
    name: "vite-plugin-qrcode",
    configureServer(server: ViteDevServer) {
      server.httpServer?.once("listening", () => {
        const info = server.resolvedUrls;
        if (!info) return;

        const url = info.network[0];
        if (!url) return;

        console.log("\nScan this QR code to open the dev server:\n");
        qr.generate(url, { small: true });
        console.log(`\n${url}\n`);
      });
    },
    configurePreviewServer(server: PreviewServer) {
      server.httpServer?.once("listening", () => {
        const info = server.resolvedUrls;
        if (!info) return;

        const url = info.network[0] || info.local[0];
        if (!url) return;

        console.log("\nScan this QR code to open the preview server:\n");
        qr.generate(url, { small: true });
        console.log(`\n${url}\n`);
      });
    },
  };
}

export default defineConfig({
  base: `/${packageJson.name}/`,

  server: {
    host: true,
  },
  preview: {
    host: true,
  },

  plugins: [
    solid(),
    qrCodePlugin(),
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

