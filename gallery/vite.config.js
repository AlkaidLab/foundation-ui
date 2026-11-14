import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const here = dirname(fileURLToPath(import.meta.url))
export default defineConfig({
  root: here,
  server: { host: '127.0.0.1', port: 18081, strictPort: true, fs: { allow: [resolve(here, '..')] } },
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('md-') } } })],
})
