import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const devHost = env.VITE_DEV_HOST || "192.168.1.23"
  const devPort = Number(env.VITE_DEV_PORT || 5173)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: devHost,
      port: devPort,
      strictPort: true,
      hmr: {
        host: devHost,
        port: devPort,
        clientPort: devPort,
        protocol: "ws",
      },
    },
  }
})
