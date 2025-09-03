import { defineConfig, type ViteDevServer, type PreviewServer } from 'vite';
import solid from 'vite-plugin-solid';
import solidSvg from 'vite-plugin-solid-svg';
import { VitePWA } from 'vite-plugin-pwa';
import qr from 'qrcode-terminal';
import os from 'os';

import packageJson from './package.json';

function getLANAddress(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]!) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

function qrCodePlugin() {
  const printQR = (url: string, label: string) => {
    console.log(`\nScan this QR code to open the ${label} server:\n`);
    qr.generate(url, { small: true });
    console.log(`\n${url}\n`);
  };

  const handleServer = (server: ViteDevServer | PreviewServer, label: string) => {
    const httpServer = server.httpServer;
    if (!httpServer) return;

    const print = () => {
      const addr = httpServer.address();
      if (!addr || typeof addr === 'string') return;

      const host = getLANAddress();
      const port = addr.port;
      const base = (server.config?.base || '/').replace(/\/$/, '');
      const url = `http://${host}:${port}${base}/`;

      printQR(url, label);
    };

    if (httpServer.listening) {
      print();
    } else {
      httpServer.once('listening', print);
    }
  };

  return {
    name: 'vite-plugin-qrcode',
    configureServer(server: ViteDevServer) {
      handleServer(server, 'dev');
    },
    configurePreviewServer(server: PreviewServer) {
      handleServer(server, 'preview');
    },
  };
}

export default defineConfig({
  base: `/${packageJson.name}/`,

  define: {
    __INC_LABELS__: true, // Include map labels
  },

  server: { host: true },
  preview: { host: true },

  plugins: [
    solid(),
    solidSvg({ svgo: { enabled: true } }),
    qrCodePlugin(),

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
        screenshots: [
          { src: 'screenshots/screenshot_desktop.png', sizes: '1792x978', type: 'image/png', form_factor: 'wide' },
          { src: 'screenshots/mobile_map.png', sizes: '354x640', type: 'image/png' },
          { src: 'screenshots/mobile_menu.png', sizes: '357x640', type: 'image/png' },
        ],
      },
    }),
  ],
});
