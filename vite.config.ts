import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import solidSvg from "vite-plugin-solid-svg";

import packageJson from './package.json';

export default defineConfig({
  base: `/${packageJson.name}/`,

  plugins: [
    solid(),
    solidSvg({
      svgo: { enabled: true },
    }),
  ],
})
