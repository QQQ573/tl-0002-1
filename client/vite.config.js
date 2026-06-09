import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '0.0.0.0',
    port: 5193,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8095',
        ws: true,
        changeOrigin: true
      }
    }
  }
})
