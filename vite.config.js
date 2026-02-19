import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // Dev-time CORS proxy: requests to /fhir-proxy/* are forwarded to the target FHIR server.
    // Usage: set your server URL to http://localhost:5173/fhir-proxy/baseR4 (for HAPI)
    //        or /fhir-proxy for Azure FHIR endpoints, etc.
    // This bypasses CORS since the browser sees a same-origin request.
    proxy: {
      '/fhir-proxy': {
        target: 'https://hapi.fhir.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fhir-proxy/, ''),
        secure: true,
      },
    },
  },
})
