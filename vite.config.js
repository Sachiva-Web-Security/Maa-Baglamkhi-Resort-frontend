import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const backendOrigin = env.VITE_BACKEND_ORIGIN || "http://localhost:5002"
  const devHost = env.VITE_DEV_HOST || "localhost"
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
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on("error", (err) => {
              console.error("[vite proxy] backend connection failed:", err.message);
            });
          },
        },
        "/uploads": {
          target: backendOrigin,
          changeOrigin: true,
        },
        "/socket.io": {
          target: backendOrigin,
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
