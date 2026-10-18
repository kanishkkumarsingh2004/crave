import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com'

  return {
    plugins: [react()],
    publicDir: false,
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
    },
  }
})
