import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import path from 'node:path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_BASE_URL || 'https://crave.apexonestudio.com'

  return {
    plugins: [react()],
    publicDir: '../public',
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        react: path.resolve(import.meta.dirname, './node_modules/react'),
        'react-dom': path.resolve(import.meta.dirname, './node_modules/react-dom'),
      },
    },
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
      chunkSizeWarningLimit: 2048,
    },
  }
})
