import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';

const validateEnv = (mode: string) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (mode === 'production') {
    if (!env.VITE_API_URL) {
      console.warn("WARNING: VITE_API_URL is missing. The frontend may not connect to the backend correctly in production.");
    }
  }
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  validateEnv(mode);
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@stadiumos/shared': path.resolve(__dirname, '../../shared'),
        '@stadiumos/schemas': path.resolve(__dirname, '../../libs/schemas'),
        '@/': path.resolve(__dirname, './src/'),
      },
    },
    server: {
      port: 3000,
      host: true,
      strictPort: false,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:8000',
          ws: true,
        },
      },
    },
  };
});
