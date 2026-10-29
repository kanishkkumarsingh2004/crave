import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com'
  return {
    plugins: [react(), tailwindcss()],
    // The app ships its own public folder: the service worker and the
    // map tiles worker. The web portal's public folder is not used here.
    publicDir: 'public',
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: apiTarget.startsWith('https://'),
          configure(proxy) {
            proxy.on('proxyReq', (proxyRequest) => proxyRequest.setHeader('origin', apiTarget))
          },
        },
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // The app ships the map and the QR renderer in one bundle; the size
      // warning is noise here.
      chunkSizeWarningLimit: 2048,
    },
  }
})
