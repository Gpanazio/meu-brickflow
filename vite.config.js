import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import process from 'process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente para saber a porta correta
  const env = loadEnv(mode, process.cwd(), '');
  const BACKEND_PORT = env.PORT || 3000;

  console.log(`🔌 Frontend configurado para buscar backend na porta: ${BACKEND_PORT}`);

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: `http://localhost:${BACKEND_PORT}`,
          changeOrigin: true,
          secure: false,
        }
      }
    },
    build: {
      sourcemap: true,
    },
  }
})
