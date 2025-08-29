import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import packageJson from './package.json';

export default defineConfig({
  plugins: [solid()],
  base: `/${packageJson.name}/`,
})
